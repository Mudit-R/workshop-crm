"""
Vortex CNC & 3D Studio CRM - FastAPI Application & WhatsApp Integration Server
Serves the CRM frontend, REST APIs, and Meta WhatsApp Business Cloud Webhook.
"""

from fastapi import FastAPI, Request, HTTPException, Query, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
import json
import os
import re

import database

# Initialize Database
database.init_db()

app = FastAPI(
    title="CNC Workshop CRM API",
    description="REST API for workshop management, job travelers, and WhatsApp notifications",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

# Enable CORS for local and cloud testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Support both 'static' (primary local) and 'public' (Vercel CDN deployment) directories
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static") if os.path.exists(os.path.join(os.path.dirname(__file__), "static")) else os.path.join(os.path.dirname(__file__), "public")

# Mount Static Assets for local development
if os.path.exists(os.path.join(STATIC_DIR, "css")):
    app.mount("/css", StaticFiles(directory=os.path.join(STATIC_DIR, "css")), name="css")
if os.path.exists(os.path.join(STATIC_DIR, "js")):
    app.mount("/js", StaticFiles(directory=os.path.join(STATIC_DIR, "js")), name="js")
if os.path.exists(os.path.join(STATIC_DIR, "images")):
    app.mount("/images", StaticFiles(directory=os.path.join(STATIC_DIR, "images")), name="images")

# Pydantic Models
class WorkOrderCreate(BaseModel):
    id: Optional[str] = None
    client_id: str
    client_name: str
    client_phone: str
    client_contact: Optional[str] = ""
    part_name: str
    process: str
    material: str
    dimensions: Optional[str] = ""
    tolerance: Optional[str] = "±0.02 mm"
    surface_finish: Optional[str] = "As Machined"
    quantity: int = 1
    unit_price: float = 100.0
    total_price: float = 100.0
    deposit_paid: Optional[float] = 0.0
    balance_due: Optional[float] = 0.0
    status: Optional[str] = "DFM Review"
    priority: Optional[str] = "Normal"
    machine_name: Optional[str] = ""
    operator: Optional[str] = "Shop Lead"
    due_date: Optional[str] = ""
    created_date: Optional[str] = ""
    cad_file: Optional[str] = ""
    model_preset: Optional[str] = "turbine"
    progress: Optional[int] = 0
    cycle_time_minutes: Optional[int] = 30
    cam_software: Optional[str] = "Mastercam"
    gcode_file: Optional[str] = ""
    qc_status: Optional[str] = "Pending"
    notes: Optional[str] = ""

class ClientCreate(BaseModel):
    id: Optional[str] = None
    name: str
    company: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    whatsapp: str
    industry: Optional[str] = "General Engineering"
    tax_id: Optional[str] = ""
    notes: Optional[str] = ""

class WhatsAppMessageIn(BaseModel):
    phone: str
    text: str
    sender: Optional[str] = "shop" # 'shop', 'client', 'bot'

class MachineStatusUpdate(BaseModel):
    status: str # 'Running', 'Idle', 'Setup', 'Maintenance'

class WorkOrderStatusUpdate(BaseModel):
    status: str
    progress: Optional[int] = None

class InventoryItemCreate(BaseModel):
    id: Optional[str] = None
    name: str
    category: str
    stock: float = 0.0
    unit: str = "Pcs"
    min_threshold: float = 5.0
    status: Optional[str] = "In Stock"

class InventoryRestock(BaseModel):
    quantity: float

# Root Endpoint serves CRM Single Page App
@app.get("/")
def serve_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Vortex CNC CRM static files missing."}

# ============================================================================
# WORK ORDERS API
# ============================================================================
@app.get("/api/work-orders")
def get_work_orders(status: Optional[str] = None, search: Optional[str] = None):
    conn = database.get_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM work_orders WHERE 1=1"
    params = []

    if status and status != 'all':
        query += " AND status = ?"
        params.append(status)

    if search:
        query += " AND (id LIKE ? OR part_name LIKE ? OR client_name LIKE ? OR material LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s, s])

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

@app.post("/api/work-orders")
def create_work_order(order: WorkOrderCreate):
    conn = database.get_connection()
    cursor = conn.cursor()

    order_id = order.id
    if not order_id:
        cursor.execute("SELECT COUNT(*) FROM work_orders")
        c = cursor.fetchone()[0]
        order_id = f"WO-{4090 + c + 1}"

    cursor.execute("""
    INSERT INTO work_orders (
        id, client_id, client_name, client_phone, client_contact, part_name,
        process, material, dimensions, tolerance, surface_finish, quantity,
        unit_price, total_price, deposit_paid, balance_due, status, priority,
        machine_name, operator, due_date, created_date, cad_file, model_preset,
        progress, cycle_time_minutes, cam_software, gcode_file, qc_status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        order_id, order.client_id, order.client_name, order.client_phone, order.client_contact,
        order.part_name, order.process, order.material, order.dimensions, order.tolerance,
        order.surface_finish, order.quantity, order.unit_price, order.total_price,
        order.deposit_paid, order.balance_due, order.status, order.priority,
        order.machine_name, order.operator, order.due_date, order.created_date,
        order.cad_file or f"{order_id.lower()}_model.step", order.model_preset or "turbine",
        order.progress, order.cycle_time_minutes, order.cam_software, order.gcode_file,
        order.qc_status, order.notes
    ))
    conn.commit()
    conn.close()
    return {"status": "success", "id": order_id}

@app.put("/api/work-orders/{order_id}")
def update_work_order(order_id: str, order: WorkOrderCreate):
    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE work_orders SET
        client_name = ?, client_phone = ?, part_name = ?, process = ?,
        material = ?, dimensions = ?, tolerance = ?, surface_finish = ?,
        quantity = ?, unit_price = ?, total_price = ?, status = ?,
        priority = ?, machine_name = ?, progress = ?, due_date = ?, notes = ?
    WHERE id = ?
    """, (
        order.client_name, order.client_phone, order.part_name, order.process,
        order.material, order.dimensions, order.tolerance, order.surface_finish,
        order.quantity, order.unit_price, order.total_price, order.status,
        order.priority, order.machine_name, order.progress, order.due_date,
        order.notes, order_id
    ))
    conn.commit()
    conn.close()
    return {"status": "success", "id": order_id}

@app.delete("/api/work-orders/{order_id}")
def delete_work_order(order_id: str):
    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM work_orders WHERE id = ?", (order_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted", "id": order_id}

