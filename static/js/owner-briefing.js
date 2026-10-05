/**
 * Vortex CNC & 3D Studio CRM - Owner 8:30 AM WhatsApp Briefing & Tally Prime Bridge
 * Generates proactive executive WhatsApp briefs and exports Tally Prime Job Work XML.
 */

class VortexOwnerBriefingManager {
  constructor(app) {
    this.app = app;
    this.currency = "INR"; // 'INR' or 'USD'
    this.init();
  }

  init() {
    this.renderOwnerBriefing();
    this.renderTallyBridge();
  }

  setCurrency(cur) {
    this.currency = cur;
    this.renderOwnerBriefing();
    this.renderTallyBridge();
    this.app.renderWorkOrders();
    this.app.updateDashboardCounters();
  }

  generateBriefingText() {
    const totalJobs = this.app.workOrders.length;
    const activeJobs = this.app.workOrders.filter(o => o.status !== 'Delivered');
    const atRisk = this.app.workOrders.filter(o => o.priority === 'Critical' || o.deliveryRisk || (o.progress < 50 && o.status === 'Machining'));
    const delayed = this.app.workOrders.filter(o => new Date(o.dueDate) < new Date() && o.status !== 'Delivered');
    const onSchedule = activeJobs.length - atRisk.length - delayed.length;

    const runningMachines = this.app.machines.filter(m => m.status === 'Running').length;
    const totalMachines = this.app.machines.length;
    const uptimePct = Math.round((runningMachines / totalMachines) * 100);

    const totalReceivables = this.app.workOrders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);
    const currSymbol = this.currency === "INR" ? "₹" : "$";
    const currMultiplier = this.currency === "INR" ? 83 : 1;

    const todayDate = new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });

    let brief = `🌅 *Good morning! Here's your 8:30 AM Workshop Briefing (${todayDate})*\n\n` +
      `📊 *Job Status Overview*:\n` +
      `🟢 *${Math.max(0, onSchedule)} Jobs* on schedule\n` +
      `🟡 *${atRisk.length} Jobs* at risk\n` +
      `🔴 *${delayed.length} Jobs* delayed past delivery date\n\n` +
      `⚙️ *Shop Floor Fleet Status*:\n` +
      `• Active Spindles: *${runningMachines} of ${totalMachines} Machines (${uptimePct}% utilization)*\n` +
      `• Maintenance Alarms: ${this.app.machines.filter(m => m.status === 'Maintenance').map(m => m.name).join(', ') || 'Zero unplanned downtime'}\n\n` +
      `⚠️ *Critical Issues Requiring Attention*:\n` +
      (atRisk.length > 0
        ? atRisk.map(o => `• *${o.id}* (${o.partName}): ${o.progress}% complete. Due: ${o.dueDate}. Reason: Machine bottleneck / QC check.`).join('\n')
        : `• All critical toolpaths running within tolerance.\n`) +
      `\n💰 *Receivables & Tally Ledger*:\n` +
      `• Outstanding Billed: *${currSymbol}${(totalReceivables * currMultiplier).toLocaleString('en-IN')}*\n` +
      `• Accounts to follow up: AeroTech Dynamics, NeuroMotion BioMed\n\n` +
      `Have a high-precision day! Text *STATUS* or *MACHINES* for live telemetry.`;

    return brief;
  }

  renderOwnerBriefing() {
    const textEl = document.getElementById('owner-briefing-preview');
    if (!textEl) return;

    const text = this.generateBriefingText();
    textEl.textContent = text;

    const waLink = document.getElementById('owner-briefing-wa-link');
    if (waLink) {
      const ownerPhone = (this.app.shopInfo.whatsapp || "+919825000000").replace(/[^0-9]/g, '');
      waLink.href = `https://wa.me/${ownerPhone}?text=${encodeURIComponent(text)}`;
      waLink.target = "_blank";
    }
  }

  sendBriefingToOwnerWhatsApp() {
    const text = this.generateBriefingText();
    const ownerPhone = this.app.shopInfo.whatsapp || "+919825000000";

    if (this.app.whatsAppManager) {
      this.app.whatsAppManager.setActivePhone(ownerPhone);
      this.app.whatsAppManager.handleSendMessage(text, "bot");
    }

    const cleanPhone = ownerPhone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');

    this.app.showToast("8:30 AM Briefing sent to Owner WhatsApp!", "success");
  }

  /* -------------------------------------------------------------
     TALLY PRIME INTEGRATION & XML GENERATOR
  ------------------------------------------------------------- */
  renderTallyBridge() {
    const listEl = document.getElementById('tally-orders-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    const currSymbol = this.currency === "INR" ? "₹" : "$";
    const currMultiplier = this.currency === "INR" ? 83 : 1;

    this.app.workOrders.forEach(order => {
      const row = document.createElement('tr');
      const gstAmount = (order.totalPrice * currMultiplier * 0.18);
      const totalWithGst = (order.totalPrice * currMultiplier) + gstAmount;

      row.innerHTML = `
        <td class="font-mono text-accent"><strong>${order.id}</strong></td>
        <td>${order.clientName}</td>
        <td>${order.partName}</td>
        <td><span class="badge-process">HSN: 9988 (Job Work)</span></td>
        <td class="font-mono">${currSymbol}${(order.totalPrice * currMultiplier).toLocaleString('en-IN')}</td>
        <td class="font-mono text-muted">18% (${currSymbol}${gstAmount.toLocaleString('en-IN')})</td>
        <td class="font-mono font-bold">${currSymbol}${totalWithGst.toLocaleString('en-IN')}</td>
        <td>
          <button class="btn-sm btn-outline" onclick="window.vortexApp.ownerBriefing.exportTallyXml('${order.id}')" title="Export XML for Tally Prime">
            <i data-lucide="download"></i> Tally XML
          </button>
        </td>
      `;
      listEl.appendChild(row);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  generateTallyXml(order) {
    const currMultiplier = this.currency === "INR" ? 83 : 1;
    const baseAmount = (order.totalPrice * currMultiplier).toFixed(2);
    const cgst = (baseAmount * 0.09).toFixed(2);
    const sgst = (baseAmount * 0.09).toFixed(2);
    const totalAmount = (parseFloat(baseAmount) + parseFloat(cgst) + parseFloat(sgst)).toFixed(2);

    return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Job Work In Order" ACTION="Create">
            <DATE>${order.createdDate.replace(/-/g, '')}</DATE>
            <VOUCHERTYPENAME>Job Work In Order</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${order.id}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${order.clientName}</PARTYLEDGERNAME>
            <BASICBUYERNAME>${order.clientName}</BASICBUYERNAME>
            <STATENAME>Gujarat</STATENAME>
            <COUNTRYOFRESIDENCE>India</COUNTRYOFRESIDENCE>
            <PLACEOFSUPPLY>Gujarat (24)</PLACEOFSUPPLY>
            <NARRATION>VORTEX OS JOB WORK: ${order.partName} (${order.process}) - Material: ${order.material}</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${order.clientName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${totalAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>CNC Machining &amp; 3D Job Work Charges</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${baseAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output CGST @ 9%</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${cgst}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output SGST @ 9%</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${sgst}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
  }

  exportTallyXml(orderId) {
    const order = this.app.workOrders.find(o => o.id === orderId);
    if (!order) return;

    const xml = this.generateTallyXml(order);
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TALLY_JOB_ORDER_${order.id}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.app.showToast(`Exported Tally Prime XML for ${order.id}!`, "success");
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.VortexOwnerBriefingManager = VortexOwnerBriefingManager;
}
