"""
========================================================================================
  AEGISFALL AI - FULL STACK SAAS LAUNCHER
  Launches both:
    1. FastAPI Kinematic Streaming Backend (port 8000)
    2. React TypeScript Vite Frontend (port 5173)
  and opens http://localhost:5173 in your default browser.
========================================================================================
"""

import os
import sys
import time
import subprocess
import webbrowser

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

PYTHON_EXE = os.path.join(ROOT_DIR, "venv", "Scripts", "python.exe")
if not os.path.exists(PYTHON_EXE):
    PYTHON_EXE = sys.executable


def kill_existing_port(port: int):
    """Kills any orphaned process occupying port on Windows."""
    try:
        if sys.platform.startswith("win"):
            cmd = f'powershell -Command "Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | ForEach-Object {{ Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }}"'
            subprocess.run(cmd, shell=True, capture_output=True)
    except Exception:
        pass


def main():
    print("=" * 75)
    print("  🛡️  AEGISFALL AI — ENTERPRISE FALL DETECTION SAAS")
    print("  Starting Full Stack Architecture...")
    print("=" * 75)

    # Free up port 8000 if occupied by a stale session
    kill_existing_port(8000)
    time.sleep(1)

    # 1. Start FastAPI Backend
    print("🚀 [1/2] Starting FastAPI Backend on http://localhost:8000 ...")
    backend_cmd = [
        PYTHON_EXE, "-m", "uvicorn", "api_server:app",
        "--host", "0.0.0.0",
        "--port", "8000"
    ]
    backend_proc = subprocess.Popen(backend_cmd, cwd=ROOT_DIR)

    # 2. Wait for FastAPI backend to be fully initialized and ready
    print("⏳ Waiting for FastAPI Backend & YOLOv8 Pose model to initialize...")
    import urllib.request
    backend_ready = False
    for attempt in range(40):
        try:
            with urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=1) as response:
                if response.status == 200:
                    backend_ready = True
                    break
        except Exception:
            time.sleep(0.5)

    if backend_ready:
        print("✅ FastAPI Backend is ready and listening on port 8000!")
    else:
        print("⚠️ FastAPI Backend is taking longer than expected to start; launching UI anyway...")

    # 3. Start Vite Frontend
    print("✨ [2/2] Starting React Vite SaaS UI on http://localhost:5173 ...")
    frontend_proc = subprocess.Popen(
        "npm run dev",
        shell=True,
        cwd=FRONTEND_DIR
    )

    # Wait for Vite dev server to bind then open browser
    time.sleep(2)
    target_url = "http://localhost:5173"
    print(f"\n🌐 Opening AegisFall SaaS Console at: {target_url}\n")
    try:
        webbrowser.open(target_url)
    except Exception:
        pass

    print("=" * 75)
    print("  ✅ Full Stack System is Running!")
    print("  - Live Camera & Detection Stream: http://localhost:8000/api/stream")
    print("  - Backend API & Docs:             http://localhost:8000/docs")
    print("  - React SaaS Dashboard:           http://localhost:5173")
    print("  Press Ctrl+C to terminate both servers.")
    print("=" * 75)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[Shutdown] Stopping servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        sys.exit(0)


if __name__ == "__main__":
    main()
