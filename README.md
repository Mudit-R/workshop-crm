# Vortex Studio OS — CNC & 3D Prototyping Workshop CRM

An end-to-end workshop management system and operations automation platform engineered specifically for precision CNC machining facilities, rapid prototyping labs, and 3D printing studios.

![Vortex CNC Studio OS](static/images/cnc_hero.jpg)

---

## 🎯 Overview

Precision manufacturing facilities and machine shops often struggle with operational fragmentation: floor supervisors use WhatsApp voice notes, machinists manage parts on paper travelers, quoting is done in complex Excel workbooks, and accounting lives separately in Tally Prime.

**Vortex Studio OS** acts as an **operational automation layer** that connects the entire lifecycle:
1. **Intelligent Order Intake & DFM Quoting**: Automated costing for CNC milling (3/5-axis), turning, and additive manufacturing (DMLS, SLS, SLA).
2. **Shop Floor Progress & Job Travelers**: AS9100/ISO 9001-compliant production travelers with QR codes and metrology sign-offs.
3. **Indic Voice AI & Hinglish Natural Language Processing**: Zero-friction supervisor input that converts casual Hinglish voice notes into real-time machine and job status updates without manual ERP data entry.
4. **Automated WhatsApp Business Hub**: 2-way bot responder, proactive client stage alerts, and official Meta Cloud API webhook support.
5. **Configurable WHEN-IF-THEN Automation Engine**: Event-driven rules that trigger notifications, halt jobs on machine breakdowns, and dispatch shipping updates.
6. **8:30 AM Owner Executive Briefing**: Daily proactive WhatsApp digest delivered to the workshop owner summarizing jobs on schedule, machines at risk, and pending receivables.
7. **Tally Prime & GST 18% Job Work Bridge**: 1-click XML export adhering to Indian HSN 9988 Job Work standards (9% CGST + 9% SGST).

---

## ✨ Key Features

### 📋 AS9100 Work Order Pipeline & Job Travelers
- **6-Stage Production Pipeline**: Tracks orders across `DFM Review` &rarr; `G-Code Ready` &rarr; `Machining / 3D Print` &rarr; `QC Inspection` &rarr; `Dispatched` &rarr; `Delivered`.
- **Kanban & Matrix Views**: Filter jobs by manufacturing process (3-Axis, 5-Axis Mill-Turn, DMLS, SLS), priority (`Critical`, `High`, `Normal`), or machine assignment.
- **Printable Job Routers**: Generates aerospace-grade job traveler sheets with barcode/QR verification, step-by-step routing, tool list, and CMM metrology sign-off grids.

### 🎙️ Indic Voice AI & Hinglish Shop-Floor Parser
- **Zero-Friction Operator Updates**: Operators speak or type in everyday Indian workshop language (*"Bhai Haas VF-4 me coolant leak ho gaya, machine breakdown hai"* or *"WO-4091 ka 8 piece CMM inspection pass ho gaya"*).
- **Automated NLP State Machine**: Automatically detects machine breakdowns, halts dependent CAM jobs, marks QC status, updates part completion counters, and fires maintenance alerts.
- **Simulated Voice Testing**: Built-in 1-click test chips for breakdown alerts, QC passes, and dispatch notices with live JSON payload previews.

### ⚡ WHEN-IF-THEN Workflow Automation Engine
- **Event-Driven Rules Matrix**: Configurable automation triggers without writing code:
  - *WHEN* CAM G-Code is marked verified &rarr; *THEN* auto-notify customer via WhatsApp that raw stock has been loaded onto the spindle.
  - *WHEN* QC metrology inspection passes &rarr; *THEN* generate courier tracking links (DHL / Delhivery) and dispatch WhatsApp delivery alert.
  - *WHEN* machine breakdown is reported &rarr; *THEN* halt CAM jobs and trigger immediate SMS/WhatsApp alert to lead maintenance technician.
  - *WHEN* order is marked Delivered &rarr; *THEN* automatically generate Tally Prime Sales Voucher.
