class SirenPlayer {
  private audioCtx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private intervalId: any = null;
  private isPlaying = false;

  private init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
  }

  public start() {
    if (this.isPlaying) return;
    this.init();
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.isPlaying = true;
    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
    this.gainNode.connect(this.audioCtx.destination);

    this.oscillator = this.audioCtx.createOscillator();
    this.oscillator.type = 'sawtooth';
    this.oscillator.frequency.setValueAtTime(600, this.audioCtx.currentTime);
    this.oscillator.connect(this.gainNode);
    this.oscillator.start();

    // Modulate pitch up and down (European emergency siren pattern)
    let high = true;
    this.intervalId = setInterval(() => {
      if (!this.audioCtx || !this.oscillator) return;
      const targetFreq = high ? 950 : 650;
      this.oscillator.frequency.setTargetAtTime(targetFreq, this.audioCtx.currentTime, 0.15);
      high = !high;
    }, 400);
  }

  public stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.oscillator) {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
      } catch (e) {}
      this.oscillator = null;
    }
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch (e) {}
      this.gainNode = null;
    }
  }

  public active(): boolean {
    return this.isPlaying;
  }
}

export const siren = new SirenPlayer();
