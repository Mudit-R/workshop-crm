# Vortex ERP — Precision CNC & 3D Prototyping Workshop Management System

An authentic enterprise workshop management system and operations automation platform modeled directly on the **Odoo CRM & Manufacturing (MRP)** standard, engineered specifically for precision CNC machine shops, rapid prototyping labs, and 3D printing facilities.

![Vortex CNC Workshop Management](static/images/cnc_hero.jpg)

---

## 🎯 Overview

Precision machine shops, job work contractors, and rapid prototyping labs often struggle with fragmented floor communications: supervisors dictate status over WhatsApp voice notes, operators work with paper travelers, quoting relies on disconnected spreadsheets, and accounts are maintained in Tally Prime.

**Vortex ERP** unifies these operations into an authentic enterprise workflow:
1. **Odoo-Inspired Manufacturing Pipeline**: Full 6-stage Kanban board and order form view with status bar chevrons (`DFM Review` &rarr; `G-Code Ready` &rarr; `Machining` &rarr; `QC Inspection` &rarr; `Dispatched` &rarr; `Delivered`) and integrated record chatter.
2. **Deep WhatsApp Operations Layer**: WhatsApp connectivity across 7 critical touchpoints: Work Orders, Order Chatter, Machine Breakdown Alerts, DFM Quoting, Floor Voice Notes, Customer Directory, and 8:30 AM Owner Daily Digest.
3. **Shop Floor Voice Notes & Worker Dictation**: Zero-friction operator updates capturing Hinglish, Hindi, and English voice notes from WhatsApp or the microphone, automatically updating job progress counters and logging machine maintenance alarms.
4. **AS9100 / ISO 9001 Job Routers & Travelers**: Aerospace-grade printable routing sheets with QR codes, tool lists, and CMM metrology sign-off grids.
5. **Configurable Automated Actions**: Event-driven rules that trigger notifications, halt CAM queues on machine faults, and dispatch shipping notices.
6. **8:30 AM Owner Daily Operations Digest**: Proactive morning operational summary delivered to the factory owner's WhatsApp covering spindle uptime, bottleneck jobs, and pending collections.
7. **Tally Prime & Indian GST 18% Job Work Bridge**: 1-click XML export adhering to Indian HSN 9988 Job Work standards (9% CGST + 9% SGST).

---

## ✨ Key Modules & Capabilities

### 📋 Manufacturing Orders & Odoo Kanban Pipeline
- **Odoo Enterprise Visual Architecture**: Clean aubergine header (`#714B67`), high-contrast enterprise canvas (`#F4F6F9`), utilitarian smart buttons, and status bar chevrons.
- **6-Stage Production Pipeline**: Real-time tracking through `DFM Review` &rarr; `G-Code Ready` &rarr; `Machining` &rarr; `QC Inspection` &rarr; `Dispatched` &rarr; `Delivered`.
- **Order Form View & Integrated Chatter**: View comprehensive part specifications, stock availability, machine assignments, and complete communication history with WhatsApp delivery checks (`✓✓`).
- **Printable Job Travelers**: Printable shop floor routing travelers with barcode verification, tolerances, and inspection sign-offs.

### 💬 Deep WhatsApp Operations Integration
Connects WhatsApp directly into the factory workflow:
1. **Work Orders**: 1-click stage notification dispatch to clients (Machining Started, QC Inspection Pass, Dispatched).
2. **Order Chatter**: Integrated WhatsApp message timeline attached directly to the manufacturing order traveler.
3. **Machine Breakdown Alerts**: Instant emergency downtime and fault notifications sent to maintenance technicians.
4. **DFM Quoting**: Instant quotation delivery with 1-click client approval links.
5. **Floor Voice Notes**: Operators dictate voice updates; the system records progress and machine alarms.
6. **Customer Accounts**: 1-to-1 client chat channels and outstanding balance follow-ups.
7. **8:30 AM Owner Daily Digest**: Automated morning executive summary sent to the owner's WhatsApp.

