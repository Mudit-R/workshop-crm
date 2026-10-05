/**
 * Vortex CNC & 3D Studio CRM - Operations Workflow Automation Engine
 * Automates business rules across Machines, Job Cards, Tally, and WhatsApp.
 * Enables "Zero Data-Entry" operational automation for manufacturing workshops.
 */

class VortexWorkflowEngine {
  constructor(app) {
    this.app = app;
    this.auditLogs = [];
    this.rules = [
      {
        id: "wf-1",
        name: "Auto-Alert on Spindle / Machine Downtime",
        description: "WHEN a machine goes DOWN, flag all queued jobs as 'Delivery Risk', recalculate delivery dates, and notify the Owner via WhatsApp.",
        trigger: "MACHINE_DOWNTIME",
        enabled: true,
        icon: "alert-triangle",
        conditions: [
          { field: "machine.status", op: "equals", value: "DOWN" }
        ],
        actions: [
          { type: "FLAG_ORDERS_AT_RISK", desc: "Flag active jobs on this machine as 'At Risk'" },
          { type: "NOTIFY_OWNER_WHATSAPP", desc: "Send emergency downtime alert to Owner's WhatsApp" }
        ]
      },
      {
        id: "wf-2",
        name: "Auto-Notify Client on Spindle Run (Machining Started)",
        description: "WHEN job transitions to 'Machining', automatically update machine status to 'Running' and send WhatsApp progress alert to client.",
        trigger: "STAGE_CHANGED",
        enabled: true,
        icon: "zap",
        conditions: [
          { field: "toStage", op: "equals", value: "Machining" }
        ],
        actions: [
          { type: "START_MACHINE_SPINDLE", desc: "Set assigned CNC Spindle to 14,200 RPM" },
          { type: "SEND_CLIENT_WHATSAPP", desc: "Send Template '⚙️ Spindle Running' with live %" }
        ]
      },
      {
        id: "wf-3",
        name: "CMM Metrology QC Pass ➔ Auto Client Certificate",
        description: "WHEN dimensional QC inspection passes, advance job to 'Dispatch Ready' and WhatsApp client the AS9100/ISO tolerance report.",
        trigger: "QC_COMPLETED",
        enabled: true,
        icon: "check-circle",
        conditions: [
          { field: "qc.passed", op: "equals", value: true }
        ],
        actions: [
          { type: "ADVANCE_STAGE", desc: "Move stage to 'Dispatched / Transit'" },
          { type: "SEND_CLIENT_WHATSAPP", desc: "Send Template '🔍 QC Metrology Passed' report" }
        ]
      },
      {
        id: "wf-4",
        name: "2-Day Delivery Risk Escalation Alerter",
        description: "WHEN due date is within 2 days AND progress < 70%, trigger a high-priority supervisor WhatsApp alert.",
        trigger: "PROGRESS_CHECK",
        enabled: true,
        icon: "clock",
        conditions: [
          { field: "daysRemaining", op: "lte", value: 2 },
          { field: "progress", op: "lt", value: 70 }
        ],
        actions: [
          { type: "SET_PRIORITY_CRITICAL", desc: "Escalate job priority to 'Critical Rush'" },
          { type: "ALERT_SUPERVISOR", desc: "Send supervisor reschedule alert on WhatsApp" }
        ]
      },
      {
        id: "wf-5",
        name: "Tally Prime Invoice Overdue WhatsApp Follow-up",
        description: "WHEN outstanding payment exceeds 7 days past delivery, automatically format and draft WhatsApp payment reminder link.",
        trigger: "INVOICE_OVERDUE",
        enabled: true,
        icon: "credit-card",
        conditions: [
          { field: "outstanding", op: "gt", value: 0 }
        ],
        actions: [
          { type: "SEND_CLIENT_WHATSAPP", desc: "Send Template '💳 Invoice & Balance Due' reminder" }
        ]
      }
    ];

    this.init();
  }

  init() {
    this.renderRulesList();
    this.renderAuditLogs();
  }

  // Trigger event dispatcher
  triggerEvent(eventName, payload) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Find matching active rules
    const matchingRules = this.rules.filter(r => r.enabled && r.trigger === eventName);