- **Live Audit Log**: Timestamped execution stream verifying automated triggers and payloads.

### 🌅 8:30 AM Owner WhatsApp Executive Briefing
- **Proactive Daily Operations Digest**: Automatically aggregates shop performance every morning:
  - Jobs on schedule vs. jobs at risk vs. delayed orders.
  - Shop floor spindle utilization % (e.g. 5 of 6 spindles running, 83% uptime).
  - Unplanned downtime and maintenance alarms.
  - Outstanding customer receivables and billing follow-ups.
- **1-Click WhatsApp Launcher**: Instant dispatch via `wa.me` deep links to the owner's WhatsApp app or web client.

### 🧾 Tally Prime & Indian GST 18% Job Work Bridge
- **Designed for Indian SMB Reality**: Connects the shop floor to existing accounting workflows without replacing Tally.
- **HSN Code 9988 Compliance**: Automatically calculates base job work charges with standard 18% GST (split into 9% CGST and 9% SGST).
- **1-Click XML Export**: Generates compliant Tally XML import envelopes for direct import into **Tally Prime** or **Tally.ERP 9**.

### 🌐 3D WebGL CAD Part Viewer & Inspection
- **Interactive Three.js Viewport**: Orbit, zoom, pan, and inspect 3D models with realistic PBR shaders.
- **Pre-Loaded Geometry Presets**: Turbine blisk, hydraulic manifold block, Voronoi drone arm, prosthetic knuckle joint, and helical gear housing.
- **Custom STL Upload**: Drag-and-drop your own `.stl` or `.step` CAD files to immediately calculate bounding box dimensions ($X \times Y \times Z$), volume ($cm^3$), and material weight based on density.

### 💬 WhatsApp Business Hub & Automated CNC Bot
- **2-Way Live Chat Simulator**: Test customer interactions in real-time with an interactive WhatsApp mock console.
- **Intelligent Keyword Bot**:
  - `STATUS [WO-#]` &rarr; Returns real-time stage, progress bar (`████░░░░░░`), machine name, and due date.
  - `QUOTE` &rarr; Instructions for submitting STEP files and dimensions for pricing.
  - `INVOICE` / `PAY` &rarr; Summarizes outstanding balance and returns direct UPI/payment gateway link.
  - `OPERATOR` &rarr; Alerts the shop floor supervisor for human intervention.
- **Meta WhatsApp Cloud API Webhook**: Built-in verification (`GET /api/whatsapp/webhook`) and incoming message event receiver (`POST /api/whatsapp/webhook`).

### ⚙️ Machine Fleet Telemetry
- Real-time monitoring of CNC milling centers, mill-turn lathes, and industrial 3D printers.
- Spindle RPM, feed rate, thermal drift, tool wear %, and status overrides (`Running`, `Idle`, `Setup`, `Maintenance`, `Down`).

### 💰 Instant DFM Quoting Engine & Dual Currency
- Parametric quoting factoring material density, 3-axis/5-axis cycle times, tolerance grades down to $\pm0.008$ mm, surface finishes, and volume discount curves.
- **Dual Currency Switcher**: 1-click toggle between **₹ INR (Lakhs/Crores)** and **$ USD**.

---

## 🏗️ Tech Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn, SQLite3, Pydantic
- **Frontend**: Vanilla Modern JavaScript (ES6+), HTML5, Responsive CSS3 (Glassmorphism & AS9100 Dark Industrial Theme)
- **3D Graphics Engine**: Three.js (r128), OrbitControls, STLLoader
- **Icons & Typography**: Lucide Icons, Outfit, Inter, JetBrains Mono
- **Integrations**: Meta WhatsApp Cloud API (Webhooks), Tally Prime (XML Envelope), Indic NLP Parser

---

## 📁 Repository Structure