### 🎙️ Shop Floor Voice Dictation & Audio Sync
- **Zero Operator ERP Training**: Operators speak in everyday shop language (*"CNC-02 ka spindle breakdown hai, tool tut gaya"* or *"Haas VF4 pe 4092 ka pressure testing pass ho gaya"*).
- **Structured Activity Records**: Automatically parses spoken job numbers, work center names, completed piece quantities, and maintenance alarms into structured audit records.
- **Speech-to-Text Transcriber**: Live browser microphone recording or WhatsApp audio intake.

### ⚙️ Work Centers & Machine Telemetry
- Real-time monitoring of Haas, Mazak, and DMG Mori CNC milling centers, mill-turn lathes, and industrial EOS 3D printers.
- Spindle RPM, spindle load %, feed rate, thermal drift, and operational status overrides (`Running`, `Idle`, `Setup`, `Maintenance`, `Down`).
- 1-click **Alert** button on every machine card to notify maintenance teams immediately.

### ⚡ Automated Actions (Event Recipes)
- Configurable event-driven rules:
  - *WHEN* CAM G-Code is marked verified &rarr; *THEN* notify customer via WhatsApp that raw stock has been loaded onto the spindle.
  - *WHEN* QC metrology inspection passes &rarr; *THEN* generate courier tracking links (DHL / Delhivery) and dispatch WhatsApp delivery alert.
  - *WHEN* machine breakdown is reported &rarr; *THEN* halt CAM jobs and trigger immediate WhatsApp alert to lead maintenance technician.
  - *WHEN* order is marked Delivered &rarr; *THEN* automatically generate Tally Prime Sales Voucher.

### 💰 Parametric DFM Costing & Quoting
- Deterministic calculation factoring raw material stock density (Aluminium 6061-T6, SS316L, Titanium Ti-6Al-4V, PEEK, Inconel 718), 3-axis/5-axis cycle times, tolerance grades, and quantity tiers.
- **Dual Currency Switcher**: 1-click toggle between **₹ INR** and **$ USD**.
- Instant WhatsApp quote dispatch with PDF traveler export.

### 🧾 Tally Prime & Indian GST 18% Job Work Bridge
- Pre-configured for Indian HSN Code 9988 Job Work compliance.
- 1-click XML export ready for direct import into **Tally Prime** or **Tally.ERP 9**.

### 🌐 3D WebGL CAD Part Viewer
- Built-in Three.js viewport for orbit, zoom, pan, and part geometry inspection.
- Drag-and-drop `.stl` file analysis calculating bounding box dimensions ($X \times Y \times Z$), volume, and material weight.

---

## 🏗️ Technology Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn, SQLite3, Pydantic
- **Frontend Architecture**: Vanilla Modern JavaScript (ES6+), Semantic HTML5, Odoo Enterprise CSS System
- **3D Graphics Engine**: Three.js (r128), OrbitControls, STLLoader
- **Enterprise Design**: Odoo 17/18 Light Enterprise Aesthetic, Lucide Icons, Inter & JetBrains Mono typography
- **External Interfaces**: Meta WhatsApp Cloud API (Webhooks), Tally Prime (XML Envelope), Web Speech API

---

## 📁 Repository Structure

