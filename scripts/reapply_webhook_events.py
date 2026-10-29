"""Root wrapper forwarding to backend/scripts/reapply_webhook_events.py."""
import os
import sys

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from scripts.reapply_webhook_events import main

if __name__ == "__main__":
    main()

