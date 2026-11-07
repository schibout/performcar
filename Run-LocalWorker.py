"""Start the existing ARQ worker on Windows without Unix signal handlers."""

import logging
import os
import sys
from pathlib import Path

backend = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(backend))
os.chdir(backend)

from arq.worker import run_worker
from app.worker.settings import WorkerSettings

logging.basicConfig(level=logging.INFO)
run_worker(WorkerSettings, handle_signals=False)