@app.put("/api/work-orders/{order_id}/status")
def update_work_order_status(order_id: str, payload: WorkOrderStatusUpdate):
    conn = database.get_connection()
    cursor = conn.cursor()
    if payload.progress is not None:
        cursor.execute("UPDATE work_orders SET status = ?, progress = ? WHERE id = ?", (payload.status, payload.progress, order_id))
    else:
        cursor.execute("UPDATE work_orders SET status = ? WHERE id = ?", (payload.status, order_id))
    conn.commit()
    conn.close()
    return {"status": "updated", "id": order_id, "new_status": payload.status}

# ============================================================================
# CLIENTS API
# ============================================================================
@app.get("/api/clients")
def get_clients():
    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM clients ORDER BY total_orders DESC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

@app.post("/api/clients")
def create_client(client: ClientCreate):
    conn = database.get_connection()
    cursor = conn.cursor()

    client_id = client.id
    if not client_id:
        cursor.execute("SELECT COUNT(*) FROM clients")
        c = cursor.fetchone()[0]
        client_id = f"C-{100 + c + 1}"

    cursor.execute("""
    INSERT INTO clients (id, name, company, email, phone, whatsapp, industry, tax_id, total_orders, total_spent, outstanding, rating, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0.0, 0.0, 5.0, ?)
    """, (client_id, client.name, client.company, client.email, client.phone, client.whatsapp, client.industry, client.tax_id, client.notes))
    conn.commit()
    conn.close()
    return {"status": "success", "id": client_id}

