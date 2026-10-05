/**
 * Vortex CNC & 3D Studio CRM - Instant Quoting & DFM Engine
 * Calculates material volume, machining/printing hours, tooling wear,
 * surface finishes, and generates instant WhatsApp quotes or Work Orders.
 */

class VortexQuotingEngine {
  constructor(app) {
    this.app = app;
    this.init();
  }

  init() {
    this.populateMaterials();
    this.populateClientsDropdown();
    this.setupListeners();
    this.calculateQuote();
  }

  populateMaterials() {
    const select = document.getElementById('quote-material');
    if (!select) return;

    select.innerHTML = '';
    this.app.materials.forEach(mat => {
      const opt = document.createElement('option');
      opt.value = mat.id;
      opt.textContent = `${mat.name} (${mat.category})`;
      select.appendChild(opt);
    });
  }

  populateClientsDropdown() {
    const select = document.getElementById('quote-client');
    if (!select) return;

    select.innerHTML = '<option value="">-- Select Existing Client --</option>';
    this.app.clients.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.company} (${c.name})`;
      select.appendChild(opt);
    });
  }

  setupListeners() {
    const inputs = [
      'quote-process', 'quote-material', 'quote-length', 'quote-width',
      'quote-height', 'quote-quantity', 'quote-tolerance', 'quote-finish'
    ];

    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.calculateQuote());
        el.addEventListener('change', () => this.calculateQuote());
      }
    });

    const createWoBtn = document.getElementById('quote-convert-wo-btn');
    if (createWoBtn) {
      createWoBtn.addEventListener('click', () => this.convertQuoteToWorkOrder());
    }

    const sendWaBtn = document.getElementById('quote-send-wa-btn');
    if (sendWaBtn) {
      sendWaBtn.addEventListener('click', () => this.sendQuoteViaWhatsApp());
    }
  }

  calculateQuote() {
    const processEl = document.getElementById('quote-process');
    const materialEl = document.getElementById('quote-material');
    const lengthEl = document.getElementById('quote-length');
    const widthEl = document.getElementById('quote-width');
    const heightEl = document.getElementById('quote-height');
    const qtyEl = document.getElementById('quote-quantity');
    const toleranceEl = document.getElementById('quote-tolerance');
    const finishEl = document.getElementById('quote-finish');

    if (!processEl || !materialEl) return;

    const process = processEl.value;
    const matId = materialEl.value;
    const length = parseFloat(lengthEl.value) || 100;
    const width = parseFloat(widthEl.value) || 100;
    const height = parseFloat(heightEl.value) || 50;
    const quantity = parseInt(qtyEl.value, 10) || 1;
    const tolerance = toleranceEl.value;
    const finish = finishEl.value;

    const material = this.app.materials.find(m => m.id === matId) || this.app.materials[0];

    // Volume in cm3
    const boundingVolCm3 = (length * width * height) / 1000;
    // Estimated finished part volume (assume 40% solid for milled, 60% for turned, 30% for 3D printed)
    let solidRatio = 0.40;
    if (process.includes('turning') || process.includes('lathe')) solidRatio = 0.65;
    if (process.includes('3d') || process.includes('additive')) solidRatio = 0.32;

    const partVolCm3 = boundingVolCm3 * solidRatio;
    const partWeightKg = (partVolCm3 * material.density) / 1000;

    // 1. Raw material stock cost (bounding box stock + 20% clamp waste)
    const rawStockCostPerPart = boundingVolCm3 * 1.25 * material.costPerCm3;

    // 2. Machine hourly rate
    let machineRate = 85;
    let cycleMinutes = 20;

    if (process === 'cnc_5axis') {
      machineRate = 150;
      cycleMinutes = Math.max(25, boundingVolCm3 * 0.12 * (1 / material.machinability));
    } else if (process === 'cnc_turnmill') {
      machineRate = 110;
      cycleMinutes = Math.max(18, boundingVolCm3 * 0.08 * (1 / material.machinability));
    } else if (process === '3d_metal') {
      machineRate = 180;
      cycleMinutes = Math.max(90, partVolCm3 * 2.2);
    } else if (process === '3d_sls') {
      machineRate = 65;
      cycleMinutes = Math.max(45, partVolCm3 * 1.1);
    } else if (process === '3d_fdm') {
      machineRate = 35;
      cycleMinutes = Math.max(30, partVolCm3 * 0.9);
    } else {
      // 3-axis CNC
      machineRate = 85;
      cycleMinutes = Math.max(15, boundingVolCm3 * 0.09 * (1 / material.machinability));
    }

    // 3. Setup fee (fixed amortized across quantity)
    let setupFeeTotal = 150; // CAM programming, tool setup, probe WCS
    if (process === 'cnc_5axis' || process === 'cnc_turnmill') setupFeeTotal = 250;
    if (process.includes('3d')) setupFeeTotal = 60;
    const setupFeePerPart = setupFeeTotal / quantity;

    // 4. Machining run cost per part
    const machiningCostPerPart = (cycleMinutes / 60) * machineRate;

    // 5. Tolerance multiplier
    let tolMultiplier = 1.0;
    if (tolerance === 'precision') tolMultiplier = 1.18; // ±0.02mm
    if (tolerance === 'aerospace') tolMultiplier = 1.35; // ±0.008mm

    // 6. Surface finish cost
    let finishCostPerPart = 0;
    if (finish === 'bead_blast') finishCostPerPart = 12.00;
    if (finish === 'anodize_ii') finishCostPerPart = 24.00;
    if (finish === 'hard_anodize_iii') finishCostPerPart = 42.00;
    if (finish === 'electropolish') finishCostPerPart = 36.00;
    if (finish === 'vapor_smooth') finishCostPerPart = 16.00;

    // Base unit price before margin and volume discount
    let baseUnitPrice = (rawStockCostPerPart + setupFeePerPart + (machiningCostPerPart * tolMultiplier) + finishCostPerPart) * 1.25; // 25% margin

    // Volume discount brackets
    let discountPercent = 0;
    if (quantity >= 5 && quantity < 20) discountPercent = 8;
    else if (quantity >= 20 && quantity < 50) discountPercent = 15;
    else if (quantity >= 50 && quantity < 100) discountPercent = 22;
    else if (quantity >= 100) discountPercent = 30;

    const unitPrice = baseUnitPrice * (1 - (discountPercent / 100));
    const totalPrice = unitPrice * quantity;

    // Save current quote object
    this.currentQuote = {
      processName: processEl.options[processEl.selectedIndex].text,
      processCode: process,
      material: material.name,
      materialId: material.id,
      dimensions: `${length} x ${width} x ${height} mm`,
      quantity: quantity,
      tolerance: toleranceEl.options[toleranceEl.selectedIndex].text,
      finish: finishEl.options[finishEl.selectedIndex].text,
      cycleTimeMinutes: Math.round(cycleMinutes),
      unitPrice: unitPrice,
      totalPrice: totalPrice,
      breakdown: {
        rawStock: rawStockCostPerPart,
        setup: setupFeePerPart,
        machining: machiningCostPerPart,
        finish: finishCostPerPart,
        discount: discountPercent
      }
    };

    // Render to UI
    this.renderQuoteSummary(this.currentQuote);
  }

  renderQuoteSummary(q) {
    const unitPriceEl = document.getElementById('quote-summary-unit-price');
    const totalPriceEl = document.getElementById('quote-summary-total-price');
    const cycleTimeEl = document.getElementById('quote-summary-cycletime');
    const discountBadgeEl = document.getElementById('quote-discount-badge');
    const breakdownEl = document.getElementById('quote-breakdown-details');

    if (unitPriceEl) unitPriceEl.textContent = `$${q.unitPrice.toFixed(2)}`;
    if (totalPriceEl) totalPriceEl.textContent = `$${q.totalPrice.toFixed(2)}`;
    if (cycleTimeEl) cycleTimeEl.textContent = `${q.cycleTimeMinutes} mins / unit`;

    if (discountBadgeEl) {
      if (q.breakdown.discount > 0) {
        discountBadgeEl.textContent = `${q.breakdown.discount}% Vol Discount Applied`;
        discountBadgeEl.style.display = 'inline-block';
      } else {
        discountBadgeEl.style.display = 'none';
      }
    }

    if (breakdownEl) {
      breakdownEl.innerHTML = `
        <div class="quote-row"><span>Raw Billet / Stock:</span><span>$${q.breakdown.rawStock.toFixed(2)}</span></div>
        <div class="quote-row"><span>Tooling & Setup amortized:</span><span>$${q.breakdown.setup.toFixed(2)}</span></div>
        <div class="quote-row"><span>Spindle / Beam Runtime:</span><span>$${q.breakdown.machining.toFixed(2)}</span></div>
        <div class="quote-row"><span>Surface Treatment:</span><span>$${q.breakdown.finish.toFixed(2)}</span></div>
      `;
    }
  }

  convertQuoteToWorkOrder() {
    if (!this.currentQuote) return;

    const clientSelect = document.getElementById('quote-client');
    const clientId = clientSelect ? clientSelect.value : "";
    const client = this.app.clients.find(c => c.id === clientId) || this.app.clients[0];

    const partNameInput = document.getElementById('quote-part-name');
    const partName = (partNameInput && partNameInput.value.trim()) ? partNameInput.value.trim() : "Custom Precision Component";

    // Switch to Work Orders view and open modal pre-populated
    this.app.openNewWorkOrderModal({
      clientId: client.id,
      clientName: client.company,
      clientPhone: client.whatsapp,
      clientContact: client.name,
      partName: partName,
      process: this.currentQuote.processName,
      material: this.currentQuote.material,
      dimensions: this.currentQuote.dimensions,
      tolerance: this.currentQuote.tolerance,
      surfaceFinish: this.currentQuote.finish,
      quantity: this.currentQuote.quantity,
      unitPrice: this.currentQuote.unitPrice,
      totalPrice: this.currentQuote.totalPrice,
      cycleTimeMinutes: this.currentQuote.cycleTimeMinutes
    });

    this.app.showToast("Quote converted! Review and save work order.", "info");
  }

  sendQuoteViaWhatsApp() {
    if (!this.currentQuote) return;

    const clientSelect = document.getElementById('quote-client');
    const clientId = clientSelect ? clientSelect.value : "";
    const client = this.app.clients.find(c => c.id === clientId) || this.app.clients[0];

    const partNameInput = document.getElementById('quote-part-name');
    const partName = (partNameInput && partNameInput.value.trim()) ? partNameInput.value.trim() : "Custom Precision Component";

    const quoteMsg = `📋 *Vortex Official Quotation*\n\n` +
      `Client: *${client.company}* (Attn: ${client.name})\n` +
      `Part: *${partName}*\n` +
      `Process: *${this.currentQuote.processName}*\n` +
      `Material: *${this.currentQuote.material}*\n` +
      `Dimensions: *${this.currentQuote.dimensions}*\n` +
      `Tolerance: *${this.currentQuote.tolerance}*\n` +
      `Finish: *${this.currentQuote.finish}*\n` +
      `Quantity: *${this.currentQuote.quantity} units*\n\n` +
      `💰 *Unit Price*: $${this.currentQuote.unitPrice.toFixed(2)} USD\n` +
      `💵 *Total Estimate*: *$${this.currentQuote.totalPrice.toFixed(2)} USD*\n` +
      `⏱️ *Est. Lead Time*: 5 - 7 Business Days\n\n` +
      `To accept this quote, please reply *APPROVE* or send your PO to ops@vortexcnc.com.`;

    this.app.whatsAppManager.setActivePhone(client.whatsapp);
    this.app.whatsAppManager.handleSendMessage(quoteMsg, 'shop');
    this.app.whatsAppManager.showRealWhatsAppPrompt(client.whatsapp, quoteMsg);
    this.app.switchView('whatsapp');
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.VortexQuotingEngine = VortexQuotingEngine;
}
