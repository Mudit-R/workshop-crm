/**
 * Vortex CNC & 3D Studio CRM - REST API Client
 * Wraps all backend HTTP calls. Falls back to local data if server unreachable.
 * Supports both /api/* (local FastAPI) and Vercel serverless routes.
 */

const VortexAPI = {
  BASE: window.location.origin,
  _isLocal: null,

  async _fetch(path, options = {}) {
    const url = `${this.BASE}${path}`;
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn(`[API] Request failed for ${path}:`, e.message);
      return null;
    }
  },

  // ---------- Health / Mode Detection ----------
  async checkHealth() {
    const result = await this._fetch('/api/health');
    return result !== null;
  },

  // ---------- Work Orders ----------
  async getWorkOrders(status = null, search = null) {
    let path = '/api/work-orders';
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (search) params.append('search', search);
    if ([...params].length) path += '?' + params.toString();
    return await this._fetch(path);
  },

  async createWorkOrder(data) {
    return await this._fetch('/api/work-orders', {
      method: 'POST',
      body: JSON.stringify(VortexAPI._toSnake(data))
    });
  },

  async updateWorkOrder(id, data) {
    return await this._fetch(`/api/work-orders/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(VortexAPI._toSnake(data))
    });
  },

  async deleteWorkOrder(id) {
    return await this._fetch(`/api/work-orders/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  async updateWorkOrderStatus(id, status, progress = null) {
    const body = { status };
    if (progress !== null) body.progress = progress;
    return await this._fetch(`/api/work-orders/${encodeURIComponent(id)}/status`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  // ---------- Clients ----------
  async getClients() {
    return await this._fetch('/api/clients');
  },

  async createClient(data) {
    return await this._fetch('/api/clients', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        company: data.company,
        email: data.email || '',
        phone: data.phone || '',
        whatsapp: data.whatsapp,
        industry: data.industry || 'General Engineering',
        tax_id: data.taxId || '',
        notes: data.notes || ''
      })
    });
  },

  async updateClient(id, data) {
    return await this._fetch(`/api/clients/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: data.name,
        company: data.company,
        email: data.email || '',
        phone: data.phone || '',
        whatsapp: data.whatsapp,
        industry: data.industry || 'General Engineering',
        tax_id: data.taxId || '',
        notes: data.notes || ''
      })
    });
  },

  // ---------- Machines ----------
  async getMachines() {
    return await this._fetch('/api/machines');
  },

  async updateMachineStatus(machineId, status) {
    return await this._fetch(`/api/machines/${encodeURIComponent(machineId)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  // ---------- WhatsApp ----------
  async getMessages(phone) {
    return await this._fetch(`/api/whatsapp/messages/${encodeURIComponent(phone)}`);
  },

  async sendMessage(phone, text, sender = 'shop') {
    return await this._fetch('/api/whatsapp/messages', {
      method: 'POST',
      body: JSON.stringify({ phone, text, sender })
    });
  },

  // ---------- Voice Notes ----------
  async logVoiceNote(text) {
    return await this._fetch('/api/voice-notes/log', {
      method: 'POST',
      body: JSON.stringify({ text })
    });
  },

  // ---------- Tally Export ----------
  getTallyExportUrl(orderId) {
    return `${this.BASE}/api/tally/export/${encodeURIComponent(orderId)}`;
  },

  // ---------- Inventory & Tooling ----------
  async getInventory() {
    const res = await this._fetch('/api/inventory');
    if (res && res.length > 0) return res.map(this.normalizeInventoryItem);
    return window.VORTEX_INITIAL_DATA ? window.VORTEX_INITIAL_DATA.inventory : [];
  },

  async createInventoryItem(data) {
    return await this._fetch('/api/inventory', {
      method: 'POST',
      body: JSON.stringify({
        id: data.id,
        name: data.name,
        category: data.category,
        stock: parseFloat(data.stock) || 0,
        unit: data.unit || 'Pcs',
        min_threshold: parseFloat(data.minThreshold || data.min_threshold) || 5,
        status: data.status || 'In Stock'
      })
    });
  },

  async updateInventoryItem(id, data) {
    return await this._fetch(`/api/inventory/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: data.name,
        category: data.category,
        stock: parseFloat(data.stock) || 0,
        unit: data.unit || 'Pcs',
        min_threshold: parseFloat(data.minThreshold || data.min_threshold) || 5,
        status: data.status || 'In Stock'
      })
    });
  },

  async restockInventoryItem(id, quantity) {
    return await this._fetch(`/api/inventory/${encodeURIComponent(id)}/restock`, {
      method: 'PUT',
      body: JSON.stringify({ quantity: parseFloat(quantity) || 0 })
    });
  },

  async deleteInventoryItem(id) {
    return await this._fetch(`/api/inventory/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  // ---------- Data Conversion Helpers ----------
  // Convert camelCase JS object to snake_case for backend
  _toSnake(obj) {
    const result = {};
    for (const key of Object.keys(obj)) {
      const snakeKey = key.replace(/([A-Z])/g, m => '_' + m.toLowerCase());
      result[snakeKey] = obj[key];
    }
    return result;
  },

  // Convert snake_case backend response to camelCase JS
  _toCamel(obj) {
    if (Array.isArray(obj)) return obj.map(VortexAPI._toCamel);
    if (obj === null || typeof obj !== 'object') return obj;
    const result = {};
    for (const key of Object.keys(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      result[camelKey] = VortexAPI._toCamel(obj[key]);
    }
    return result;
  },

  // Normalize work order from DB (snake_case) to app format (camelCase)
  normalizeWorkOrder(raw) {
    return {
      id: raw.id,
      clientId: raw.client_id,
      clientName: raw.client_name,
      clientPhone: raw.client_phone,
      clientContact: raw.client_contact || '',
      partName: raw.part_name,
      process: raw.process,
      material: raw.material,
      dimensions: raw.dimensions || '',
      tolerance: raw.tolerance || '±0.02 mm',
      surfaceFinish: raw.surface_finish || 'As Machined',
      quantity: raw.quantity || 1,
      unitPrice: raw.unit_price || 0,
      totalPrice: raw.total_price || 0,
      depositPaid: raw.deposit_paid || 0,
      balanceDue: raw.balance_due || 0,
      status: raw.status || 'DFM Review',
      priority: raw.priority || 'Normal',
      machineName: raw.machine_name || '',
      operator: raw.operator || 'Shop Lead',
      dueDate: raw.due_date || '',
      createdDate: raw.created_date || '',
      cadFile: raw.cad_file || '',
      modelPreset: raw.model_preset || 'turbine',
      progress: raw.progress || 0,
      cycleTimeMinutes: raw.cycle_time_minutes || 30,
      camSoftware: raw.cam_software || 'Mastercam',
      gcodeFile: raw.gcode_file || '',
      qcStatus: raw.qc_status || 'Pending',
      notes: raw.notes || ''
    };
  },

  // Normalize client from DB to app format
  normalizeClient(raw) {
    return {
      id: raw.id,
      name: raw.name,
      company: raw.company,
      email: raw.email || '',
      phone: raw.phone || '',
      whatsapp: raw.whatsapp,
      industry: raw.industry || 'General Engineering',
      taxId: raw.tax_id || '',
      totalOrders: raw.total_orders || 0,
      totalSpent: raw.total_spent || 0,
      outstanding: raw.outstanding || 0,
      rating: raw.rating || 5,
      notes: raw.notes || ''
    };
  },

  // Normalize machine from DB to app format
  normalizeMachine(raw) {
    return {
      id: raw.id,
      name: raw.name,
      type: raw.type,
      brand: raw.brand,
      spindleMaxRpm: raw.spindle_max_rpm || 0,
      workEnvelope: raw.work_envelope || '',
      status: raw.status || 'Idle',
      currentJob: raw.current_job || 'Idle',
      spindleRpm: raw.spindle_rpm || 0,
      feedRate: raw.feed_rate || '0 mm/min',
      currentTool: raw.current_tool || '',
      coolantPressure: raw.coolant_pressure || '',
      spindleLoad: raw.spindle_load || '0%',
      uptimePercent: raw.uptime_percent || 0,
      totalSpindleHours: raw.total_spindle_hours || 0,
      operator: raw.operator || 'Shop Lead'
    };
  },

  // Normalize inventory item from DB to app format
  normalizeInventoryItem(raw) {
    return {
      id: raw.id,
      name: raw.name,
      category: raw.category,
      stock: raw.stock,
      unit: raw.unit,
      minThreshold: raw.min_threshold !== undefined ? raw.min_threshold : raw.minThreshold,
      status: raw.status
    };
  }
};

// Export globally
window.VortexAPI = VortexAPI;