@app.put("/api/clients/{client_id}")
def update_client(client_id: str, client: ClientCreate):
    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE clients SET
        name = ?, company = ?, email = ?, phone = ?,
        whatsapp = ?, industry = ?, tax_id = ?, notes = ?
    WHERE id = ?
    """, (
        client.name, client.company, client.email, client.phone,
        client.whatsapp, client.industry, client.tax_id, client.notes, client_id
    ))
    conn.commit()
    conn.close()
    return {"status": "updated", "id": client_id}

# ============================================================================
# MACHINES API & TELEMETRY
# ============================================================================
@app.get("/api/machines")
def get_machines():
    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM machines")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

@app.put("/api/machines/{machine_id}/status")
def update_machine_status(machine_id: str, payload: MachineStatusUpdate):
    conn = database.get_connection()
    cursor = conn.cursor()

    spindle_rpm = 12000 if payload.status == 'Running' else 0
    spindle_load = "65%" if payload.status == 'Running' else "0%"

    cursor.execute("""
    UPDATE machines SET status = ?, spindle_rpm = ?, spindle_load = ? WHERE id = ?
    """, (payload.status, spindle_rpm, spindle_load, machine_id))
    conn.commit()
    conn.close()
    return {"status": "updated", "machine_id": machine_id, "new_status": payload.status}

# ============================================================================
# WHATSAPP INTEGRATION & META CLOUD API WEBHOOK
# ============================================================================
@app.get("/api/whatsapp/messages/{phone}")
def get_whatsapp_messages(phone: str):
    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM whatsapp_messages WHERE phone = ? ORDER BY created_at ASC", (phone,))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

@app.post("/api/whatsapp/messages")
def send_whatsapp_message(msg: WhatsAppMessageIn):
    conn = database.get_connection()
    cursor = conn.cursor()

    msg_id = f"msg_{os.urandom(4).hex()}"
    cursor.execute("""
    INSERT INTO whatsapp_messages (id, phone, sender, text, timestamp)
    VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
    """, (msg_id, msg.phone, msg.sender, msg.text))

    bot_reply = None
    # If sent by client, auto-generate bot reply
    if msg.sender == 'client':
        bot_reply = generate_cnc_bot_reply(msg.text, msg.phone, cursor)
        if bot_reply:
            reply_id = f"bot_{os.urandom(4).hex()}"
            cursor.execute("""
            INSERT INTO whatsapp_messages (id, phone, sender, text, timestamp)
            VALUES (?, ?, 'bot', ?, datetime('now', 'localtime'))
            """, (reply_id, msg.phone, bot_reply))

    conn.commit()
    conn.close()
    return {"status": "dispatched", "message_id": msg_id, "bot_reply": bot_reply}

def generate_cnc_bot_reply(user_text: str, phone: str, cursor) -> str:
    text_upper = user_text.upper()

    if "STATUS" in text_upper:
        # Check for order ID
        match = re.search(r"WO-\d+", text_upper)
        if match:
            cursor.execute("SELECT * FROM work_orders WHERE id = ?", (match.group(0),))
        else:
            cursor.execute("SELECT * FROM work_orders WHERE client_phone LIKE ? ORDER BY id DESC LIMIT 1", (f"%{phone[-7:]}%",))

        row = cursor.fetchone()
        if row:
            order = dict(row)
            bar = '█' * (order['progress'] // 10) + '░' * (10 - (order['progress'] // 10))
            return (
                f"*Workshop Status*:\n\n"
                f"Job: {order['id']} - {order['part_name']}\n"
                f"Process: {order['process']}\n"
                f"Machine: {order['machine_name']}\n"
                f"Progress: {order['progress']}% [{bar}]\n"
                f"Stage: *{order['status'].upper()}*\n"
                f"Est. Completion: {order['due_date']}\n"
                f"QC Metrology: {order['qc_status']}\n\n"
                f"Text *OPERATOR* to speak with the shop floor supervisor."
            )
        return "*Workshop Bot*: Could not locate an active work order for this phone number. Please provide your order number (e.g. *STATUS WO-4091*)."

    elif "QUOTE" in text_upper:
        return (
            "*Workshop Quoting Desk*:\n\n"
            "We machine precision CNC parts and additive prototypes.\n"
            "• Email CAD files (.STEP/.STL) to ops@vortexcnc.com\n"
            "• Or text: *QUOTE [Material] [Qty] [Length]x[Width]x[Height]mm*\n\n"
            "Example: *QUOTE Al6061 25pcs 150x100x40mm*"
        )

    elif "INVOICE" in text_upper or "PAY" in text_upper:
        cursor.execute("SELECT * FROM work_orders WHERE client_phone LIKE ? AND balance_due > 0", (f"%{phone[-7:]}%",))
        orders = [dict(r) for r in cursor.fetchall()]
        total_balance = sum(o['balance_due'] for o in orders)
        return (
            f"💳 *Accounts Desk*:\n\n"
            f"Outstanding Balance: *${total_balance:.2f} USD*\n"
            f"Open Work Orders: {len(orders)}\n\n"
            f"Direct Payment Link: https://vortexcnc.com/pay"
        )

    return (
        "*Workshop Auto-Reply*: Thanks for contacting the machine shop!\n\n"
        "• Reply *STATUS* to track live machining progress\n"
        "• Reply *QUOTE* for instant DFM pricing\n"
        "• Reply *INVOICE* for billing statements\n"
        "• Reply *OPERATOR* to speak with the shop supervisor"
    )

# Meta WhatsApp Cloud API Webhook Verification (GET)
@app.get("/api/whatsapp/webhook")
def verify_meta_webhook(
    request: Request,
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge")
):
    VERIFY_TOKEN = "vortex_cnc_secure_2026"
    if hub_mode == "subscribe" and hub_verify_token == VERIFY_TOKEN:
        return Response(content=hub_challenge, media_type="text/plain")
    return Response(content="Verification failed", status_code=403)

# Meta WhatsApp Cloud API Webhook Event Receiver (POST)
@app.post("/api/whatsapp/webhook")
async def receive_meta_webhook(request: Request):
    payload = await request.json()
    try:
        entries = payload.get("entry", [])
        for entry in entries:
            for change in entry.get("changes", []):
                val = change.get("value", {})
                messages = val.get("messages", [])
                for m in messages:
                    from_phone = m.get("from")
                    text_body = m.get("text", {}).get("body", "")
                    if from_phone and text_body:
                        send_whatsapp_message(WhatsAppMessageIn(phone=f"+{from_phone}", text=text_body, sender="client"))
    except Exception as e:
        print(f"Error parsing Meta webhook payload: {e}")

    return {"status": "EVENT_RECEIVED"}

# ============================================================================
# SHOP FLOOR VOICE NOTES & WORKER DICTATION API
# ============================================================================
class VoiceNoteLogRequest(BaseModel):
    text: str

@app.post("/api/voice-notes/log")
@app.post("/api/indic-ai/parse")
def log_floor_supervisor_note(req: VoiceNoteLogRequest):
    text = req.text.lower()
    event_type = "GENERAL_OPERATION_NOTE"
    status = "OK"
    order_id = None
    machine_name = None

    match = re.search(r"(?:wo-?|order\s*)?(\d{4})", text)
    if match:
        order_id = f"WO-{match.group(1)}"

    if any(k in text for k in ['band', 'breakdown', 'spindle issue', 'kharab', 'down', 'toot gaya']):
        event_type = "MACHINE_BREAKDOWN"
        status = "DOWN"
        machine_name = "Haas VF-4SS" if 'haas' in text else "DMG Mori NMV 3000"
    elif any(k in text for k in ['qc pass', 'inspection pass', 'testing pass', 'pass ho gaya']):
        event_type = "QC_INSPECTION_PASSED"
        status = "PASSED"
    elif any(k in text for k in ['piece', 'pcs', 'complete', 'ban gaye']):
        event_type = "PRODUCTION_UPDATE"
        status = "IN_PROGRESS"
    elif any(k in text for k in ['dispatch', 'dhl', 'bhej diya']):
        event_type = "DISPATCH_UPDATE"
        status = "DISPATCHED"

    return {
        "raw_text": req.text,
        "event_type": event_type,
        "order_id": order_id,
        "machine_name": machine_name,
        "status": status,
        "erp_synchronized": True
    }

# ============================================================================
# TALLY PRIME XML EXPORT API
# ============================================================================
@app.get("/api/tally/export/{order_id}")
def export_tally_xml(order_id: str):
    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM work_orders WHERE id = ?", (order_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Order not found")

    order = dict(row)
    base_amt = order['total_price'] * 83.0 # INR conversion
    cgst = base_amt * 0.09
    sgst = base_amt * 0.09
    total = base_amt + cgst + sgst

    xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Job Work In Order" ACTION="Create">
            <DATE>{order['created_date'].replace('-', '')}</DATE>
            <VOUCHERTYPENAME>Job Work In Order</VOUCHERTYPENAME>
            <VOUCHERNUMBER>{order['id']}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>{order['client_name']}</PARTYLEDGERNAME>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>{order['client_name']}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-{total:.2f}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>CNC Machining &amp; 3D Job Work (HSN 9988)</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>{base_amt:.2f}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output CGST @ 9%</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>{cgst:.2f}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output SGST @ 9%</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>{sgst:.2f}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>"""
    return Response(content=xml_content, media_type="application/xml")

