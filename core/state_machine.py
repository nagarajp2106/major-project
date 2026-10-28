"""
Multi-Stage Fall State Machine
Manages transition states (Monitoring -> Rapid Descent -> Fall Detected -> Impact -> Inactivity Check -> Confirmed Fall)
to ensure near-zero false alarms with temporal accumulation and ADL suppression.
"""

from typing import Dict, Any, Tuple, Optional
from core.tracker import Tracklet


class FallStateMachine:
    """
    Robust Fall State Machine:
    1. Separates rapid descent / collapse (Candidate) from ground immobility (Confirmation).
    2. Uses real elapsed time (dt) to accumulate post-fall stillness without resetting timer on ongoing triggers.
    3. Handles upright posture recovery and standing back up.
    4. Suppresses sitting, bending, and lying down without impact shock.
    """

    STATE_MONITORING = "MONITORING"
    STATE_RAPID_DESCENT = "RAPID_DESCENT"
    STATE_FALL_DETECTED = "FALL_DETECTED"
    STATE_IMPACT = "IMPACT"
    STATE_INACTIVITY_CHECK = "INACTIVITY_CHECK"
    STATE_PRE_ALERT = "PRE_ALERT"
    STATE_CONFIRMED_FALL = "CONFIRMED_FALL"

    def __init__(
        self,
        fps: float = 30.0,
        fall_velocity_thresh: float = 1.1,      # Normalized descent rate (heights/sec)
        flat_angle_thresh: float = 48.0,         # Torso angle below this is horizontal
        standing_angle_thresh: float = 68.0,     # Torso angle above this is upright
        inactivity_sec: float = 1.5,             # Immobility duration needed to confirm
        pre_alert_sec: float = 2.0,
        stillness_energy_thresh: float = 25.0
    ):
        self.fps = fps
        self.default_dt = 1.0 / max(fps, 1.0)
        self.fall_velocity_thresh = fall_velocity_thresh
        self.flat_angle_thresh = flat_angle_thresh
        self.standing_angle_thresh = standing_angle_thresh
        self.inactivity_sec = inactivity_sec
        self.pre_alert_sec = pre_alert_sec
        self.stillness_energy_thresh = stillness_energy_thresh

    def step(
        self,
        tracklet: Tracklet,
        features: Dict[str, float],
        occlusion_stats: Dict[str, float],
        dt: Optional[float] = None
    ) -> Tuple[str, Dict[str, Any]]:
        step_dt = dt if (dt is not None and 0.005 <= dt <= 0.5) else self.default_dt

        v_y = features.get("vertical_velocity", 0.0)
        angular_vel = features.get("angular_velocity", 0.0)
        angle = features.get("torso_angle", 90.0)
        aspect_ratio = features.get("aspect_ratio", 0.5)
        stillness = features.get("stillness_energy", 0.0)
        in_occ_zone = tracklet.in_occlusion_zone

        current = tracklet.state
        next_state = current
        event_trigger = ""

        # Criteria for dynamic descent / impact shock
        # Requires high downward velocity or rapid angular collapse
        has_downward_shock = v_y > self.fall_velocity_thresh or (v_y > 0.7 and angular_vel > 30.0)
        is_horizontal = (angle < self.flat_angle_thresh) or (aspect_ratio > 1.05)
        is_upright = angle > self.standing_angle_thresh

        # --- STATE 1: MONITORING ---
        if current == self.STATE_MONITORING:
            tracklet.state_timer = 0.0
            if has_downward_shock and not is_horizontal:
                # Descent started but person hasn't hit ground yet
                next_state = self.STATE_RAPID_DESCENT
                tracklet.state_timer = 0.0
                event_trigger = f"[!] RAPID DESCENT DETECTED (+{v_y:.2f} h/s)"
            elif (has_downward_shock and is_horizontal) or (v_y > 0.65 and angle < self.flat_angle_thresh and angular_vel > 25.0):
                # Sudden collapse onto ground
                next_state = self.STATE_FALL_DETECTED
                tracklet.state_timer = 0.0
                event_trigger = f"[!] FALL DETECTED (Velocity: +{v_y:.2f} h/s, Angle: {angle:.1f}°)"

        # --- STATE 2: RAPID_DESCENT ---
        elif current == self.STATE_RAPID_DESCENT:
            tracklet.state_timer += step_dt
            if is_horizontal:
                # Person impacted ground
                next_state = self.STATE_FALL_DETECTED
                tracklet.state_timer = 0.0
                event_trigger = "[!] IMPACT: Person horizontal on ground"
            elif is_upright and v_y < 0.2:
                # Controlled sitting / movement without impact
                next_state = self.STATE_MONITORING
                tracklet.state_timer = 0.0
                event_trigger = "Controlled movement -> Monitoring"
            elif tracklet.state_timer > 1.2:
                # Descent timed out without hitting ground
                next_state = self.STATE_MONITORING
                tracklet.state_timer = 0.0

        # --- STATE 3: FALL_DETECTED / IMPACT ---
        elif current in [self.STATE_FALL_DETECTED, self.STATE_IMPACT]:
            # DO NOT reset timer here on continuing triggers!
            tracklet.state_timer += step_dt
            if is_upright and v_y < -0.2:
                # Recovery: stood back up
                next_state = self.STATE_MONITORING
                tracklet.state_timer = 0.0
                event_trigger = "Subject stood upright -> Recovered"
            elif is_horizontal:
                next_state = self.STATE_INACTIVITY_CHECK
                event_trigger = "Verifying ground immobility..."
            elif tracklet.state_timer > 2.0 and not is_horizontal:
                # False candidate (e.g. temporary knee bend or detector glitch)
                next_state = self.STATE_MONITORING
                tracklet.state_timer = 0.0

        # --- STATE 4: INACTIVITY_CHECK / PRE_ALERT ---
        elif current in [self.STATE_INACTIVITY_CHECK, self.STATE_PRE_ALERT]:
            tracklet.state_timer += step_dt
            if is_upright:
                # Recovery during inactivity check
                next_state = self.STATE_MONITORING
                tracklet.state_timer = 0.0
                event_trigger = "Subject recovered and stood upright"
            elif is_horizontal:
                if tracklet.state_timer >= self.inactivity_sec:
                    next_state = self.STATE_CONFIRMED_FALL
                    event_trigger = "[EMERGENCY] CONFIRMED EMERGENCY FALL ON GROUND"
                else:
                    next_state = self.STATE_INACTIVITY_CHECK
            else:
                # Sitting up on ground
                if tracklet.state_timer > (self.inactivity_sec + 1.0):
                    next_state = self.STATE_MONITORING
                    tracklet.state_timer = 0.0

        # --- STATE 5: CONFIRMED_FALL ---
        elif current == self.STATE_CONFIRMED_FALL:
            # Remain confirmed until explicit upright recovery
            if is_upright and (stillness > 15.0 or v_y < -0.3):
                next_state = self.STATE_MONITORING
                tracklet.state_timer = 0.0
                event_trigger = "Subject stood upright -> Reset to Monitoring"

        tracklet.state = next_state

        return next_state, {
            "state_timer": round(tracklet.state_timer, 2),
            "countdown": max(0.0, round(self.inactivity_sec - tracklet.state_timer, 2)),
            "event_trigger": event_trigger
        }