```text
.
├── app.py                      # FastAPI backend, REST API, voice note logger & Tally XML generator
├── database.py                 # SQLite database schema & seed fixtures
├── run.py                      # Python server launcher with browser launch
├── start_crm.bat               # Windows 1-click launcher
├── requirements.txt            # Python package dependencies
├── vercel.json                 # Vercel deployment configuration
├── api/
│   └── index.py                # Vercel Python serverless entrypoint
├── static/                     # Primary Frontend Single Page Application
│   ├── index.html              # Odoo-style enterprise layout & view routers
│   ├── css/
│   │   └── style.css           # Authentic Odoo Enterprise light theme & Chatter styles
│   ├── js/
│   │   ├── app.js              # State coordinator, modal controller, audio cues
│   │   ├── data.js             # Seed database (clients, materials, work orders, machines)
│   │   ├── cad-viewer.js       # Three.js 3D WebGL model inspector & STL parser
│   │   ├── whatsapp.js         # WhatsApp communication manager & quick dialogs
│   │   ├── workflow-engine.js  # Automated actions & event trigger bus
│   │   ├── voice-notes.js      # Shop floor voice dictation & audio sync
│   │   ├── indic-ai-parser.js  # Backward compatibility module
│   │   ├── owner-briefing.js   # 8:30 AM WhatsApp executive briefing & Tally XML exporter
│   │   ├── quoting.js          # Parametric DFM quoting calculator
│   │   └── machine-fleet.js    # CNC spindle telemetry & machine fleet grid
│   └── images/
│       └── cnc_hero.jpg        # Workshop hero photography
└── public/                     # Synchronized CDN deployment assets for Vercel
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10 or higher
- Modern web browser (Chrome, Edge, Firefox, Brave)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Mudit-R/workshop-crm.git
   cd workshop-crm
   ```

2. **Set up a virtual environment (recommended):**
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

### Running Locally

**Option 1: Windows 1-Click Launcher**
Double click `start_crm.bat`.

**Option 2: Terminal / Python Launcher**
```bash
python run.py
```
*The server will start at `http://127.0.0.1:8000` and automatically open your default browser. SQLite database (`cnc_crm.db`) is initialized automatically on first run.*

---

## ☁️ Deploying to Vercel

The application is pre-configured for 1-click deployment on **Vercel**:
1. Commit and push your code to your GitHub repository:
   ```bash
   git add .
   git commit -m "feat: Odoo ERP interface with deep WhatsApp workshop integration"
   git push origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import your GitHub repository (`Mudit-R/workshop-crm`).
4. Leave Framework Preset as **Other** (Vercel automatically detects `vercel.json` and `api/index.py`).
5. Click **Deploy**.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/work-orders` | List work orders with optional `?status=` and `?search=` filters |
| `POST` | `/api/work-orders` | Create a new CNC/3D manufacturing job |
| `PUT` | `/api/work-orders/{id}` | Update job details, progress percentage, or stage |
| `DELETE` | `/api/work-orders/{id}` | Delete a work order record |
| `GET` | `/api/clients` | List customer accounts, GST numbers, and lifetime values |
| `POST` | `/api/clients` | Register a new customer company |
| `GET` | `/api/machines` | Retrieve CNC & 3D printer telemetry states |
| `PUT` | `/api/machines/{id}/status` | Update machine operating state (`Running`, `Idle`, `Maintenance`, `Down`) |
| `POST` | `/api/voice-notes/log` | **Floor Voice Dictation API**: Logs breakdown alerts, QC passes, and job counters from spoken notes |
| `GET` | `/api/tally/export/{order_id}` | **Tally Prime Bridge**: Generates HSN 9988 18% GST Job Work XML voucher envelope |
| `GET` | `/api/whatsapp/messages/{phone}` | Fetch chat message history for a phone number |
| `POST` | `/api/whatsapp/messages` | Dispatch a WhatsApp message or automated stage alert |
| `GET` | `/api/whatsapp/webhook` | Meta WhatsApp Cloud API verification challenge |
| `POST` | `/api/whatsapp/webhook` | Meta WhatsApp Cloud API incoming message event receiver |
| `GET` | `/api/health` | Service health status check |

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env` to configure port settings or live WhatsApp Business credentials:

```ini
HOST=127.0.0.1
PORT=8000
WHATSAPP_VERIFY_TOKEN=vortex_cnc_secure_2026
WHATSAPP_ACCESS_TOKEN=your_meta_system_user_token_here
WHATSAPP_PHONE_NUMBER_ID=your_meta_phone_number_id_here
```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
