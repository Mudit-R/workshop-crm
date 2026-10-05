"""
Vortex CNC & 3D Studio CRM - Server Launcher
Starts the Uvicorn FastAPI server on http://localhost:8000 and launches the browser.
"""

import uvicorn
import webbrowser
import threading
import time
import sys

def open_browser():
    time.sleep(1.2)
    url = "http://localhost:8000"
    print("\n-------------------------------------------------------")
    print(f"  Vortex Workshop CRM")
    print(f"  Local dashboard:    {url}")
    print(f"  WhatsApp webhook:   {url}/api/whatsapp/webhook")
    print("-------------------------------------------------------\n")
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"Could not automatically open browser: {e}")

if __name__ == "__main__":
    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False, log_level="info")
