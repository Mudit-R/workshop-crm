"""
Vortex CNC & 3D Studio CRM - SQLite Database Layer
Stores Work Orders, Clients, Machines, Inventory, and WhatsApp Messages.
"""

import sqlite3
import json
import os
import shutil

# Detect serverless environment (Vercel / AWS Lambda)
IS_SERVERLESS = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

if IS_SERVERLESS:
    # Serverless deployment roots are read-only; use /tmp for writable SQLite database
    DB_PATH = "/tmp/cnc_crm.db"
    ORIGINAL_DB = os.path.join(os.path.dirname(__file__), "cnc_crm.db")
    if os.path.exists(ORIGINAL_DB) and not os.path.exists(DB_PATH):
        try:
            shutil.copy2(ORIGINAL_DB, DB_PATH)
        except Exception as e:
            print(f"Notice: Initial DB seed copy to /tmp skipped: {e}")
else:
    DB_PATH = os.path.join(os.path.dirname(__file__), "cnc_crm.db")

def get_connection():
    if IS_SERVERLESS and not os.path.exists(DB_PATH):
        init_db()
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Work Orders Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS work_orders (
        id TEXT PRIMARY KEY,
        client_id TEXT,
        client_name TEXT,
        client_phone TEXT,
        client_contact TEXT,
        part_name TEXT,
        process TEXT,
        material TEXT,
        dimensions TEXT,
        tolerance TEXT,
        surface_finish TEXT,
        quantity INTEGER,
        unit_price REAL,
        total_price REAL,
        deposit_paid REAL,
        balance_due REAL,
        status TEXT,
        priority TEXT,
        machine_name TEXT,
        operator TEXT,
        due_date TEXT,
        created_date TEXT,
        cad_file TEXT,
        model_preset TEXT,
        progress INTEGER,
        cycle_time_minutes INTEGER,
        cam_software TEXT,
        gcode_file TEXT,
        qc_status TEXT,
        notes TEXT
    )
    """)

    # Clients Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT,
        company TEXT,
        email TEXT,
        phone TEXT,
        whatsapp TEXT,
        industry TEXT,
        tax_id TEXT,
        total_orders INTEGER,
        total_spent REAL,
        outstanding REAL,
        rating REAL,
        notes TEXT
    )
    """)

    # Machines Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS machines (
        id TEXT PRIMARY KEY,
        name TEXT,
        type TEXT,
        brand TEXT,
        spindle_max_rpm INTEGER,
        work_envelope TEXT,
        status TEXT,
        current_job TEXT,
        spindle_rpm INTEGER,
        feed_rate TEXT,
        current_tool TEXT,
        coolant_pressure TEXT,
        spindle_load TEXT,
        uptime_percent REAL,
        total_spindle_hours INTEGER,
        operator TEXT
    )
    """)

    # WhatsApp Messages Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id TEXT PRIMARY KEY,
        phone TEXT,
        sender TEXT,
        text TEXT,
        timestamp TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Seed data if empty
    cursor.execute("SELECT COUNT(*) FROM work_orders")
    count = cursor.fetchone()[0]

    if count == 0:
        seed_initial_data(cursor)

    conn.commit()
    conn.close()

def seed_initial_data(cursor):
    # Load initial data from static/js/data.js or seed directly
    clients_data = [
        ("C-101", "Dr. Marcus Vance", "AeroTech Dynamics Ltd", "m.vance@aerotech-dyn.com", "+1 (555) 019-2831", "+15550192831", "Aerospace & Defense", "US-8829104", 14, 48920.0, 3420.0, 5.0, "AS9100 aerospace parts."),
        ("C-102", "Elena Rostova", "Apex Fluidics Systems", "elena@apexfluidics.io", "+1 (555) 014-9921", "+15550149921", "Industrial Automation", "US-9912443", 8, 27400.0, 0.0, 5.0, "Hydraulic manifolds."),
        ("C-103", "Tariq Mansour", "Skyline Robotics Lab", "tariq@skylinerobotics.tech", "+1 (555) 017-3842", "+15550173842", "Robotics & Drones", "US-7740192", 21, 36800.0, 1150.0, 4.8, "Lightweight carbon-reinforced SLS."),
        ("C-104", "Dr. Ananya Iyer", "NeuroMotion BioMed Inc", "ananya.iyer@neuromotion.org", "+1 (555) 012-7711", "+15550127711", "Medical Devices", "US-6610982", 5, 42100.0, 5600.0, 5.0, "Titanium DMLS prosthetics."),
        ("C-105", "Soren Lindqvist", "Kinetics Precision Systems", "soren@kineticsprecision.se", "+1 (555) 018-4490", "+15550184490", "Motion Control", "SE-556102", 11, 19850.0, 0.0, 4.9, "Precision gear drives."),
        ("C-106", "Chloe Dupont", "Lumina Photonics", "c.dupont@luminaphotonics.fr", "+1 (555) 016-8833", "+15550168833", "Scientific Sensors", "FR-8291039", 6, 14200.0, 850.0, 4.7, "Delrin optical enclosures.")
    ]

    cursor.executemany("""
    INSERT INTO clients (id, name, company, email, phone, whatsapp, industry, tax_id, total_orders, total_spent, outstanding, rating, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, clients_data)

    orders_data = [
        ("WO-4091", "C-101", "AeroTech Dynamics Ltd", "+15550192831", "Dr. Marcus Vance", "Turbine Impeller 5-Axis Blisk", "CNC Milling (5-Axis)", "Aluminum 7075-T6", "180 x 180 x 65 mm", "±0.015 mm", "Hard Anodized Type III (Black) + Ra 0.8", 12, 285.0, 3420.0, 1710.0, 1710.0, "Machining", "Critical", "DMG Mori NMV 3000 (5-Axis)", "Vikram Sharma", "2026-10-10", "2026-10-01", "impeller_aero_v4.step", "turbine", 68, 45, "HyperMILL 5-Axis", "O4091_IMPELLER_BLISK_REV3.NC", "Pending final CMM", "Critical bore diameter 25.000 +0.008/-0.000 mm. CMM inspection report required before dispatch."),
        ("WO-4092", "C-102", "Apex Fluidics Systems", "+15550149921", "Elena Rostova", "Hydraulic 6-Port Manifold Block", "CNC Milling (3-Axis)", "Aluminum 6061-T6", "220 x 140 x 95 mm", "±0.03 mm", "Bead Blasted + Clear Anodize", 25, 164.0, 4100.0, 4100.0, 0.0, "QC Inspection", "High", "Haas VF-4SS Super Speed", "David Chen", "2026-10-08", "2026-09-28", "manifold_block_revC.step", "manifold", 88, 32, "Mastercam 2026", "O4092_MANIFOLD_REV_C.NC", "Passed (Leak tested at 350 bar)", "SAE -6 O-ring boss ports must have Ra 0.4 on sealing chamfers."),
        ("WO-4093", "C-103", "Skyline Robotics Lab", "+15550173842", "Tariq Mansour", "Voronoi Drone Arm & Motor Mount", "3D Printing (SLS PA12-CF)", "Carbon-Fiber Nylon (PA12-CF)", "280 x 65 x 40 mm", "±0.15 mm", "Vapor Smoothed (Matte Black)", 16, 72.0, 1152.0, 600.0, 552.0, "Dispatched", "Normal", "EOS Formiga P110 Velocis", "Maya Lin", "2026-10-06", "2026-09-30", "drone_arm_lightweight_v5.stl", "bracket", 100, 180, "Materialise Magics", "SLS_JOB_4093_DRONE_ARM.SLS", "Passed (Weight: 142g, Target: <150g)", "Dispatched via DHL Express Tracking #9401-8293-1120."),
        ("WO-4094", "C-104", "NeuroMotion BioMed Inc", "+15550127711", "Dr. Ananya Iyer", "Bionic Prosthetic Knuckle Joint", "3D Printing (Metal DMLS)", "Titanium Ti-6Al-4V Grade 23 ELI", "65 x 45 x 30 mm", "±0.05 mm", "Micro-machined bores + Electropolish", 4, 1400.0, 5600.0, 2800.0, 2800.0, "DFM Review", "Critical", "EOS M290 Metal 3D", "Dr. Julian Vance", "2026-10-18", "2026-10-04", "prosthetic_knuckle_revB.step", "joint", 25, 420, "Siemens NX Additive", "DMLS_TI_KNUCKLE_BUILD_V2.CLI", "Awaiting DFM client sign-off on build orientation", "Internal lattice structure for osseointegration."),
        ("WO-4095", "C-105", "Kinetics Precision Systems", "+15550184490", "Soren Lindqvist", "Helical Gearbox Drive Housing", "CNC Turn-Mill (Multi-Tasking)", "Stainless Steel 316L", "120 dia x 160 mm", "±0.008 mm", "Precision Ground Bores + Passivated", 10, 420.0, 4200.0, 4200.0, 0.0, "G-Code Ready", "High", "Mazak Integrex i-200", "Vikram Sharma", "2026-10-14", "2026-10-03", "helical_housing_316L.step", "gear", 40, 62, "Esprit CAM Mill-Turn", "O4095_MAZAK_INTEGREX_REV1.EIA", "Toolpaths verified with Vericut", "Threaded M42x1.5 internal class 6H thread gauge required."),
        ("WO-4096", "C-106", "Lumina Photonics & Sensor Labs", "+15550168833", "Chloe Dupont", "Optical Spectrometer Enclosure & Bezel", "CNC Rapid Prototyping", "Delrin / Acetal (Black POM-C)", "150 x 110 x 50 mm", "±0.05 mm", "Non-reflective Bead Blast", 8, 110.0, 880.0, 880.0, 0.0, "Delivered", "Normal", "Haas VF-4SS Super Speed", "David Chen", "2026-10-03", "2026-09-24", "spectro_enclosure_assy.step", "enclosure", 100, 22, "Fusion 360 Machining", "O4096_DELRIN_SPECTRO_ENCL.NC", "Passed 100% Inspection", "Delivered on time.")
    ]

    cursor.executemany("""
    INSERT INTO work_orders (id, client_id, client_name, client_phone, client_contact, part_name, process, material, dimensions, tolerance, surface_finish, quantity, unit_price, total_price, deposit_paid, balance_due, status, priority, machine_name, operator, due_date, created_date, cad_file, model_preset, progress, cycle_time_minutes, cam_software, gcode_file, qc_status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, orders_data)

    machines_data = [
        ("M-01", "DMG Mori NMV 3000 DCG", "5-Axis High-Precision CNC Mill", "DMG MORI", 20000, "500 x 500 x 400 mm", "Running", "WO-4091 (Turbine Impeller)", 14200, "3,800 mm/min", "T07 - 8mm 4-Flute AlTiN Ball Mill", "68 bar", "64%", 94.2, 3820, "Vikram Sharma"),
        ("M-02", "Haas VF-4SS Super Speed", "3-Axis Vertical Machining Center", "HAAS Automation", 12000, "1270 x 660 x 635 mm", "Idle", "Ready for WO-4097", 0, "0 mm/min", "T01 - 50mm Face Mill (CoroMill)", "20 bar", "0%", 89.5, 6140, "David Chen"),
        ("M-03", "Mazak Integrex i-200", "Mill-Turn 5-Axis Multi-Tasking Lathe", "MAZAK", 12000, "Dia 658 x 1011 mm", "Setup", "Tooling Setup for WO-4095", 0, "0 mm/min", "T12 - Sandvik CoroTurn Prime", "35 bar", "0%", 91.8, 4410, "Vikram Sharma"),
        ("M-04", "EOS Formiga P110 Velocis", "Industrial SLS Polymer 3D Printer", "EOS GmbH", 0, "200 x 250 x 330 mm", "Idle", "Chamber cooling down (Job 4093)", 0, "Laser 30W CO2", "Recoater Blade Calibrated", "N2 Inert Atmosphere OK", "12%", 96.1, 2190, "Maya Lin"),
        ("M-05", "EOS M290 Metal 3D", "Direct Metal Laser Sintering (DMLS)", "EOS GmbH", 0, "250 x 250 x 325 mm", "Running", "Ti-6Al-4V Calibration & Preheat", 0, "Fiber Laser 400W active", "Ceramic Blade Recoater", "Argon Purge < 0.1% O2", "78%", 88.0, 1850, "Dr. Julian Vance"),
        ("M-06", "Bambu Lab X1-Carbon Enterprise", "High-Speed FDM Composite 3D Printer", "Bambu Lab", 0, "256 x 256 x 256 mm", "Running", "Jig & Fixture Prototyping", 0, "500 mm/s", "0.4mm Hardened Steel Nozzle", "Dual Aux Cooling 100%", "45%", 98.4, 1240, "Maya Lin")
    ]

    cursor.executemany("""
    INSERT INTO machines (id, name, type, brand, spindle_max_rpm, work_envelope, status, current_job, spindle_rpm, feed_rate, current_tool, coolant_pressure, spindle_load, uptime_percent, total_spindle_hours, operator)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, machines_data)

    print("Vortex CRM database seeded with initial records.")

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