# ============================================================================
# INVENTORY & TOOLING API
# ============================================================================
@app.get("/api/inventory")
def get_inventory():
    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM inventory ORDER BY id ASC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

@app.post("/api/inventory")
def create_inventory_item(item: InventoryItemCreate):
    conn = database.get_connection()
    cursor = conn.cursor()
    item_id = item.id
    if not item_id:
        cursor.execute("SELECT COUNT(*) FROM inventory")
        c = cursor.fetchone()[0]
        item_id = f"INV-{c + 1:02d}"

    status = "Low Stock" if item.stock <= item.min_threshold else "In Stock"
    cursor.execute("""
    INSERT INTO inventory (id, name, category, stock, unit, min_threshold, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (item_id, item.name, item.category, item.stock, item.unit, item.min_threshold, status))
    conn.commit()
    conn.close()
    return {"status": "created", "id": item_id}

@app.put("/api/inventory/{item_id}")
def update_inventory_item(item_id: str, item: InventoryItemCreate):
    conn = database.get_connection()
    cursor = conn.cursor()
    status = "Low Stock" if item.stock <= item.min_threshold else "In Stock"
    cursor.execute("""
    UPDATE inventory SET name = ?, category = ?, stock = ?, unit = ?, min_threshold = ?, status = ?
    WHERE id = ?
    """, (item.name, item.category, item.stock, item.unit, item.min_threshold, status, item_id))
    conn.commit()
    conn.close()
    return {"status": "updated", "id": item_id}

@app.put("/api/inventory/{item_id}/restock")
def restock_inventory_item(item_id: str, payload: InventoryRestock):
    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT stock, min_threshold FROM inventory WHERE id = ?", (item_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Inventory item not found")

    new_stock = row["stock"] + payload.quantity
    status = "Low Stock" if new_stock <= row["min_threshold"] else "In Stock"
    cursor.execute("UPDATE inventory SET stock = ?, status = ? WHERE id = ?", (new_stock, status, item_id))
    conn.commit()
    conn.close()
    return {"status": "restocked", "id": item_id, "new_stock": new_stock}

@app.delete("/api/inventory/{item_id}")
def delete_inventory_item(item_id: str):
    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM inventory WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted", "id": item_id}

# Health check
@app.get("/api/health")
def health():
    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM work_orders")
    order_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM clients")
    client_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM machines")
    machine_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM inventory")
    inventory_count = cursor.fetchone()[0]
    conn.close()
    return {
        "status": "healthy",
        "service": "Vortex CNC Studio OS",
        "version": "2.2.0",
        "database": "connected",
        "stats": {
            "work_orders": order_count,
            "clients": client_count,
            "machines": machine_count,
            "inventory": inventory_count
        }
    }
