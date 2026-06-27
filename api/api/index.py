# api/index.py — Vercel serverless entry point
# main.py'deki tüm kodu import eder ve FastAPI app'i expose eder

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from main import app

# Vercel bu dosyadaki 'app' objesini otomatik bulur
