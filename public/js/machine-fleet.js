/**
 * Vortex CNC & 3D Studio CRM - Machine Fleet & Shop Floor Monitor
 * Live telemetry tracking of CNC Mills, Lathes, and 3D Printers.
 */

class VortexMachineFleet {
  constructor(app) {
    this.app = app;
    this.machines = this.app.machines;
    this.init();
  }

  init() {
    this.renderFleetGrid();
    this.updateShopFloorStats();
  }

  renderFleetGrid() {
    const grid = document.getElementById('machines-grid-container');
    if (!grid) return;

    grid.innerHTML = '';
    this.machines.forEach(m => {
      const isRunning = m.status === 'Running';
      const isSetup = m.status === 'Setup';
      const isIdle = m.status === 'Idle';

      let statusClass = 'status-running';
      if (isSetup) statusClass = 'status-setup';
      if (isIdle) statusClass = 'status-idle';
      if (m.status === 'Maintenance') statusClass = 'status-maint';

      const card = document.createElement('div');
      card.className = `machine-card ${statusClass}`;
      card.innerHTML = `
        <div class="machine-card-header">
          <div class="machine-info-top">
            <span class="machine-brand">${m.brand}</span>
            <h3 class="machine-title">${m.name}</h3>
            <span class="machine-type-tag">${m.type}</span>
          </div>
          <div class="machine-status-badge ${statusClass}">
            <span class="status-pulse"></span>
            ${m.status}
          </div>
        </div>

        <div class="machine-job-banner">
          <div class="job-label">ACTIVE JOB:</div>
          <div class="job-name">${m.currentJob}</div>
        </div>

        <div class="machine-telemetry-grid">
          <div class="tele-item">
            <span class="tele-label">Spindle / Power</span>
            <span class="tele-value highlight">${m.spindleRpm > 0 ? m.spindleRpm.toLocaleString() + ' RPM' : (m.feedRate || 'Active')}</span>
          </div>
          <div class="tele-item">
            <span class="tele-label">Spindle Load</span>
            <span class="tele-value">${m.spindleLoad}</span>
          </div>
          <div class="tele-item">
            <span class="tele-label">Current Tool</span>
            <span class="tele-value font-mono">${m.currentTool}</span>
          </div>
          <div class="tele-item">
            <span class="tele-label">Coolant / Gas</span>
            <span class="tele-value">${m.coolantPressure}</span>
          </div>
        </div>

        <div class="machine-footer">
          <div class="operator-tag">
            <i class="lucide-user"></i>
            <span>${m.operator}</span>
          </div>
          <div class="machine-actions" style="display: flex; gap: 6px; align-items: center;">
            <select class="machine-status-select form-control" style="width: auto; padding: 3px 6px; font-size: 11px;" onchange="window.vortexApp.machineFleet.changeMachineStatus('${m.id}', this.value)">
              <option value="Running" ${m.status === 'Running' ? 'selected' : ''}>🟢 Running</option>
              <option value="Setup" ${m.status === 'Setup' ? 'selected' : ''}>🟡 Setup</option>
              <option value="Idle" ${m.status === 'Idle' ? 'selected' : ''}>🔵 Idle</option>
              <option value="Maintenance" ${m.status === 'Maintenance' ? 'selected' : ''}>🔴 Maintenance</option>
            </select>
            <button class="btn-odoo-wa" style="padding: 4px 8px; font-size: 11px;" onclick="window.vortexApp.machineFleet.sendMachineAlertWhatsApp('${m.id}')" title="Alert Maintenance via WhatsApp">
              💬 Alert
            </button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  sendMachineAlertWhatsApp(machineId) {
    const machine = this.machines.find(m => m.id === machineId);
    if (!machine) return;

    const ownerPhone = (this.app.shopInfo.whatsapp || "+919825019283").replace(/[^0-9]/g, '');
    const alertMsg = `⚠️ *Work Center Telemetry Alert*\n\n` +
      `Machine: *${machine.name}* (${machine.brand} ${machine.type})\n` +
      `Status: *${machine.status.toUpperCase()}*\n` +
      `Active Job: *${machine.currentJob}*\n` +
      `Operator: *${machine.operator}*\n` +
      `Spindle: ${machine.spindleRpm} RPM | Load: ${machine.spindleLoad}\n` +
      `Coolant/Hydraulics: ${machine.coolantPressure}\n\n` +
      `Please check the spindle or reassign pending work orders.`;

    if (this.app.whatsAppManager) {
      this.app.whatsAppManager.setActivePhone(this.app.shopInfo.whatsapp || "+919825019283");
      this.app.whatsAppManager.handleSendMessage(alertMsg, 'shop');
    }

    const url = `https://wa.me/${ownerPhone}?text=${encodeURIComponent(alertMsg)}`;
    window.open(url, '_blank');
    this.app.showToast(`Maintenance alert sent for ${machine.name}!`, 'info');
  }

  changeMachineStatus(machineId, newStatus) {
    const machine = this.machines.find(m => m.id === machineId);
    if (!machine) return;

    machine.status = newStatus;
    if (newStatus === 'Running') {
      machine.spindleRpm = machine.spindleMaxRpm > 0 ? Math.round(machine.spindleMaxRpm * 0.7) : 0;
      machine.spindleLoad = "65%";
    } else if (newStatus === 'Idle' || newStatus === 'Maintenance') {
      machine.spindleRpm = 0;
      machine.spindleLoad = "0%";
    }

    this.renderFleetGrid();
    this.updateShopFloorStats();
    this.app.saveState();
    this.app.showToast(`${machine.name} status updated to ${newStatus}`, 'info');
  }

  updateShopFloorStats() {
    const total = this.machines.length;
    const running = this.machines.filter(m => m.status === 'Running').length;
    const setup = this.machines.filter(m => m.status === 'Setup').length;
    const idle = this.machines.filter(m => m.status === 'Idle').length;

    const utilization = Math.round(((running + (setup * 0.5)) / total) * 100);

    const utilEl = document.getElementById('shop-utilization-val');
    const runningEl = document.getElementById('shop-running-count');
    const idleEl = document.getElementById('shop-idle-count');

    if (utilEl) utilEl.textContent = `${utilization}%`;
    if (runningEl) runningEl.textContent = `${running} of ${total} Active`;
    if (idleEl) idleEl.textContent = `${idle} Idle`;
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.VortexMachineFleet = VortexMachineFleet;
}