```text
.
├── app.py                      # FastAPI backend, REST API, Indic NLP parser & Tally XML generator
├── database.py                 # SQLite database schema & seed fixtures
├── run.py                      # Python server launcher with auto browser launch
├── start_crm.bat               # Windows 1-click double-click launcher
├── requirements.txt            # Python package dependencies
├── .env.example                # Environment configuration template
│
└── static/                     # Frontend Single Page Application (SPA)
    ├── index.html              # Core application interface & view routers
    ├── css/
    │   └── style.css           # Industrial AS9100 dark theme, glassmorphism, responsive styles
    ├── js/
    │   ├── app.js              # State coordinator, modal controller, audio cues
    │   ├── data.js             # Seed database (clients, materials database, machines)
    │   ├── cad-viewer.js       # Three.js 3D WebGL model inspector & STL parser
    │   ├── whatsapp.js         # 2-way WhatsApp chat engine & automated CNC bot
    │   ├── workflow-engine.js  # WHEN-IF-THEN automation rules engine & event bus
    │   ├── indic-ai-parser.js  # Hinglish & Gujarati voice/text NLP parser
    │   ├── owner-briefing.js   # 8:30 AM WhatsApp executive briefing & Tally XML exporter
    │   ├── quoting.js          # Parametric DFM quoting calculator
    │   └── machine-fleet.js    # CNC spindle telemetry & printer monitoring
    └── images/
        └── cnc_hero.jpg        # Workshop hero asset
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

### Running the System

**Option 1: Windows 1-Click Launcher**
Double click `start_crm.bat`.

**Option 2: Terminal / Python Launcher**
```bash
python run.py
```
*The server will start at `http://127.0.0.1:8000` and automatically open your default browser. SQLite database (`cnc_crm.db`) is seeded automatically on initial run.*

**Option 3: Offline / Browser-Only Mode**
Open `static/index.html` directly in any web browser. The app includes comprehensive mock-data fallback logic.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/work-orders` | List work orders with optional `?status=` and `?search=` filters |
| `POST` | `/api/work-orders` | Create a new CNC/3D manufacturing job |
| `PUT` | `/api/work-orders/{id}` | Update job details, progress percentage, or stage |
| `DELETE` | `/api/work-orders/{id}` | Delete a work order record |
| `GET` | `/api/clients` | List client accounts, GST numbers, and lifetime values |
| `POST` | `/api/clients` | Register a new client company |
| `GET` | `/api/machines` | Retrieve all CNC & 3D printer telemetry states |
| `PUT` | `/api/machines/{id}/status` | Update machine operating state (`Running`, `Idle`, `Maintenance`, `Down`) |
| `POST` | `/api/indic-ai/parse` | **Indic AI NLP Parser**: Extracts breakdown alerts, QC passes, and job IDs from Hinglish/Gujarati text |
| `GET` | `/api/tally/export/{order_id}` | **Tally Prime Bridge**: Generates HSN 9988 18% GST Job Work XML voucher envelope |
| `GET` | `/api/whatsapp/messages/{phone}` | Fetch chat message history for a phone number |
| `POST` | `/api/whatsapp/messages` | Dispatch a WhatsApp message and trigger automated CNC bot replies |
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

## 🇮🇳 Why This Architecture Fits Indian SMB Manufacturing

1. **Zero Operator Training Required**: Machine operators and supervisors do not fill out multi-tab web forms. They send voice notes or Hinglish WhatsApp messages; the system parses the intent and updates the shop floor state machine automatically.
2. **Coexists with Tally Prime**: Indian machine shop owners will not abandon Tally. By generating standard HSN 9988 18% Job Work XML vouchers, the shop floor seamlessly syncs with the company accountant.
3. **Daily Executive Engagement**: Workshop owners are constantly on the move. The **8:30 AM WhatsApp Briefing** keeps them updated on active spindles, critical bottlenecks, and overdue receivables directly on WhatsApp.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
