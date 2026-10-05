# CNC Workshop CRM

A lightweight workshop management system and job tracker designed for precision CNC machining facilities and 3D prototyping services.

![CNC Workshop CRM](static/images/cnc_hero.jpg)

## Overview

Small-to-medium machine shops often balance production using a combination of whiteboards, spreadsheets, and manual text messaging. **CNC Workshop CRM** provides a consolidated dashboard for job traveler tracking, machine fleet telemetry, instant quoting calculations, and automated client notifications via WhatsApp.

The application runs as a local FastAPI backend backed by SQLite, paired with a vanilla JavaScript and Three.js frontend. It can also operate in a standalone offline mode directly from `static/index.html`.

---

## Features

### Work Order Pipeline & Job Travelers
- **Multi-stage workflow:** Tracks jobs across `DFM Review`, `G-Code Ready`, `Machining / Print`, `QC Inspection`, `Dispatched`, and `Delivered`.
- **Kanban and matrix views:** Filter jobs by manufacturing process (3-Axis, 5-Axis, Additive), priority, or current floor status.
- **Printable job routers:** Generates AS9100/ISO 9001-styled traveler sheets with QR codes, operation sequences, machine assignments, and metrology sign-off tables.

### 3D CAD Part Viewer & Inspection
- **Interactive WebGL viewport:** Built with Three.js for inspection of `.stl` and `.obj` CAD files.
- **Automated part metrics:** Computes real-time bounding box measurements ($X \times Y \times Z$ in mm), calculated part volume ($cm^3$), and material weight based on stock density.
- **Realistic material rendering:** Visual presets for Aerospace Aluminum (6061-T6), Titanium (Ti-6Al-4V), Stainless Steel (316L), Brass (C360), and SLS Nylon (PA12).

### Costing & Quoting Engine
- **Parametric DFM calculation:** Estimates job cost based on bounding box stock envelope, hourly machine rates ($85–$180/hr), fixturing setups, tolerance tiers (down to ±0.008 mm), and surface finishing treatments.
- **One-click conversion:** Instantly promotes approved quotes into active production work orders.

### Machine Fleet Telemetry
- **Floor overview:** Status tracking for 5-axis machining centers, CNC lathes, wire EDM, and industrial 3D printers.
- **Live telemetry cards:** Displays spindle load, current RPM, active tool position, and runtime hours with manual status overrides (`Running`, `Setup`, `Idle`, `Maintenance`).

### WhatsApp Notification Integration
- **Direct message templates:** Generates pre-formatted `wa.me` links to send instant status updates directly to clients (`Order Confirmed`, `In Machining`, `QC Passed`, `Dispatched`).
- **Inbound webhook handler:** Compatible with Meta WhatsApp Cloud API webhooks (`/api/whatsapp/webhook`). Includes keyword responder logic for client queries:
  - `STATUS [WO-#]` &rarr; Returns current stage, machine progress, and estimated completion.
  - `QUOTE` &rarr; Instructions for requesting DFM estimates.
  - `INVOICE` &rarr; Balance due summary and payment link.
  - `OPERATOR` &rarr; Flags the shop supervisor for direct follow-up.

### Inventory & Client Management
- **Raw materials & tooling:** Tracks stock levels of bar stock, billet blocks, additive powders, and carbide end mills with low-stock alerts.
- **Client directory:** Order history, billing terms, lifetime value, and outstanding balance tracking.

---

## Tech Stack

- **Backend:** Python 3.10+, FastAPI, Uvicorn, SQLite3
- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3 (industrial dark theme)
- **3D Graphics:** Three.js (r128), OrbitControls, STLLoader
- **Icons & Typography:** Lucide Icons, Outfit, Inter, JetBrains Mono

---

## Project Structure

```text
.
├── app.py                 # FastAPI backend & REST routing
├── database.py            # SQLite database schema & seed fixtures
├── run.py                 # Server startup & automatic browser launch
├── start_crm.bat          # Windows one-click launcher
├── requirements.txt       # Python package dependencies
├── .env.example           # Environment configuration template
├── static/
│   ├── index.html         # Single-page dashboard interface
│   ├── css/
│   │   └── style.css      # Dark industrial UI stylesheet
│   ├── js/
│   │   ├── app.js         # Core application state & routing
│   │   ├── cad-viewer.js  # Three.js 3D viewport & dimension calculations
│   │   ├── machine-fleet.js # Machine monitoring & telemetry cards
│   │   ├── quoting.js     # DFM quoting calculator
│   │   ├── whatsapp.js    # WhatsApp chat manager & auto-responder
│   │   └── data.js        # Default seed catalog & materials data
│   └── images/
│       └── cnc_hero.jpg   # Preview asset
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.10 or higher
- Modern web browser (Chrome, Edge, Firefox, Safari)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Mudit-R/workshop-crm.git
   cd workshop-crm
   ```

2. **Set up a virtual environment:**
   ```bash
   # Windows
   python -m venv .venv
   .venv\Scripts\activate

   # macOS / Linux
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

### Running the Application

**Option 1: Using the launcher script (Windows)**
```cmd
start_crm.bat
```

**Option 2: Using Python**
```bash
python run.py
```
The server will start at `http://localhost:8000` and automatically open your default browser. The SQLite database (`cnc_crm.db`) is initialized automatically on first startup.

**Option 3: Offline / Browser-only mode**
Open `static/index.html` directly in any web browser. The application includes full client-side demo data fallback if running without the FastAPI backend.

---

## REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/orders` | List all work orders (supports `?status=` and `?search=` filters) |
| `POST` | `/api/orders` | Create a new work order |
| `PATCH` | `/api/orders/{id}/status` | Update order stage or progress percentage |
| `GET` | `/api/machines` | Retrieve all machine telemetry records |
| `PATCH` | `/api/machines/{id}/status` | Update a machine's operating status |
| `GET` | `/api/clients` | List client records and account balances |
| `GET` | `/api/whatsapp/messages/{phone}` | Retrieve message history for a phone number |
| `POST` | `/api/whatsapp/messages` | Send or log a WhatsApp message |
| `GET` | `/api/whatsapp/webhook` | Meta Cloud API webhook verification challenge |
| `POST` | `/api/whatsapp/webhook` | Meta Cloud API incoming message event receiver |
| `GET` | `/api/health` | Service health status check |

---

## Environment Configuration

Copy `.env.example` to `.env` to configure server parameters or live WhatsApp Business API credentials:

```bash
cp .env.example .env
```

| Variable | Default | Purpose |
|---|---|---|
| `HOST` | `127.0.0.1` | Server bind address |
| `PORT` | `8000` | Server listening port |
| `WHATSAPP_VERIFY_TOKEN` | `vortex_cnc_secure_2026` | Webhook verification token for Meta Graph API |
| `WHATSAPP_ACCESS_TOKEN` | — | Meta Cloud API system user access token |

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
