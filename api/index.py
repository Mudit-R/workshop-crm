"""
Vercel Serverless Function entrypoint for Vortex CNC & 3D Studio CRM.
Exposes the FastAPI application instance for Vercel's Python runtime.
"""
import os
import sys

# Ensure root directory is on Python path so app and database can be imported
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app import app

# Vercel's Python runtime detects the 'app' ASGI instance
