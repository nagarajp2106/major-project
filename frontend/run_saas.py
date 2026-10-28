import os
import sys

# Forward execution to root run_saas.py if executed from frontend/
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
root_runner = os.path.join(parent_dir, "run_saas.py")
if os.path.exists(root_runner):
    os.chdir(parent_dir)
    with open(root_runner, "r", encoding="utf-8") as f:
        exec(f.read())
else:
    print(f"Error: Could not locate {root_runner}")
