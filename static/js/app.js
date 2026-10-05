/**
 * Vortex CNC & 3D Studio CRM - Main Application Core
 * Coordinates state, views, modals, work orders lifecycle, sound fx, and data persistence.
 */

class VortexApp {
  constructor() {
    this.currentView = 'work-orders';
    this.viewMode = 'kanban'; // 'kanban' or 'table'
    this.activeFilter = 'all';
    this.searchQuery = '';

    // Load persisted state or fallback
    this.loadState();

    // Sound FX generator (Web Audio API)
    this.initAudio();

    // Initialize sub-modules
    this.initSubModules();

    // Setup global navigation & modals
    this.setupNavigation();
    this.setupWorkOrderHandlers();
    this.setupClientHandlers();

    // Render initial view
    this.renderCurrentView();
    this.updateDashboardCounters();

    console.log("Vortex CNC CRM initialized successfully.");
  }

  loadState() {
    try {
      const savedOrders = localStorage.getItem('vortex_work_orders');
      const savedClients = localStorage.getItem('vortex_clients');
      const savedMachines = localStorage.getItem('vortex_machines');

      this.workOrders = savedOrders ? JSON.parse(savedOrders) : window.VORTEX_INITIAL_DATA.workOrders;
      this.clients = savedClients ? JSON.parse(savedClients) : window.VORTEX_INITIAL_DATA.clients;
      this.machines = savedMachines ? JSON.parse(savedMachines) : window.VORTEX_INITIAL_DATA.machines;
      this.materials = window.VORTEX_INITIAL_DATA.materialsDatabase;
      this.inventory = window.VORTEX_INITIAL_DATA.inventory;
      this.shopInfo = window.VORTEX_INITIAL_DATA.shopInfo;
    } catch (e) {
      console.error("Error loading local state, falling back to defaults:", e);
      this.workOrders = window.VORTEX_INITIAL_DATA.workOrders;
      this.clients = window.VORTEX_INITIAL_DATA.clients;
      this.machines = window.VORTEX_INITIAL_DATA.machines;
      this.materials = window.VORTEX_INITIAL_DATA.materialsDatabase;
      this.inventory = window.VORTEX_INITIAL_DATA.inventory;
      this.shopInfo = window.VORTEX_INITIAL_DATA.shopInfo;
    }
  }

  saveState() {
    try {
      localStorage.setItem('vortex_work_orders', JSON.stringify(this.workOrders));
      localStorage.setItem('vortex_clients', JSON.stringify(this.clients));
      localStorage.setItem('vortex_machines', JSON.stringify(this.machines));
    } catch (e) {
      console.warn("Unable to save to localStorage:", e);
    }
  }

  initSubModules() {
    this.cadViewer = new window.VortexCadViewer('cad-viewport-container');
    this.whatsAppManager = new window.VortexWhatsAppManager(this);
    this.quotingEngine = new window.VortexQuotingEngine(this);
    this.machineFleet = new window.VortexMachineFleet(this);
  }