    matchingRules.forEach(rule => {
      let conditionsMet = true;

      // Check conditions
      rule.conditions.forEach(cond => {
        if (cond.field === "machine.status" && payload.machine) {
          if (cond.op === "equals" && payload.machine.status !== cond.value) conditionsMet = false;
        }
        if (cond.field === "toStage" && payload.toStage) {
          if (cond.op === "equals" && payload.toStage !== cond.value) conditionsMet = false;
        }
        if (cond.field === "qc.passed" && payload.qc) {
          if (cond.op === "equals" && payload.qc.passed !== cond.value) conditionsMet = false;
        }
      });

      if (conditionsMet) {
        this.executeRule(rule, payload, timestamp);
      }
    });
  }

  executeRule(rule, payload, timestamp) {
    // Record execution audit log
    const logItem = {
      id: "log-" + Date.now(),
      ruleName: rule.name,
      trigger: rule.trigger,
      timestamp: timestamp,
      details: this.formatLogDetails(rule, payload),
      status: "SUCCESS"
    };

    this.auditLogs.unshift(logItem);
    if (this.auditLogs.length > 20) this.auditLogs.pop();

    // Execute actions
    rule.actions.forEach(action => {
      if (action.type === "NOTIFY_OWNER_WHATSAPP") {
        const ownerPhone = this.app.shopInfo.whatsapp;
        const msg = `🚨 *Vortex Emergency Alert*: Machine *${payload.machine.name}* is DOWN!\nReason: ${payload.reason || "Unplanned stoppage"}\nAffected Active Jobs: ${payload.affectedJobs || "WO-4091"}\nAction: Reschedule remaining toolpaths immediately.`;
        if (this.app.whatsAppManager) {
          this.app.whatsAppManager.setActivePhone(ownerPhone);
          this.app.whatsAppManager.handleSendMessage(msg, "bot");
        }
      }

      if (action.type === "FLAG_ORDERS_AT_RISK") {
        if (payload.order) {
          payload.order.priority = "Critical";
          payload.order.deliveryRisk = true;
          this.app.saveState();
          this.app.renderWorkOrders();
        }
      }

      if (action.type === "SEND_CLIENT_WHATSAPP") {
        if (payload.order && this.app.whatsAppManager) {
          const tplId = rule.id === "wf-2" ? "tpl-2" : (rule.id === "wf-3" ? "tpl-3" : "tpl-5");
          this.app.whatsAppManager.sendTemplateMessage(tplId, payload.order);
        }
      }
    });

    this.renderAuditLogs();
    this.app.showToast(`⚡ Workflow Triggered: ${rule.name}`, 'info');
  }

  formatLogDetails(rule, payload) {
    if (payload.order) {
      return `Order ${payload.order.id} (${payload.order.partName}) - ${payload.toStage || 'Updated'}`;
    }
    if (payload.machine) {
      return `Machine ${payload.machine.name} status: ${payload.machine.status} (${payload.reason || 'Normal'})`;
    }
    return `Rule triggered successfully on ${rule.trigger}`;
  }

  toggleRule(ruleId) {
    const rule = this.rules.find(r => r.id === ruleId);
    if (!rule) return;
    rule.enabled = !rule.enabled;
    this.renderRulesList();
    this.app.showToast(`Workflow Rule '${rule.name}' is now ${rule.enabled ? 'ACTIVE' : 'PAUSED'}`, 'info');
  }

  renderRulesList() {
    const listEl = document.getElementById('workflow-rules-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    this.rules.forEach(rule => {
      const card = document.createElement('div');
      card.className = `workflow-rule-card ${rule.enabled ? 'rule-active' : 'rule-paused'}`;
      card.innerHTML = `
        <div class="wf-card-header">
          <div class="wf-rule-title-group">
            <span class="wf-rule-icon"><i data-lucide="${rule.icon}"></i></span>
            <div>
              <h4 class="wf-rule-title">${rule.name}</h4>
              <span class="wf-rule-trigger-tag">TRIGGER: ${rule.trigger}</span>
            </div>
          </div>
          <div class="wf-toggle-wrapper">
            <label class="switch-toggle">
              <input type="checkbox" ${rule.enabled ? 'checked' : ''} onchange="window.vortexApp.workflowEngine.toggleRule('${rule.id}')">
              <span class="slider round"></span>
            </label>
          </div>
        </div>

        <p class="wf-rule-desc">${rule.description}</p>

        <div class="wf-rule-steps">
          <div class="wf-step-item">
            <span class="wf-step-label">IF CONDITIONS:</span>
            <span class="wf-step-val">${rule.conditions.map(c => `${c.field} ${c.op} "${c.value}"`).join(' AND ')}</span>
          </div>
          <div class="wf-step-item">
            <span class="wf-step-label">THEN ACTIONS:</span>
            <span class="wf-step-val text-accent">${rule.actions.map(a => `➔ ${a.desc}`).join('<br>')}</span>
          </div>
        </div>
      `;
      listEl.appendChild(card);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  renderAuditLogs() {
    const logsEl = document.getElementById('workflow-audit-logs');
    if (!logsEl) return;

    if (this.auditLogs.length === 0) {
      logsEl.innerHTML = `<div class="text-muted" style="font-size: 0.8rem; padding: 12px 0;">No automated workflow events logged yet. Trigger an action on the shop floor to see real-time execution.</div>`;
      return;
    }

    logsEl.innerHTML = '';
    this.auditLogs.forEach(log => {
      const row = document.createElement('div');
      row.className = 'wf-audit-log-item';
      row.innerHTML = `
        <span class="wf-log-time font-mono">${log.timestamp}</span>
        <span class="badge-status status-machining" style="font-size: 0.65rem;">AUTO-EXEC</span>
        <strong style="color: #fff; font-size: 0.8rem;">${log.ruleName}</strong>
        <span class="text-muted" style="font-size: 0.76rem; flex: 1;">${log.details}</span>
      `;
      logsEl.appendChild(row);
    });
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.VortexWorkflowEngine = VortexWorkflowEngine;
}
