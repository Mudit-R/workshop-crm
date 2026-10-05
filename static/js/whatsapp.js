/**
 * Vortex CNC & 3D Studio CRM - WhatsApp Business Integration Hub
 * Handles 2-way client communication, automated CNC bot dispatch,
 * real 'wa.me' click-to-chat links, and Meta Cloud API webhook simulation.
 */

class VortexWhatsAppManager {
  constructor(app) {
    this.app = app;
    this.activePhone = "+15550192831";
    this.chatData = JSON.parse(JSON.stringify(window.VORTEX_INITIAL_DATA.whatsappChatHistory));
    this.templates = window.VORTEX_INITIAL_DATA.whatsappTemplates;
    this.cloudApiConfig = {
      phoneNumberId: "109842109841203",
      wabaId: "891230491823901",
      accessToken: "EAAG...MOCK_SECURE_TOKEN",
      verifyToken: "vortex_cnc_secure_2026",
      webhookUrl: "http://localhost:8000/api/whatsapp/webhook",
      autoBotEnabled: true
    };
    this.init();
  }

  init() {
    this.renderClientList();
    this.renderActiveConversation();
    this.setupEventListeners();
  }

  setupEventListeners() {
    const sendBtn = document.getElementById('wa-send-btn');
    const inputEl = document.getElementById('wa-message-input');

    if (sendBtn && inputEl) {
      sendBtn.addEventListener('click', () => this.handleSendMessage());
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });
    }

    // Quick client test simulator triggers
    const simInboundBtn = document.getElementById('wa-simulate-inbound-btn');
    if (simInboundBtn) {
      simInboundBtn.addEventListener('click', () => this.simulateClientMessage());
    }
  }

  setActivePhone(phone) {
    this.activePhone = phone;
    this.renderClientList();
    this.renderActiveConversation();
  }

  getActiveClient() {
    return this.app.clients.find(c => c.whatsapp === this.activePhone) || {
      name: "Client",
      company: "Manufacturing Partner",
      whatsapp: this.activePhone
    };
  }

  renderClientList() {
    const listEl = document.getElementById('wa-client-threads');
    if (!listEl) return;

    listEl.innerHTML = '';
    this.app.clients.forEach(client => {
      const msgs = this.chatData[client.whatsapp] || [];
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : { text: "No recent messages", timestamp: "" };
      const isActive = client.whatsapp === this.activePhone;

      const item = document.createElement('div');
      item.className = `wa-contact-item ${isActive ? 'active' : ''}`;
      item.onclick = () => this.setActivePhone(client.whatsapp);

      item.innerHTML = `
        <div class="wa-contact-avatar">
          <span>${client.name.split(' ').map(n=>n[0]).join('')}</span>
          <span class="wa-status-dot online"></span>
        </div>
        <div class="wa-contact-info">
          <div class="wa-contact-top">
            <h4 class="wa-contact-name">${client.company}</h4>
            <span class="wa-contact-time">${lastMsg.timestamp || ''}</span>
          </div>
          <p class="wa-contact-preview">${lastMsg.text.replace(/\n/g, ' ').substring(0, 42)}...</p>
        </div>
      `;
      listEl.appendChild(item);
    });
  }

  renderActiveConversation() {
    const container = document.getElementById('wa-messages-container');
    const headerTitle = document.getElementById('wa-header-client-name');
    const headerSub = document.getElementById('wa-header-client-sub');
    const headerWaLink = document.getElementById('wa-header-direct-link');

    const client = this.getActiveClient();

    if (headerTitle) headerTitle.textContent = `${client.company} (${client.name})`;
    if (headerSub) headerSub.textContent = `WhatsApp: ${client.whatsapp} • Verified Client`;
    if (headerWaLink) {
      headerWaLink.href = `https://wa.me/${client.whatsapp.replace(/[^0-9]/g, '')}`;
      headerWaLink.target = "_blank";
    }

    if (!container) return;
    container.innerHTML = '';

    const msgs = this.chatData[this.activePhone] || [];

    if (msgs.length === 0) {
      container.innerHTML = `
        <div class="wa-empty-chat">
          <i class="lucide-message-square"></i>
          <p>No messages yet with ${client.company}. Choose a quick action template below or type a message.</p>
        </div>
      `;
      return;
    }

    msgs.forEach(msg => {
      const bubble = document.createElement('div');
      bubble.className = `wa-message-bubble wa-bubble-${msg.sender}`;

      let senderLabel = "";
      if (msg.sender === 'client') senderLabel = `<span class="wa-bubble-author">${client.name}</span>`;
      else if (msg.sender === 'bot') senderLabel = `<span class="wa-bubble-author bot">🤖 Vortex Auto-Bot</span>`;
      else senderLabel = `<span class="wa-bubble-author shop">🏭 Shop Admin</span>`;

      // Format markdown/whatsapp bolding (*bold*)
      let formattedText = msg.text
        .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

      bubble.innerHTML = `
        ${senderLabel}
        <div class="wa-bubble-text">${formattedText}</div>
        <div class="wa-bubble-footer">
          <span class="wa-bubble-time">${msg.timestamp}</span>
          ${msg.sender !== 'client' ? '<span class="wa-check-marks">✓✓</span>' : ''}
        </div>
      `;
      container.appendChild(bubble);
    });

    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  handleSendMessage(customText = null, senderType = 'shop') {
    const inputEl = document.getElementById('wa-message-input');
    const text = customText || (inputEl ? inputEl.value.trim() : '');

    if (!text) return;

    if (!this.chatData[this.activePhone]) {
      this.chatData[this.activePhone] = [];
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg = {
      id: "msg-" + Date.now(),
      sender: senderType,
      text: text,
      timestamp: timeStr,
      date: "Today"
    };

    this.chatData[this.activePhone].push(newMsg);

    if (inputEl && !customText) {
      inputEl.value = '';
    }

    this.renderActiveConversation();
    this.renderClientList();

    // Trigger sound if available
    this.app.playSound('send');

    // Notify user toast
    this.app.showToast(`WhatsApp message dispatched to ${this.activePhone}`, 'success');
  }

  simulateClientMessage(inboundText = null) {
    const client = this.getActiveClient();
    const sampleInbound = [
      `STATUS WO-4091`,
      `Hi team, what's the latest update on our 5-axis parts?`,
      `Can you quote 50x in Aluminum 6061-T6?`,
      `INVOICE`,
      `STATUS WO-4092`
    ];

    const text = inboundText || sampleInbound[Math.floor(Math.random() * sampleInbound.length)];

    if (!this.chatData[this.activePhone]) {
      this.chatData[this.activePhone] = [];
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    this.chatData[this.activePhone].push({
      id: "msg-" + Date.now(),
      sender: 'client',
      text: text,
      timestamp: timeStr,
      date: "Today"
    });

    this.renderActiveConversation();
    this.renderClientList();
    this.app.playSound('receive');

    // If bot enabled, process auto-reply after 800ms
    if (this.cloudApiConfig.autoBotEnabled) {
      setTimeout(() => {
        this.processBotAutoReply(text, client);
      }, 900);
    }
  }

  processBotAutoReply(userMessage, client) {
    const textUpper = userMessage.toUpperCase();
    let botReply = "";

    // 1. Status query
    if (textUpper.includes("STATUS")) {
      // Find order ID like WO-4091 or search client's latest order
      const match = textUpper.match(/WO-\d+/);
      let order = null;
      if (match) {
        order = this.app.workOrders.find(o => o.id.toUpperCase() === match[0]);
      }
      if (!order) {
        order = this.app.workOrders.find(o => o.clientPhone === client.whatsapp);
      }

      if (order) {
        botReply = `🤖 *Vortex CNC Bot Telemetry*:\n\n` +
          `📦 *Job*: ${order.id} - ${order.partName}\n` +
          `🏭 *Process*: ${order.process}\n` +
          `⚙️ *Machine*: ${order.machineName}\n` +
          `📊 *Progress*: ${order.progress}% [${'█'.repeat(Math.floor(order.progress/10))}${'░'.repeat(10 - Math.floor(order.progress/10))}]\n` +
          `🚦 *Current Stage*: *${order.status.toUpperCase()}*\n` +
          `📅 *Est. Completion*: ${order.dueDate}\n` +
          `🔍 *QC Notes*: ${order.qcStatus}\n\n` +
          `Reply *OPERATOR* to speak with the shop floor supervisor.`;
      } else {
        botReply = `🤖 *Vortex CNC Bot*: Could not find an active work order matching your query. Please provide your order ID (e.g. *STATUS WO-4091*).`;
      }
    }
    // 2. Quote request
    else if (textUpper.includes("QUOTE")) {
      botReply = `🤖 *Vortex Instant DFM Bot*:\n\n` +
        `We'd love to machine your parts! For an instant quote:\n` +
        `1. Send your 3D CAD (.STEP / .STL) file to ops@vortexcnc.com\n` +
        `2. Or text: *QUOTE [Material] [Quantity] [Length]x[Width]x[Height]mm*\n\n` +
        `Example: *QUOTE Al6061 50pcs 120x80x40mm*`;
    }
    // 3. Invoice query
    else if (textUpper.includes("INVOICE") || textUpper.includes("PAY") || textUpper.includes("BILL")) {
      const orders = this.app.workOrders.filter(o => o.clientPhone === client.whatsapp);
      const totalBalance = orders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);

      botReply = `💳 *Vortex Billing Desk*:\n\n` +
        `Account: *${client.company}*\n` +
        `Outstanding Balance: *$${totalBalance.toFixed(2)} USD*\n\n` +
        `Active Orders:\n` +
        orders.map(o => `• ${o.id} (${o.partName}): Balance $${o.balanceDue.toFixed(2)}`).join('\n') +
        `\n\nDirect Stripe/Wire Payment Link: https://vortexcnc.com/pay/${client.id}`;
    }
    // 4. Operator / Human Escalation
    else if (textUpper.includes("OPERATOR") || textUpper.includes("HUMAN") || textUpper.includes("TALK")) {
      botReply = `👨‍🔧 *Shop Floor Alert*: We have alerted Vikram Sharma (Lead CNC Machinist & Shop Foreman). He will reply directly on this WhatsApp line within 10 minutes.`;
    }
    // 5. Default welcoming response
    else {
      botReply = `*Workshop Auto-Reply*: Thank you for contacting Vortex Precision CNC & 3D Studio!\n\n` +
        `Quick Commands:\n` +
        `• Type *STATUS* to check your live machining order\n` +
        `• Type *QUOTE* to estimate machining or 3D printing costs\n` +
        `• Type *INVOICE* to review billing and receipts\n` +
        `• Type *OPERATOR* for technician support`;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    this.chatData[this.activePhone].push({
      id: "msg-" + Date.now(),
      sender: 'bot',
      text: botReply,
      timestamp: timeStr,
      date: "Today"
    });

    this.renderActiveConversation();
    this.renderClientList();
    this.app.playSound('receive');
  }

  sendTemplateMessage(templateId, order) {
    const tpl = this.templates.find(t => t.id === templateId);
    if (!tpl) return;

    const client = this.app.clients.find(c => c.id === order.clientId) || {
      name: order.clientContact || order.clientName,
      whatsapp: order.clientPhone
    };

    let text = tpl.text
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

    this.setActivePhone(client.whatsapp || order.clientPhone);
    this.handleSendMessage(text, 'shop');

    // Also open real WhatsApp option
    this.showRealWhatsAppPrompt(client.whatsapp || order.clientPhone, text);
  }

  getDirectWhatsAppUrl(phone, message) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedMsg = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
  }

  showRealWhatsAppPrompt(phone, message) {
    const directUrl = this.getDirectWhatsAppUrl(phone, message);
    const modalEl = document.getElementById('real-wa-modal');
    const linkEl = document.getElementById('real-wa-btn-link');
    const previewEl = document.getElementById('real-wa-preview-text');

    if (modalEl && linkEl && previewEl) {
      previewEl.textContent = message;
      linkEl.href = directUrl;
      modalEl.classList.add('open');
    }
  }

  closeRealWhatsAppModal() {
    const modalEl = document.getElementById('real-wa-modal');
    if (modalEl) modalEl.classList.remove('open');
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.VortexWhatsAppManager = VortexWhatsAppManager;
}