  initAudio() {
    this.audioCtx = null;
    this.soundEnabled = true;
    const unlockAudio = () => {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.audioCtx = new AudioContext();
      }
      window.removeEventListener('click', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
  }

  playSound(type = 'click') {
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'send') {
        osc.frequency.setValueAtTime(540, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'receive') {
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(660, now + 0.07);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else {
        // subtle click
        osc.frequency.setValueAtTime(320, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      }
    } catch (e) {
      // Audio failed silently
    }
  }

  setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-link[data-view]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const view = btn.getAttribute('data-view');
        this.switchView(view);
      });
    });

    // View mode switch (Kanban vs Table)
    const kanbanBtn = document.getElementById('view-kanban-toggle');
    const tableBtn = document.getElementById('view-table-toggle');

    if (kanbanBtn) {
      kanbanBtn.addEventListener('click', () => {
        this.viewMode = 'kanban';
        kanbanBtn.classList.add('active');
        if (tableBtn) tableBtn.classList.remove('active');
        this.renderWorkOrders();
      });
    }

    if (tableBtn) {
      tableBtn.addEventListener('click', () => {
        this.viewMode = 'table';
        tableBtn.classList.add('active');
        if (kanbanBtn) kanbanBtn.classList.remove('active');
        this.renderWorkOrders();
      });
    }

    // Search bar listener
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderWorkOrders();
      });
    }

    // Filter pills
    const filterPills = document.querySelectorAll('.filter-pill[data-filter]');
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeFilter = pill.getAttribute('data-filter');
        this.renderWorkOrders();
      });
    });
  }

  switchView(viewName) {
    this.currentView = viewName;
    this.playSound('click');

    // Update active nav button
    document.querySelectorAll('.nav-link[data-view]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
    });

    // Toggle view containers
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const targetSec = document.getElementById(`view-${viewName}`);
    if (targetSec) {
      targetSec.classList.add('active');
    }

    // View specific hooks
    if (viewName === 'cad-viewer' && this.cadViewer) {
      setTimeout(() => this.cadViewer.onResize(), 100);
    }
    if (viewName === 'machines' && this.machineFleet) {
      this.machineFleet.renderFleetGrid();
    }
    if (viewName === 'clients') {
      this.renderClientsDirectory();
    }
    if (viewName === 'inventory') {
      this.renderInventoryView();
    }
    if (viewName === 'analytics') {
      this.renderAnalyticsView();
    }
    if (viewName === 'whatsapp' && this.whatsAppManager) {
      this.whatsAppManager.renderClientList();
      this.whatsAppManager.renderActiveConversation();
    }
  }

  renderCurrentView() {
    this.renderWorkOrders();
    this.renderClientsDirectory();
    this.renderInventoryView();
    this.renderAnalyticsView();
  }

  updateDashboardCounters() {
    const totalOrders = this.workOrders.length;
    const activeOrders = this.workOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Draft').length;
    const runningMachines = this.machines.filter(m => m.status === 'Running').length;
    const totalRevenue = this.workOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const balanceDue = this.workOrders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);

    const elTotalRev = document.getElementById('stat-total-rev');
    const elActiveJobs = document.getElementById('stat-active-jobs');
    const elMachinesRunning = document.getElementById('stat-machines-running');
    const elBalanceDue = document.getElementById('stat-balance-due');

    if (elTotalRev) elTotalRev.textContent = `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    if (elActiveJobs) elActiveJobs.textContent = activeOrders;
    if (elMachinesRunning) elMachinesRunning.textContent = `${runningMachines} / ${this.machines.length}`;
    if (elBalanceDue) elBalanceDue.textContent = `$${balanceDue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  /* -------------------------------------------------------------
     WORK ORDERS LOGIC
  ------------------------------------------------------------- */
  getFilteredWorkOrders() {
    return this.workOrders.filter(order => {
      // Filter status / category
      let matchesFilter = true;
      if (this.activeFilter === 'cnc') matchesFilter = order.process.toLowerCase().includes('cnc');
      else if (this.activeFilter === '3d') matchesFilter = order.process.toLowerCase().includes('3d');
      else if (this.activeFilter === 'machining') matchesFilter = order.status === 'Machining';
      else if (this.activeFilter === 'qc') matchesFilter = order.status === 'QC Inspection';
      else if (this.activeFilter === 'critical') matchesFilter = order.priority === 'Critical';

      // Search query
      let matchesSearch = true;
      if (this.searchQuery) {
        const q = this.searchQuery;
        matchesSearch = order.id.toLowerCase().includes(q) ||
          order.partName.toLowerCase().includes(q) ||
          order.clientName.toLowerCase().includes(q) ||
          order.material.toLowerCase().includes(q) ||
          order.process.toLowerCase().includes(q);
      }

      return matchesFilter && matchesSearch;
    });
  }

  renderWorkOrders() {
    const kanbanView = document.getElementById('wo-kanban-container');
    const tableView = document.getElementById('wo-table-container');

    if (this.viewMode === 'kanban') {
      if (kanbanView) kanbanView.style.display = 'grid';
      if (tableView) tableView.style.display = 'none';
      this.renderKanbanView();
    } else {
      if (kanbanView) kanbanView.style.display = 'none';
      if (tableView) tableView.style.display = 'block';
      this.renderTableView();
    }

    this.updateDashboardCounters();
  }

  renderKanbanView() {
    const stages = [
      { id: "DFM Review", title: "DFM & Review", icon: "📐" },
      { id: "G-Code Ready", title: "G-Code / Queue", icon: "💻" },
      { id: "Machining", title: "Machining / Print", icon: "⚙️" },
      { id: "QC Inspection", title: "QC Inspection", icon: "🔍" },
      { id: "Dispatched", title: "Dispatched / Transit", icon: "🚚" },
      { id: "Delivered", title: "Delivered / Paid", icon: "✅" }
    ];

    const kanbanContainer = document.getElementById('wo-kanban-container');
    if (!kanbanContainer) return;

    kanbanContainer.innerHTML = '';
    const filtered = this.getFilteredWorkOrders();

    stages.forEach(stage => {
      const stageOrders = filtered.filter(o => o.status === stage.id || (stage.id === "G-Code Ready" && o.status === "In Queue"));

      const col = document.createElement('div');
      col.className = 'kanban-column';
      col.innerHTML = `
        <div class="kanban-column-header">
          <div class="kanban-col-title">
            <span>${stage.icon}</span>
            <h4>${stage.title}</h4>
          </div>
          <span class="kanban-count-badge">${stageOrders.length}</span>
        </div>
        <div class="kanban-cards-wrapper" id="kanban-stage-${stage.id.replace(/\s+/g, '-')}">
        </div>
      `;

      const cardsWrapper = col.querySelector('.kanban-cards-wrapper');

      if (stageOrders.length === 0) {
        cardsWrapper.innerHTML = `<div class="kanban-empty-state">No jobs in this stage</div>`;
      } else {
        stageOrders.forEach(order => {
          const card = document.createElement('div');
          card.className = `kanban-card priority-${order.priority.toLowerCase()}`;
          card.innerHTML = `
            <div class="kcard-header">
              <span class="kcard-id">${order.id}</span>
              <span class="kcard-priority ${order.priority.toLowerCase()}">${order.priority}</span>
            </div>
            <h4 class="kcard-title">${order.partName}</h4>
            <div class="kcard-client">${order.clientName}</div>
            
            <div class="kcard-specs">
              <span class="kcard-spec-tag">${order.material}</span>
              <span class="kcard-spec-tag">${order.quantity} pcs</span>
            </div>

            <!-- Interactive Progress Section -->
            <div class="kcard-progress-section">
              <div class="kcard-progress-label">
                <span>Progress: <strong class="text-accent">${order.progress}%</strong></span>
                <button class="btn-boost" onclick="window.vortexApp.quickProgressBoost('${order.id}', 15)" title="Add +15% progress">+15%</button>
              </div>
              <div class="kcard-progress-bar">
                <div class="kcard-progress-fill" style="width: ${order.progress}%"></div>
              </div>
            </div>

            <div class="kcard-meta">
              <span class="kcard-machine"><i class="lucide-cpu"></i> ${order.machineName ? order.machineName.split(' ')[0] : 'Haas / DMG'}</span>
              <span class="kcard-price">$${order.totalPrice.toFixed(0)}</span>
            </div>

            <!-- Advance Stage Quick Button -->
            ${this.renderAdvanceButtonHtml(order)}

            <div class="kcard-actions">
              <button class="kcard-btn-inspect" onclick="window.vortexApp.inspectPartIn3D('${order.id}')" title="Inspect in 3D">
                <i class="lucide-box"></i> 3D
              </button>
              <button class="kcard-btn-wa" onclick="window.vortexApp.openWhatsAppQuickModal('${order.id}')" title="Send WhatsApp Update">
                <i class="lucide-message-circle"></i> WhatsApp
              </button>
              <button class="kcard-btn-edit" onclick="window.vortexApp.openEditWorkOrderModal('${order.id}')" title="Details / Edit">
                <i class="lucide-edit-3"></i>
              </button>
            </div>
          `;
          cardsWrapper.appendChild(card);
        });
      }

      kanbanContainer.appendChild(col);
    });

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  renderAdvanceButtonHtml(order) {
    const next = this.getNextStage(order.status);
    if (!next) {
      return `<div class="kcard-done-badge">✅ Order Completed</div>`;
    }
    return `
      <button class="btn-advance-stage" onclick="window.vortexApp.advanceOrderStage('${order.id}')" title="Advance to ${next.to}">
        <span>▶ Advance to <strong>${next.label}</strong></span>
      </button>
    `;
  }

  getNextStage(currentStatus) {
    const map = {
      "Draft": { to: "DFM Review", label: "DFM Review", progress: 20 },
      "DFM Review": { to: "G-Code Ready", label: "G-Code / Toolpath", progress: 40 },
      "G-Code Ready": { to: "Machining", label: "Machining", progress: 65 },
      "In Queue": { to: "Machining", label: "Machining", progress: 65 },
      "Machining": { to: "QC Inspection", label: "QC Inspection", progress: 85 },
      "QC Inspection": { to: "Dispatched", label: "Dispatch / Shipping", progress: 95 },
      "Dispatched": { to: "Delivered", label: "Delivered & Paid", progress: 100 }
    };
    return map[currentStatus] || null;
  }

  advanceOrderStage(orderId) {
    const order = this.workOrders.find(o => o.id === orderId);
    if (!order) return;

    const next = this.getNextStage(order.status);
    if (!next) {
      this.showToast(`Order ${order.id} is already completed!`, 'info');
      return;
    }

    order.status = next.to;
    order.progress = Math.max(order.progress, next.progress);

    if (next.to === 'Machining') {
      // Find machine and set status to Running
      const machine = this.machines.find(m => m.name === order.machineName) || this.machines[0];
      if (machine) {
        machine.status = 'Running';
        machine.currentJob = `${order.id} (${order.partName})`;
        machine.spindleRpm = 14200;
        machine.spindleLoad = "68%";
      }
    }

    this.saveState();
    this.renderWorkOrders();
    this.playSound('success');
    this.showToast(`Advanced ${order.id} to ${next.to}!`, 'success');

    // Prompt user to send WhatsApp notification
    setTimeout(() => {
      this.openWhatsAppQuickModal(order.id);
    }, 400);
  }

  quickProgressBoost(orderId, delta) {
    const order = this.workOrders.find(o => o.id === orderId);
    if (!order) return;

    order.progress = Math.min(100, (order.progress || 0) + delta);
    if (order.progress >= 100 && order.status !== 'Delivered') {
      order.status = 'QC Inspection';
    }

    this.saveState();
    this.renderWorkOrders();
    this.playSound('click');
    this.showToast(`Updated ${order.id} progress to ${order.progress}%`, 'info');
  }

  openWhatsAppQuickModal(orderId) {
    const order = this.workOrders.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById('wa-quick-dispatch-modal');
    if (!modal) {
      this.quickWhatsAppOrder(orderId);
      return;
    }

    document.getElementById('wa-quick-order-title').textContent = `${order.id} - ${order.partName}`;
    document.getElementById('wa-quick-client-name').textContent = `${order.clientName} (${order.clientPhone})`;

    // Store active order ID for modal handlers
    this.activeQuickOrderId = order.id;

    // Render templates with live data preview
    const tplListEl = document.getElementById('wa-quick-template-options');
    if (tplListEl) {
      tplListEl.innerHTML = '';
      this.whatsAppManager.templates.forEach((tpl, idx) => {
        const client = this.clients.find(c => c.id === order.clientId) || {
          name: order.clientContact || order.clientName,
          whatsapp: order.clientPhone
        };

        const previewText = tpl.text
          .replace(/{{clientName}}/g, client.name)
          .replace(/{{orderId}}/g, order.id)
          .replace(/{{partName}}/g, order.partName)
          .replace(/{{quantity}}/g, order.quantity)
          .replace(/{{machineName}}/g, order.machineName)
          .replace(/{{progress}}/g, order.progress)
          .replace(/{{tolerance}}/g, order.tolerance)
          .replace(/{{dueDate}}/g, order.dueDate)
          .replace(/{{totalPrice}}/g, order.totalPrice.toFixed(2))
          .replace(/{{balanceDue}}/g, order.balanceDue.toFixed(2));

        const btn = document.createElement('div');
        btn.className = 'wa-quick-tpl-card';
        btn.innerHTML = `
          <div class="wa-quick-tpl-top">
            <strong>${tpl.title}</strong>
            <div class="wa-quick-tpl-actions">
              <button class="btn-sm btn-outline" onclick="window.vortexApp.sendQuickWhatsApp('${order.id}', '${tpl.id}', 'app')">
                💬 In-App Bot
              </button>
              <button class="btn-sm btn-wa" onclick="window.vortexApp.sendQuickWhatsApp('${order.id}', '${tpl.id}', 'real')">
                <i class="lucide-external-link"></i> Real WhatsApp Web
              </button>
            </div>
          </div>
          <p class="wa-quick-tpl-text">${previewText}</p>
        `;
        tplListEl.appendChild(btn);
      });
    }

    modal.classList.add('open');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  sendQuickWhatsApp(orderId, templateId, destination = 'real') {
    const order = this.workOrders.find(o => o.id === orderId);
    if (!order) return;

    const tpl = this.whatsAppManager.templates.find(t => t.id === templateId);
    if (!tpl) return;

    const client = this.clients.find(c => c.id === order.clientId) || {
      name: order.clientContact || order.clientName,
      whatsapp: order.clientPhone
    };

    const text = tpl.text
      .replace(/{{clientName}}/g, client.name)
      .replace(/{{orderId}}/g, order.id)
      .replace(/{{partName}}/g, order.partName)
      .replace(/{{quantity}}/g, order.quantity)
      .replace(/{{machineName}}/g, order.machineName)
      .replace(/{{progress}}/g, order.progress)
      .replace(/{{tolerance}}/g, order.tolerance)
      .replace(/{{dueDate}}/g, order.dueDate)
      .replace(/{{totalPrice}}/g, order.totalPrice.toFixed(2))
      .replace(/{{balanceDue}}/g, order.balanceDue.toFixed(2));

    this.closeWhatsAppQuickModal();

    if (destination === 'real') {
      const cleanPhone = (client.whatsapp || order.clientPhone).replace(/[^0-9]/g, '');
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
      this.showToast(`Opened WhatsApp Web for ${order.clientName}!`, 'success');
      // Also log inside CRM
      this.whatsAppManager.setActivePhone(client.whatsapp || order.clientPhone);
      this.whatsAppManager.handleSendMessage(text, 'shop');
    } else {
      this.whatsAppManager.setActivePhone(client.whatsapp || order.clientPhone);
      this.whatsAppManager.handleSendMessage(text, 'shop');
      this.switchView('whatsapp');
    }
  }

  closeWhatsAppQuickModal() {
    const modal = document.getElementById('wa-quick-dispatch-modal');
    if (modal) modal.classList.remove('open');
  }

  quickWhatsAppOrder(orderId) {
    this.openWhatsAppQuickModal(orderId);
  }

  setupWorkOrderHandlers() {
    const createBtn = document.getElementById('btn-create-work-order');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.openNewWorkOrderModal());
    }

    const form = document.getElementById('work-order-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveWorkOrderFromForm();
      });
    }

    const modalClose = document.getElementById('wo-modal-close');
    const modalBackdrop = document.getElementById('work-order-modal');
    if (modalClose) modalClose.addEventListener('click', () => this.closeWorkOrderModal());
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) this.closeWorkOrderModal();
      });
    }

    // Modal Live Price Auto-calculator
    const qtyInput = document.getElementById('wo-form-quantity');
    const unitPriceInput = document.getElementById('wo-form-unit-price');
    const totalInput = document.getElementById('wo-form-total-price');

    if (qtyInput && unitPriceInput && totalInput) {
      const calcTotal = () => {
        const q = parseFloat(qtyInput.value) || 0;
        const u = parseFloat(unitPriceInput.value) || 0;
        totalInput.value = (q * u).toFixed(2);
      };
      qtyInput.addEventListener('input', calcTotal);
      unitPriceInput.addEventListener('input', calcTotal);
    }
  }

  openNewWorkOrderModal(prefill = null) {
    const modal = document.getElementById('work-order-modal');
    const title = document.getElementById('wo-modal-title');
    const form = document.getElementById('work-order-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('wo-form-id').value = "";

    // Generate new ID
    const newId = `WO-${4090 + this.workOrders.length + 1}`;
    document.getElementById('wo-form-order-number').textContent = newId;

    // Populate clients select
    const clientSelect = document.getElementById('wo-form-client-id');
    if (clientSelect) {
      clientSelect.innerHTML = '<option value="">-- Choose Client --</option>';
      this.clients.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.company} (${c.name})`;
        clientSelect.appendChild(opt);
      });
    }

    // Populate machines select
    const machineSelect = document.getElementById('wo-form-machine-id');
    if (machineSelect) {
      machineSelect.innerHTML = '';
      this.machines.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.name;
        opt.textContent = `${m.name} [${m.status}]`;
        machineSelect.appendChild(opt);
      });
    }

    if (prefill) {
      if (title) title.textContent = "Create Work Order from Quote";
      if (clientSelect && prefill.clientId) clientSelect.value = prefill.clientId;
      document.getElementById('wo-form-part-name').value = prefill.partName || "";
      document.getElementById('wo-form-process').value = prefill.process || "CNC Milling (5-Axis)";
      document.getElementById('wo-form-material').value = prefill.material || "Aluminum 6061-T6";
      document.getElementById('wo-form-dimensions').value = prefill.dimensions || "100 x 100 x 50 mm";
      document.getElementById('wo-form-tolerance').value = prefill.tolerance || "±0.02 mm";
      document.getElementById('wo-form-finish').value = prefill.surfaceFinish || "As Machined";
      document.getElementById('wo-form-quantity').value = prefill.quantity || 1;
      document.getElementById('wo-form-unit-price').value = (prefill.unitPrice || 150).toFixed(2);
      document.getElementById('wo-form-total-price').value = (prefill.totalPrice || 150).toFixed(2);
    } else {
      if (title) title.textContent = "New CNC / 3D Work Order";
      document.getElementById('wo-form-quantity').value = 10;
      document.getElementById('wo-form-unit-price').value = "180.00";
      document.getElementById('wo-form-total-price').value = "1800.00";
    }

    modal.classList.add('open');
  }

  openEditWorkOrderModal(orderId) {
    const order = this.workOrders.find(o => o.id === orderId);
    if (!order) return;

    this.openNewWorkOrderModal();

    const title = document.getElementById('wo-modal-title');
    if (title) title.textContent = `Edit Work Order ${order.id}`;

    document.getElementById('wo-form-id').value = order.id;
    document.getElementById('wo-form-order-number').textContent = order.id;

    const clientSelect = document.getElementById('wo-form-client-id');
    if (clientSelect) clientSelect.value = order.clientId;

    document.getElementById('wo-form-part-name').value = order.partName;
    document.getElementById('wo-form-process').value = order.process;
    document.getElementById('wo-form-material').value = order.material;
    document.getElementById('wo-form-dimensions').value = order.dimensions || "";
    document.getElementById('wo-form-tolerance').value = order.tolerance;
    document.getElementById('wo-form-finish').value = order.surfaceFinish;
    document.getElementById('wo-form-quantity').value = order.quantity;
    document.getElementById('wo-form-unit-price').value = order.unitPrice.toFixed(2);
    document.getElementById('wo-form-total-price').value = order.totalPrice.toFixed(2);
    document.getElementById('wo-form-status').value = order.status;
    document.getElementById('wo-form-priority').value = order.priority;
    document.getElementById('wo-form-progress').value = order.progress;
    document.getElementById('wo-form-due-date').value = order.dueDate;
    document.getElementById('wo-form-notes').value = order.notes || "";

    const machineSelect = document.getElementById('wo-form-machine-id');
    if (machineSelect && order.machineName) machineSelect.value = order.machineName;
  }

  saveWorkOrderFromForm() {
    const idField = document.getElementById('wo-form-id').value;
    const isEdit = !!idField;
    const orderId = isEdit ? idField : document.getElementById('wo-form-order-number').textContent;

    const clientId = document.getElementById('wo-form-client-id').value;
    const client = this.clients.find(c => c.id === clientId) || {
      id: "C-999",
      company: "Direct Walk-in Client",
      name: "Client",
      whatsapp: "+15550190000"
    };

    const quantity = parseInt(document.getElementById('wo-form-quantity').value, 10) || 1;
    const unitPrice = parseFloat(document.getElementById('wo-form-unit-price').value) || 0;
    const totalPrice = parseFloat(document.getElementById('wo-form-total-price').value) || (quantity * unitPrice);
    const progress = parseInt(document.getElementById('wo-form-progress').value, 10) || 0;

    const orderData = {
      id: orderId,
      clientId: client.id,
      clientName: client.company,
      clientPhone: client.whatsapp,
      clientContact: client.name,
      partName: document.getElementById('wo-form-part-name').value || "Precision Component",
      process: document.getElementById('wo-form-process').value,
      material: document.getElementById('wo-form-material').value,
      dimensions: document.getElementById('wo-form-dimensions').value || "120 x 80 x 40 mm",
      tolerance: document.getElementById('wo-form-tolerance').value,
      surfaceFinish: document.getElementById('wo-form-finish').value,
      quantity: quantity,
      unitPrice: unitPrice,
      totalPrice: totalPrice,
      depositPaid: totalPrice * 0.5,
      balanceDue: totalPrice * 0.5,
      status: document.getElementById('wo-form-status').value,
      priority: document.getElementById('wo-form-priority').value,
      machineName: document.getElementById('wo-form-machine-id').value,
      operator: "Vikram Sharma",
      dueDate: document.getElementById('wo-form-due-date').value || "2026-10-20",
      createdDate: new Date().toISOString().split('T')[0],
      cadFile: `${orderId.toLowerCase()}_cad_model.step`,
      modelPreset: orderDataPreset(document.getElementById('wo-form-process').value),
      progress: progress,
      cycleTimeMinutes: 35,
      camSoftware: "Mastercam / NX CAM",
      qcStatus: progress > 80 ? "Passed QC" : "Pending Machining",
      notes: document.getElementById('wo-form-notes').value
    };

    function orderDataPreset(proc) {
      if (proc.includes('5-Axis')) return 'turbine';
      if (proc.includes('Turn')) return 'gear';
      if (proc.includes('3D') || proc.includes('Additive')) return 'bracket';
      return 'manifold';
    }

    if (isEdit) {
      const idx = this.workOrders.findIndex(o => o.id === orderId);
      if (idx !== -1) {
        this.workOrders[idx] = { ...this.workOrders[idx], ...orderData };
      }
      this.showToast(`Work Order ${orderId} updated!`, 'success');
    } else {
      this.workOrders.unshift(orderData);
      this.showToast(`New Work Order ${orderId} created!`, 'success');
    }

    this.saveState();
    this.closeWorkOrderModal();
    this.renderWorkOrders();
    this.playSound('success');
  }

  closeWorkOrderModal() {
    const modal = document.getElementById('work-order-modal');
    if (modal) modal.classList.remove('open');
  }

  printJobTraveler(orderId) {
    const order = this.workOrders.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById('job-traveler-modal');
    const content = document.getElementById('job-traveler-print-area');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="traveler-sheet">
        <div class="traveler-header">
          <div class="traveler-logo">
            <h2>VORTEX PRECISION MACHINING & 3D STUDIO</h2>
            <p>AS9100 / ISO 9001 CERTIFIED JOB ROUTER & TRAVELER</p>
          </div>
          <div class="traveler-order-id">
            <h1>${order.id}</h1>
            <div class="traveler-qr">
              <div class="qr-mock">[QR: ${order.id}]</div>
            </div>
          </div>
        </div>

        <div class="traveler-grid-info">
          <div class="t-cell"><strong>Client:</strong> ${order.clientName}</div>
          <div class="t-cell"><strong>Date Released:</strong> ${order.createdDate}</div>
          <div class="t-cell"><strong>Part Name:</strong> ${order.partName}</div>
          <div class="t-cell"><strong>Due Date:</strong> ${order.dueDate}</div>
          <div class="t-cell"><strong>Material Spec:</strong> ${order.material}</div>
          <div class="t-cell"><strong>Batch Quantity:</strong> ${order.quantity} pcs</div>
          <div class="t-cell"><strong>Tolerance Class:</strong> ${order.tolerance}</div>
          <div class="t-cell"><strong>Assigned Machine:</strong> ${order.machineName}</div>
          <div class="t-cell"><strong>Surface Finish:</strong> ${order.surfaceFinish}</div>
          <div class="t-cell"><strong>CAM Program:</strong> ${order.gcodeFile || 'GCODE_GEN_V1.NC'}</div>
        </div>

        <div class="traveler-section-title">SHOP FLOOR ROUTING & SIGN-OFFS</div>
        <table class="traveler-ops-table">
          <thead>
            <tr>
              <th>Op #</th>
              <th>Operation Description</th>
              <th>Work Center</th>
              <th>Setup Sign</th>
              <th>Run Sign</th>
              <th>QC Lead Sign</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>10</td>
              <td>Saw cut raw stock & verify heat lot #</td>
              <td>Band Saw</td>
              <td>✓ VS</td>
              <td>✓ VS</td>
              <td>Passed</td>
            </tr>
            <tr>
              <td>20</td>
              <td>CNC Machining Op 1 (WCS G54 Datum)</td>
              <td>${order.machineName.split(' ')[0]}</td>
              <td>✓ VS</td>
              <td>In Progress</td>
              <td>Pending</td>
            </tr>
            <tr>
              <td>30</td>
              <td>CNC Machining Op 2 (Backside & deburr)</td>
              <td>${order.machineName.split(' ')[0]}</td>
              <td>—</td>
              <td>—</td>
              <td>Pending</td>
            </tr>
            <tr>
              <td>40</td>
              <td>CMM Metrology & Surface Roughness Ra</td>
              <td>QC Metrology Lab</td>
              <td>—</td>
              <td>—</td>
              <td>Pending</td>
            </tr>
            <tr>
              <td>50</td>
              <td>Surface Finishing: ${order.surfaceFinish}</td>
              <td>Finishing Bay</td>
              <td>—</td>
              <td>—</td>
              <td>Pending</td>
            </tr>
            <tr>
              <td>60</td>
              <td>VCI Protective Packaging & Shipping</td>
              <td>Shipping Bay</td>
              <td>—</td>
              <td>—</td>
              <td>Pending</td>
            </tr>
          </tbody>
        </table>

        <div class="traveler-notes-box">
          <strong>CRITICAL SHOP NOTES:</strong><br>
          ${order.notes || "Inspect critical dimensions against 2D drawing revision before removing from fixture."}
        </div>

        <div class="traveler-footer-signatures">
          <div>Machinist: ____________________</div>
          <div>QC Inspector: ____________________</div>
          <div>Shop Foreman: ____________________</div>
        </div>
      </div>
    `;

    modal.classList.add('open');
  }

  closeJobTravelerModal() {
    const modal = document.getElementById('job-traveler-modal');
    if (modal) modal.classList.remove('open');
  }

  /* -------------------------------------------------------------
     CLIENTS DIRECTORY
  ------------------------------------------------------------- */
  renderClientsDirectory() {
    const container = document.getElementById('clients-table-body');
    if (!container) return;

    container.innerHTML = '';
    this.clients.forEach(c => {
      const activeCount = this.workOrders.filter(o => o.clientId === c.id && o.status !== 'Delivered').length;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div class="client-avatar-row">
            <div class="client-avatar-badge">${c.name.split(' ').map(n=>n[0]).join('')}</div>
            <div>
              <strong>${c.company}</strong>
              <small class="text-muted">${c.name}</small>
            </div>
          </div>
        </td>
        <td><span class="badge-industry">${c.industry}</span></td>
        <td>
          <div class="contact-methods">
            <a href="https://wa.me/${c.whatsapp.replace(/[^0-9]/g, '')}" target="_blank" class="contact-wa-link">
              <i class="lucide-message-circle"></i> ${c.whatsapp}
            </a>
            <small class="text-muted">${c.email}</small>
          </div>
        </td>
        <td class="text-center font-bold">${c.totalOrders} (${activeCount} active)</td>
        <td class="font-mono font-bold">$${c.totalSpent.toLocaleString()}</td>
        <td class="font-mono ${c.outstanding > 0 ? 'text-danger font-bold' : 'text-success'}">$${c.outstanding.toLocaleString()}</td>
        <td>
          <div class="table-actions">
            <button class="btn-sm btn-wa" onclick="window.vortexApp.whatsAppManager.setActivePhone('${c.whatsapp}'); window.vortexApp.switchView('whatsapp');">
              <i class="lucide-message-circle"></i> Chat
            </button>
            <button class="btn-sm btn-outline" onclick="window.vortexApp.openNewWorkOrderForClient('${c.id}')">
              + Work Order
            </button>
          </div>
        </td>
      `;
      container.appendChild(row);
    });
  }

  openNewWorkOrderForClient(clientId) {
    this.openNewWorkOrderModal({ clientId: clientId });
  }

  setupClientHandlers() {
    const addClientBtn = document.getElementById('btn-add-client');
    if (addClientBtn) {
      addClientBtn.addEventListener('click', () => {
        const company = prompt("Enter Client Company Name:");
        if (!company) return;
        const name = prompt("Enter Contact Person Name:");
        const whatsapp = prompt("Enter WhatsApp Number (with country code, e.g. +15551234567):");
        const industry = prompt("Enter Industry (e.g. Aerospace, Robotics, Medical):") || "General Engineering";

        const newClient = {
          id: `C-${100 + this.clients.length + 1}`,
          name: name || company,
          company: company,
          email: `${company.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
          phone: whatsapp || "+1 555-000-0000",
          whatsapp: whatsapp || "+15550000000",
          industry: industry,
          taxId: "TAX-NEW",
          totalOrders: 0,
          totalSpent: 0,
          outstanding: 0,
          rating: 5,
          notes: "New client registered via CRM."
        };

        this.clients.unshift(newClient);
        this.saveState();
        this.renderClientsDirectory();
        this.whatsAppManager.renderClientList();
        this.showToast(`Client ${company} created!`, 'success');
      });
    }
  }

  /* -------------------------------------------------------------
     INVENTORY & MATERIALS VIEW
  ------------------------------------------------------------- */
  renderInventoryView() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    this.inventory.forEach(item => {
      const isLow = item.stock <= item.minThreshold;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="font-mono text-muted">${item.id}</td>
        <td><strong>${item.name}</strong></td>
        <td><span class="badge-category">${item.category}</span></td>
        <td class="font-bold ${isLow ? 'text-warning' : ''}">${item.stock} ${item.unit}</td>
        <td>${item.minThreshold} ${item.unit}</td>
        <td>
          <span class="badge-stock ${isLow ? 'badge-low' : 'badge-ok'}">
            ${isLow ? '⚠️ Low Stock Alert' : '🟢 Healthy'}
          </span>
        </td>
        <td>
          <button class="btn-sm btn-outline" onclick="window.vortexApp.restockItem('${item.id}')">Restock</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  restockItem(itemId) {
    const item = this.inventory.find(i => i.id === itemId);
    if (!item) return;
    const addQty = parseInt(prompt(`Add stock quantity for ${item.name}:`, "10"), 10);
    if (addQty && !isNaN(addQty)) {
      item.stock += addQty;
      this.renderInventoryView();
      this.showToast(`Added ${addQty} ${item.unit} to ${item.name}`, 'success');
    }
  }

  /* -------------------------------------------------------------
     ANALYTICS & FINANCIALS VIEW
  ------------------------------------------------------------- */
  renderAnalyticsView() {
    // Computes live metrics
    const totalRev = this.workOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const cncRev = this.workOrders.filter(o => o.process.includes('CNC')).reduce((sum, o) => sum + o.totalPrice, 0);
    const threeDRev = this.workOrders.filter(o => o.process.includes('3D')).reduce((sum, o) => sum + o.totalPrice, 0);

    const cncPct = totalRev > 0 ? Math.round((cncRev / totalRev) * 100) : 60;
    const threeDPct = totalRev > 0 ? Math.round((threeDRev / totalRev) * 100) : 40;

    const cncBar = document.getElementById('analytics-bar-cnc');
    const threeDBar = document.getElementById('analytics-bar-3d');
    const cncLabel = document.getElementById('analytics-label-cnc');
    const threeDLabel = document.getElementById('analytics-label-3d');

    if (cncBar) cncBar.style.width = `${cncPct}%`;
    if (threeDBar) threeDBar.style.width = `${threeDPct}%`;
    if (cncLabel) cncLabel.textContent = `CNC Machining: $${cncRev.toLocaleString()} (${cncPct}%)`;
    if (threeDLabel) threeDLabel.textContent = `3D Additive: $${threeDRev.toLocaleString()} (${threeDPct}%)`;
  }

  /* -------------------------------------------------------------
     TOAST NOTIFICATIONS
  ------------------------------------------------------------- */
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-pill toast-${type}`;

    let icon = "🔔";
    if (type === 'success') icon = "✅";
    if (type === 'warning') icon = "⚠️";
    if (type === 'info') icon = "ℹ️";

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }
}

// Global bootstrap
window.addEventListener('DOMContentLoaded', () => {
  window.vortexApp = new VortexApp();
});
