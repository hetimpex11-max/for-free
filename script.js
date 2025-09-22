// Invoice App - Complete Solution with Better Calculations and PDF
class InvoiceApp {
    constructor() {
        // Initialize data structure
        this.data = {
            invoices: [],
            clients: [],
            settings: {
                profile: {
                    name: '',
                    email: '',
                    phone: '',
                    address: '',
                    gst: ''
                },
                payment: {
                    upi: '',
                    bank: '',
                    account: '',
                    ifsc: ''
                },
                invoice: {
                    currency: '₹',
                    taxRate: 18,
                    prefix: 'INV-',
                    paymentTerms: 30,
                    nextNumber: 1
                },
                app: {
                    darkMode: false
                }
            }
        };
        
        this.currentInvoice = {
            lineItems: [],
            subtotal: 0,
            taxAmount: 0,
            discountAmount: 0,
            total: 0
        };
        
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        this.init();
    }

    init() {
        // Load data from localStorage
        this.loadData();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize UI
        this.updateDashboard();
        this.renderInvoices();
        this.renderClients();
        
        // Apply saved settings
        this.applySettings();
        
        // Show dashboard
        this.navigateTo('dashboard');
    }

    // Data Management
    loadData() {
        try {
            // Load from localStorage
            const savedData = localStorage.getItem('invoiceAppData');
            if (savedData) {
                const parsed = JSON.parse(savedData);
                // Merge with default data structure
                this.data = { ...this.data, ...parsed };
                
                // Ensure arrays exist
                if (!Array.isArray(this.data.invoices)) this.data.invoices = [];
                if (!Array.isArray(this.data.clients)) this.data.clients = [];
                
                console.log('Data loaded successfully:', this.data);
            } else {
                console.log('No saved data found, using defaults');
                // Save initial data
                this.saveData();
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.showToast('Error loading saved data', 'error');
        }
    }

    saveData() {
        try {
            localStorage.setItem('invoiceAppData', JSON.stringify(this.data));
            console.log('Data saved successfully');
        } catch (error) {
            console.error('Error saving data:', error);
            this.showToast('Error saving data', 'error');
        }
    }

    // Navigation
    navigateTo(page) {
        // Update page visibility
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`${page}-page`)?.classList.add('active');
        
        // Update navigation
        document.querySelectorAll('.mobile-nav-item, .sidebar-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });
        
        // Refresh content based on page
        if (page === 'dashboard') this.updateDashboard();
        if (page === 'invoices') this.renderInvoices();
        if (page === 'clients') this.renderClients();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                if (page === 'new-invoice') {
                    this.showNewInvoice();
                } else {
                    this.navigateTo(page);
                }
            });
        });
        
        // Forms
        document.getElementById('invoiceForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createInvoice();
        });
        
        document.getElementById('clientForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createClient();
        });
        
        // Search
        document.getElementById('invoiceSearch')?.addEventListener('input', (e) => {
            this.filterInvoices(e.target.value);
        });
        
        document.getElementById('clientSearch')?.addEventListener('input', (e) => {
            this.filterClients(e.target.value);
        });
        
        // Filter
        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.filterInvoicesByStatus(e.target.value);
        });
    }

    // Dashboard
    updateDashboard() {
        const stats = this.calculateStats();
        
        // Update stat cards
        document.getElementById('totalRevenue').textContent = this.formatCurrency(stats.totalRevenue);
        document.getElementById('revenueChange').textContent = `+${stats.revenueGrowth}%`;
        document.getElementById('paidCount').textContent = stats.paidCount;
        document.getElementById('paidAmount').textContent = this.formatCurrency(stats.paidAmount);
        document.getElementById('pendingCount').textContent = stats.pendingCount;
        document.getElementById('pendingAmount').textContent = this.formatCurrency(stats.pendingAmount);
        document.getElementById('clientCount').textContent = this.data.clients.length;
        
        // Recent invoices
        this.renderRecentInvoices();
    }

    calculateStats() {
        const invoices = this.data.invoices || [];
        const now = new Date();
        const thisMonth = now.getMonth();
        const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
        
        let stats = {
            totalRevenue: 0,
            paidCount: 0,
            paidAmount: 0,
            pendingCount: 0,
            pendingAmount: 0,
            thisMonthRevenue: 0,
            lastMonthRevenue: 0,
            revenueGrowth: 0
        };
        
        invoices.forEach(invoice => {
            const amount = parseFloat(invoice.total) || 0;
            const invoiceDate = new Date(invoice.date);
            const invoiceMonth = invoiceDate.getMonth();
            
            if (invoice.status === 'paid') {
                stats.totalRevenue += amount;
                stats.paidCount++;
                stats.paidAmount += amount;
                
                if (invoiceMonth === thisMonth) {
                    stats.thisMonthRevenue += amount;
                } else if (invoiceMonth === lastMonth) {
                    stats.lastMonthRevenue += amount;
                }
            } else if (invoice.status === 'pending' || invoice.status === 'sent') {
                stats.pendingCount++;
                stats.pendingAmount += amount;
            }
        });
        
        // Calculate growth
        if (stats.lastMonthRevenue > 0) {
            stats.revenueGrowth = Math.round(((stats.thisMonthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100);
        }
        
        return stats;
    }

    renderRecentInvoices() {
        const container = document.getElementById('recentInvoices');
        if (!container) return;
        
        const recentInvoices = this.data.invoices.slice(-5).reverse();
        
        if (recentInvoices.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📄</div>
                    <div class="empty-title">No invoices yet</div>
                    <div class="empty-text">Create your first invoice to get started</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = recentInvoices.map(invoice => this.createInvoiceHTML(invoice)).join('');
    }

    // Invoices
    renderInvoices() {
        const container = document.getElementById('invoiceList');
        if (!container) return;
        
        if (this.data.invoices.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📄</div>
                    <div class="empty-title">No invoices yet</div>
                    <div class="empty-text">Create your first invoice to get started</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.data.invoices.map(invoice => this.createInvoiceHTML(invoice)).join('');
    }

    createInvoiceHTML(invoice) {
        const client = this.data.clients.find(c => c.id === invoice.clientId);
        return `
            <div class="invoice-item" onclick="app.viewInvoice('${invoice.id}')">
                <div class="invoice-info">
                    <div class="invoice-number">#${invoice.number}</div>
                    <div class="invoice-client">${client ? client.name : 'Unknown Client'}</div>
                    <div class="invoice-date">${this.formatDate(invoice.date)}</div>
                </div>
                <div class="invoice-amount">
                    <div class="amount-value">${this.formatCurrency(invoice.total)}</div>
                    <span class="invoice-status status-${invoice.status}">${invoice.status}</span>
                </div>
            </div>
        `;
    }

    showNewInvoice() {
        // Reset form
        this.currentInvoice = {
            lineItems: [],
            subtotal: 0,
            taxAmount: 0,
            discountAmount: 0,
            total: 0
        };
        
        // Generate invoice number
        const invoiceNumber = `${this.data.settings.invoice.prefix}${String(this.data.settings.invoice.nextNumber).padStart(4, '0')}`;
        document.getElementById('invoiceNumber').value = invoiceNumber;
        
        // Set dates
        const today = new Date();
        const dueDate = new Date(today.getTime() + (this.data.settings.invoice.paymentTerms * 24 * 60 * 60 * 1000));
        
        document.getElementById('invoiceDate').valueAsDate = today;
        document.getElementById('invoiceDueDate').valueAsDate = dueDate;
        
        // Load clients
        const clientSelect = document.getElementById('invoiceClient');
        clientSelect.innerHTML = '<option value="">Select Client</option>' +
            this.data.clients.map(client => `<option value="${client.id}">${client.name}</option>`).join('');
        
        // Set tax rate
        document.getElementById('taxPercent').value = this.data.settings.invoice.taxRate;
        document.getElementById('taxRateDisplay').textContent = this.data.settings.invoice.taxRate;
        
        // Clear line items
        document.getElementById('lineItems').innerHTML = '';
        this.addLineItem();
        
        // Reset calculations
        this.recalculate();
        
        // Show modal
        document.getElementById('newInvoiceModal').classList.add('active');
    }

    addLineItem() {
        const id = Date.now();
        const item = {
            id: id,
            description: '',
            quantity: 1,
            rate: 0,
            amount: 0
        };
        
        this.currentInvoice.lineItems.push(item);
        
        const container = document.getElementById('lineItems');
        const itemHTML = `
            <div class="line-item" data-id="${id}">
                <input type="text" placeholder="Description" onchange="app.updateLineItem(${id}, 'description', this.value)">
                <input type="number" placeholder="Qty" value="1" min="0.01" step="0.01" onchange="app.updateLineItem(${id}, 'quantity', this.value)">
                <input type="number" placeholder="Rate" value="0" min="0" step="0.01" onchange="app.updateLineItem(${id}, 'rate', this.value)">
                <button class="line-item-remove" onclick="app.removeLineItem(${id})">×</button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', itemHTML);
    }

    updateLineItem(id, field, value) {
        const item = this.currentInvoice.lineItems.find(i => i.id === id);
        if (!item) return;
        
        if (field === 'description') {
            item.description = value;
        } else {
            item[field] = parseFloat(value) || 0;
        }
        
        // Calculate item amount
        item.amount = Math.round(item.quantity * item.rate * 100) / 100;
        
        this.recalculate();
    }

    removeLineItem(id) {
        this.currentInvoice.lineItems = this.currentInvoice.lineItems.filter(i => i.id !== id);
        document.querySelector(`.line-item[data-id="${id}"]`)?.remove();
        this.recalculate();
    }

    recalculate() {
        // Calculate subtotal
        const subtotal = this.currentInvoice.lineItems.reduce((sum, item) => {
            return sum + (Math.round(item.amount * 100) / 100);
        }, 0);
        
        // Get tax rate and discount
        const taxRate = parseFloat(document.getElementById('taxPercent')?.value) || 0;
        const discountAmount = parseFloat(document.getElementById('discountAmount')?.value) || 0;
        
        // Calculate tax amount
        const taxAmount = Math.round((subtotal * taxRate / 100) * 100) / 100;
        
        // Calculate total
        const total = Math.round((subtotal + taxAmount - discountAmount) * 100) / 100;
        
        // Update current invoice
        this.currentInvoice.subtotal = subtotal;
        this.currentInvoice.taxAmount = taxAmount;
        this.currentInvoice.discountAmount = discountAmount;
        this.currentInvoice.total = total;
        
        // Update UI
        document.getElementById('calcSubtotal').textContent = this.formatCurrency(subtotal);
        document.getElementById('calcTax').textContent = this.formatCurrency(taxAmount);
        document.getElementById('calcTotal').textContent = this.formatCurrency(total);
    }

    createInvoice() {
        const clientId = document.getElementById('invoiceClient').value;
        if (!clientId) {
            this.showToast('Please select a client', 'error');
            return;
        }
        
        // Filter out empty line items
        const validLineItems = this.currentInvoice.lineItems.filter(item => item.description && item.amount > 0);
        
        if (validLineItems.length === 0) {
            this.showToast('Please add at least one line item', 'error');
            return;
        }
        
        const invoice = {
            id: Date.now().toString(),
            number: document.getElementById('invoiceNumber').value,
            clientId: clientId,
            date: document.getElementById('invoiceDate').value,
            dueDate: document.getElementById('invoiceDueDate').value,
            lineItems: validLineItems,
            subtotal: this.currentInvoice.subtotal,
            taxRate: parseFloat(document.getElementById('taxPercent').value) || 0,
            taxAmount: this.currentInvoice.taxAmount,
            discount: this.currentInvoice.discountAmount,
            total: this.currentInvoice.total,
            notes: document.getElementById('invoiceNotes').value,
            status: 'sent',
            createdAt: new Date().toISOString()
        };
        
        // Add invoice
        this.data.invoices.push(invoice);
        
        // Update next invoice number
        this.data.settings.invoice.nextNumber++;
        
        // Save data
        this.saveData();
        
        // Close modal and refresh
        this.closeModal('newInvoiceModal');
        this.renderInvoices();
        this.updateDashboard();
        
        this.showToast('Invoice created successfully!', 'success');
        
        // Show preview
        this.viewInvoice(invoice.id);
    }

    saveAsDraft() {
        const invoice = {
            id: Date.now().toString(),
            number: document.getElementById('invoiceNumber').value,
            clientId: document.getElementById('invoiceClient').value || '',
            date: document.getElementById('invoiceDate').value,
            dueDate: document.getElementById('invoiceDueDate').value,
            lineItems: this.currentInvoice.lineItems,
            subtotal: this.currentInvoice.subtotal,
            taxRate: parseFloat(document.getElementById('taxPercent').value) || 0,
            taxAmount: this.currentInvoice.taxAmount,
            discount: this.currentInvoice.discountAmount,
            total: this.currentInvoice.total,
            notes: document.getElementById('invoiceNotes').value,
            status: 'draft',
            createdAt: new Date().toISOString()
        };
        
        this.data.invoices.push(invoice);
        this.data.settings.invoice.nextNumber++;
        this.saveData();
        
        this.closeModal('newInvoiceModal');
        this.renderInvoices();
        this.showToast('Invoice saved as draft!', 'success');
    }

    viewInvoice(invoiceId) {
        const invoice = this.data.invoices.find(i => i.id === invoiceId);
        if (!invoice) return;
        
        const client = this.data.clients.find(c => c.id === invoice.clientId);
        const preview = document.getElementById('invoicePreview');
        
        // Create professional invoice HTML optimized for mobile/desktop
        const invoiceHTML = this.generateInvoiceHTML(invoice, client);
        preview.innerHTML = invoiceHTML;
        
        // Generate QR code if UPI exists
        if (this.data.settings.payment.upi && invoice.total > 0) {
            setTimeout(() => {
                const qrContainer = document.getElementById('qrcode');
                if (qrContainer) {
                    qrContainer.innerHTML = '';
                    new QRCode(qrContainer, {
                        text: `upi://pay?pa=${this.data.settings.payment.upi}&pn=${encodeURIComponent(this.data.settings.profile.name || 'Invoice')}&am=${invoice.total}&cu=INR`,
                        width: this.isMobile ? 100 : 150,
                        height: this.isMobile ? 100 : 150,
                        colorDark: "#000000",
                        colorLight: "#ffffff",
                    });
                }
            }, 100);
        }
        
        document.getElementById('previewModal').classList.add('active');
    }

    generateInvoiceHTML(invoice, client) {
        const isMobileView = this.isMobile || window.innerWidth < 768;
        
        if (isMobileView) {
            // Mobile-optimized invoice format
            return `
                <div id="invoicePrintContent" style="
                    font-family: 'Arial', sans-serif;
                    max-width: 100%;
                    margin: 0 auto;
                    padding: 20px;
                    background: white;
                    color: #000;
                ">
                    <!-- Header -->
                    <div style="text-align: center; margin-bottom: 20px; border-bottom: 3px solid #dc2626; padding-bottom: 15px;">
                        <h1 style="color: #dc2626; font-size: 24px; margin: 0;">INVOICE</h1>
                        <p style="color: #000; font-size: 14px; margin: 5px 0;">Invoice #: <strong>${invoice.number}</strong></p>
                    </div>

                    <!-- Business Info -->
                    <div style="margin-bottom: 20px; padding: 10px; background: #f9f9f9; border-radius: 5px;">
                        <h3 style="color: #dc2626; font-size: 16px; margin: 0 0 10px 0;">From:</h3>
                        <p style="margin: 3px 0; font-size: 14px;"><strong>${this.data.settings.profile.name || 'Your Business'}</strong></p>
                        ${this.data.settings.profile.phone ? `<p style="margin: 3px 0; font-size: 12px;">📞 ${this.data.settings.profile.phone}</p>` : ''}
                        ${this.data.settings.profile.email ? `<p style="margin: 3px 0; font-size: 12px;">✉️ ${this.data.settings.profile.email}</p>` : ''}
                        ${this.data.settings.profile.address ? `<p style="margin: 3px 0; font-size: 12px;">📍 ${this.data.settings.profile.address}</p>` : ''}
                        ${this.data.settings.profile.gst ? `<p style="margin: 3px 0; font-size: 12px;">GST: ${this.data.settings.profile.gst}</p>` : ''}
                    </div>

                    <!-- Client Info -->
                    <div style="margin-bottom: 20px; padding: 10px; background: #f9f9f9; border-radius: 5px;">
                        <h3 style="color: #dc2626; font-size: 16px; margin: 0 0 10px 0;">Bill To:</h3>
                        <p style="margin: 3px 0; font-size: 14px;"><strong>${client?.name || 'Client'}</strong></p>
                        ${client?.phone ? `<p style="margin: 3px 0; font-size: 12px;">📞 ${client.phone}</p>` : ''}
                        ${client?.email ? `<p style="margin: 3px 0; font-size: 12px;">✉️ ${client.email}</p>` : ''}
                        ${client?.address ? `<p style="margin: 3px 0; font-size: 12px;">📍 ${client.address}</p>` : ''}
                    </div>

                    <!-- Dates -->
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px;">
                        <div>
                            <strong>Date:</strong> ${this.formatDate(invoice.date)}
                        </div>
                        <div>
                            <strong>Due:</strong> ${this.formatDate(invoice.dueDate)}
                        </div>
                    </div>

                    <!-- Items -->
                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #dc2626; font-size: 16px; margin: 0 0 10px 0;">Items</h3>
                        ${invoice.lineItems?.map(item => `
                            <div style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">
                                <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">${item.description}</div>
                                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #666;">
                                    <span>${item.quantity} × ${this.formatCurrency(item.rate)}</span>
                                    <span style="font-weight: bold; color: #000;">${this.formatCurrency(item.amount)}</span>
                                </div>
                            </div>
                        `).join('') || ''}
                    </div>

                    <!-- Totals -->
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
                            <span>Subtotal:</span>
                            <span style="font-weight: bold;">${this.formatCurrency(invoice.subtotal)}</span>
                        </div>
                        ${invoice.taxRate > 0 ? `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
                                <span>Tax (${invoice.taxRate}%):</span>
                                <span style="font-weight: bold;">${this.formatCurrency(invoice.taxAmount)}</span>
                            </div>
                        ` : ''}
                        ${invoice.discount > 0 ? `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
                                <span>Discount:</span>
                                <span style="font-weight: bold;">-${this.formatCurrency(invoice.discount)}</span>
                            </div>
                        ` : ''}
                        <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #dc2626; font-size: 18px;">
                            <span style="color: #dc2626; font-weight: bold;">TOTAL:</span>
                            <span style="color: #dc2626; font-weight: bold;">${this.formatCurrency(invoice.total)}</span>
                        </div>
                    </div>

                    ${invoice.notes ? `
                        <div style="margin-bottom: 20px; padding: 10px; background: #fff3cd; border-radius: 5px;">
                            <h4 style="margin: 0 0 5px 0; font-size: 14px;">Notes:</h4>
                            <p style="margin: 0; font-size: 12px;">${invoice.notes}</p>
                        </div>
                    ` : ''}

                    <!-- Payment Info -->
                    ${this.data.settings.payment.bank || this.data.settings.payment.upi ? `
                        <div style="margin-bottom: 20px; padding: 10px; background: #f9f9f9; border-radius: 5px;">
                            <h4 style="color: #dc2626; margin: 0 0 10px 0; font-size: 14px;">Payment Details</h4>
                            ${this.data.settings.payment.bank ? `
                                <p style="margin: 3px 0; font-size: 12px;"><strong>Bank:</strong> ${this.data.settings.payment.bank}</p>
                                <p style="margin: 3px 0; font-size: 12px;"><strong>A/C:</strong> ${this.data.settings.payment.account}</p>
                                <p style="margin: 3px 0; font-size: 12px;"><strong>IFSC:</strong> ${this.data.settings.payment.ifsc}</p>
                            ` : ''}
                            ${this.data.settings.payment.upi ? `
                                <div style="text-align: center; margin-top: 15px;">
                                    <div id="qrcode" style="display: inline-block;"></div>
                                    <p style="margin: 5px 0 0 0; font-size: 11px;">Scan to pay via UPI</p>
                                    <p style="margin: 2px 0; font-size: 10px; color: #666;">${this.data.settings.payment.upi}</p>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}

                    <!-- Footer -->
                    <div style="text-align: center; padding-top: 10px; border-top: 1px solid #e5e5e5;">
                        <p style="font-size: 12px; color: #666;">Thank you for your business!</p>
                    </div>
                </div>
            `;
        } else {
            // Desktop-optimized invoice format
            return `
                <div id="invoicePrintContent" style="
                    font-family: 'Georgia', 'Times New Roman', serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 40px;
                    background: white;
                    color: #000;
                ">
                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px; border-bottom: 3px solid #dc2626; padding-bottom: 20px;">
                        <div>
                            <h2 style="color: #000; font-size: 28px; margin: 0 0 10px 0;">${this.data.settings.profile.name || 'Your Business'}</h2>
                            ${this.data.settings.profile.address ? `<p style="margin: 5px 0; font-size: 14px; color: #333;">${this.data.settings.profile.address}</p>` : ''}
                            ${this.data.settings.profile.phone ? `<p style="margin: 5px 0; font-size: 14px; color: #333;">Phone: ${this.data.settings.profile.phone}</p>` : ''}
                            ${this.data.settings.profile.email ? `<p style="margin: 5px 0; font-size: 14px; color: #333;">Email: ${this.data.settings.profile.email}</p>` : ''}
                            ${this.data.settings.profile.gst ? `<p style="margin: 5px 0; font-size: 14px; color: #333;">GST: ${this.data.settings.profile.gst}</p>` : ''}
                        </div>
                        <div style="text-align: right;">
                            <h1 style="color: #dc2626; font-size: 42px; margin: 0; letter-spacing: 2px;">INVOICE</h1>
                            <p style="font-size: 16px; color: #000; margin: 10px 0 5px 0;">Invoice #: <strong>${invoice.number}</strong></p>
                            <p style="font-size: 14px; color: #333; margin: 5px 0;">Date: ${this.formatDate(invoice.date)}</p>
                            <p style="font-size: 14px; color: #333; margin: 5px 0;">Due Date: ${this.formatDate(invoice.dueDate)}</p>
                        </div>
                    </div>

                    <!-- Bill To Section -->
                    <div style="margin-bottom: 40px; padding: 20px; background: #f8f8f8; border-left: 4px solid #dc2626;">
                        <h3 style="color: #dc2626; font-size: 18px; margin: 0 0 15px 0; text-transform: uppercase;">Bill To:</h3>
                        <p style="font-size: 16px; font-weight: bold; margin: 0 0 8px 0;">${client?.name || 'Client'}</p>
                        ${client?.address ? `<p style="margin: 5px 0; font-size: 14px; color: #333;">${client.address}</p>` : ''}
                        ${client?.phone ? `<p style="margin: 5px 0; font-size: 14px; color: #333;">Phone: ${client.phone}</p>` : ''}
                        ${client?.email ? `<p style="margin: 5px 0; font-size: 14px; color: #333;">Email: ${client.email}</p>` : ''}
                        ${client?.gst ? `<p style="margin: 5px 0; font-size: 14px; color: #333;">GST: ${client.gst}</p>` : ''}
                    </div>

                    <!-- Items Table -->
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
                        <thead>
                            <tr style="background: #dc2626; color: white;">
                                <th style="padding: 15px; text-align: left; font-size: 14px; font-weight: 600;">DESCRIPTION</th>
                                <th style="padding: 15px; text-align: center; font-size: 14px; font-weight: 600;">QTY</th>
                                <th style="padding: 15px; text-align: right; font-size: 14px; font-weight: 600;">RATE</th>
                                <th style="padding: 15px; text-align: right; font-size: 14px; font-weight: 600;">AMOUNT</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoice.lineItems?.map((item, index) => `
                                <tr style="border-bottom: 1px solid #e5e5e5; ${index % 2 === 0 ? 'background: #fafafa;' : ''}">
                                    <td style="padding: 15px; font-size: 14px;">${item.description}</td>
                                    <td style="padding: 15px; text-align: center; font-size: 14px;">${item.quantity}</td>
                                    <td style="padding: 15px; text-align: right; font-size: 14px;">${this.formatCurrency(item.rate)}</td>
                                    <td style="padding: 15px; text-align: right; font-size: 14px; font-weight: 600;">${this.formatCurrency(item.amount)}</td>
                                </tr>
                            `).join('') || ''}
                        </tbody>
                    </table>

                    <!-- Totals Section -->
                    <div style="display: flex; justify-content: flex-end; margin-bottom: 40px;">
                        <div style="width: 350px;">
                            <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 15px;">
                                <span>Subtotal:</span>
                                <span style="font-weight: 600;">${this.formatCurrency(invoice.subtotal)}</span>
                            </div>
                            ${invoice.taxRate > 0 ? `
                                <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 15px;">
                                    <span>Tax (${invoice.taxRate}%):</span>
                                    <span style="font-weight: 600;">${this.formatCurrency(invoice.taxAmount)}</span>
                                </div>
                            ` : ''}
                            ${invoice.discount > 0 ? `
                                <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 15px;">
                                    <span>Discount:</span>
                                    <span style="font-weight: 600;">-${this.formatCurrency(invoice.discount)}</span>
                                </div>
                            ` : ''}
                            <div style="display: flex; justify-content: space-between; padding: 15px 0; border-top: 3px solid #dc2626; font-size: 20px;">
                                <span style="color: #dc2626; font-weight: bold;">TOTAL DUE:</span>
                                <span style="color: #dc2626; font-weight: bold;">${this.formatCurrency(invoice.total)}</span>
                            </div>
                        </div>
                    </div>

                    ${invoice.notes ? `
                        <div style="margin-bottom: 30px; padding: 20px; background: #fffbf0; border-left: 4px solid #f59e0b;">
                            <h4 style="margin: 0 0 10px 0; font-size: 16px; color: #92400e;">Notes:</h4>
                            <p style="margin: 0; font-size: 14px; color: #333; line-height: 1.6;">${invoice.notes}</p>
                        </div>
                    ` : ''}

                    <!-- Payment Details -->
                    ${this.data.settings.payment.bank || this.data.settings.payment.upi ? `
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px; padding: 20px; background: #f8f8f8; border-radius: 8px;">
                            <div>
                                <h4 style="color: #dc2626; margin: 0 0 15px 0; font-size: 16px;">PAYMENT INFORMATION</h4>
                                ${this.data.settings.payment.bank ? `
                                    <p style="margin: 5px 0; font-size: 14px;"><strong>Bank Name:</strong> ${this.data.settings.payment.bank}</p>
                                    <p style="margin: 5px 0; font-size: 14px;"><strong>Account Number:</strong> ${this.data.settings.payment.account}</p>
                                    <p style="margin: 5px 0; font-size: 14px;"><strong>IFSC Code:</strong> ${this.data.settings.payment.ifsc}</p>
                                ` : ''}
                            </div>
                            ${this.data.settings.payment.upi ? `
                                <div style="text-align: center;">
                                    <div id="qrcode"></div>
                                    <p style="margin-top: 10px; font-size: 12px; color: #666;">Scan to pay via UPI</p>
                                    <p style="margin: 5px 0; font-size: 11px; color: #999;">${this.data.settings.payment.upi}</p>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}

                    <!-- Footer -->
                    <div style="text-align: center; padding: 20px; border-top: 1px solid #e5e5e5;">
                        <p style="font-size: 16px; color: #333; margin-bottom: 10px;">Thank you for your business!</p>
                        <p style="font-size: 12px; color: #999;">This is a computer generated invoice and does not require a signature.</p>
                    </div>
                </div>
            `;
        }
    }

    async downloadPDF() {
        try {
            const element = document.getElementById('invoicePrintContent');
            if (!element) {
                this.showToast('Error: Invoice content not found', 'error');
                return;
            }

            // Show loading state
            this.showToast('Generating PDF...', 'info');

            // Configure html2canvas options for better quality
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            
            // Initialize jsPDF
            const { jsPDF } = window.jspdf;
            
            // Determine orientation and size based on device
            const orientation = this.isMobile ? 'p' : 'p';
            const format = this.isMobile ? 'a4' : 'a4';
            
            const pdf = new jsPDF({
                orientation: orientation,
                unit: 'mm',
                format: format
            });

            // Calculate dimensions
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth - 20; // 10mm margin on each side
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 10; // Top margin

            // Add first page
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= (pageHeight - 20);

            // Add additional pages if needed
            while (heightLeft > 0) {
                position = heightLeft - imgHeight + 10;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                heightLeft -= (pageHeight - 20);
            }

            // Save the PDF
            const fileName = `invoice_${Date.now()}.pdf`;
            pdf.save(fileName);
            
            this.showToast('PDF downloaded successfully!', 'success');
        } catch (error) {
            console.error('Error generating PDF:', error);
            this.showToast('Error generating PDF. Please try again.', 'error');
        }
    }

    // Clients
    renderClients() {
        const container = document.getElementById('clientList');
        if (!container) return;
        
        if (this.data.clients.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <div class="empty-title">No clients yet</div>
                    <div class="empty-text">Add your first client to get started</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.data.clients.map(client => {
            const clientInvoices = this.data.invoices.filter(i => i.clientId === client.id);
            const totalRevenue = clientInvoices
                .filter(i => i.status === 'paid')
                .reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
            
            return `
                <div class="client-card">
                    <div class="client-header">
                        <div class="client-avatar">${client.name.charAt(0).toUpperCase()}</div>
                        <div>
                            <div class="client-name">${client.name}</div>
                            <div class="client-email">${client.email}</div>
                        </div>
                    </div>
                    <div class="client-stats">
                        <div class="client-stat">
                            <div class="client-stat-value">${clientInvoices.length}</div>
                            <div class="client-stat-label">Invoices</div>
                        </div>
                        <div class="client-stat">
                            <div class="client-stat-value">${this.formatCurrency(totalRevenue)}</div>
                            <div class="client-stat-label">Revenue</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    showNewClient() {
        document.getElementById('clientForm').reset();
        document.getElementById('newClientModal').classList.add('active');
    }

    createClient() {
        const client = {
            id: Date.now().toString(),
            name: document.getElementById('clientName').value,
            email: document.getElementById('clientEmail').value,
            phone: document.getElementById('clientPhone').value,
            address: document.getElementById('clientAddress').value,
            gst: document.getElementById('clientGST').value,
            createdAt: new Date().toISOString()
        };
        
        this.data.clients.push(client);
        this.saveData();
        
        this.closeModal('newClientModal');
        this.renderClients();
        this.showToast('Client added successfully!', 'success');
    }

    // Settings methods remain the same...
    saveProfile() {
        this.data.settings.profile = {
            name: document.getElementById('businessName').value,
            email: document.getElementById('businessEmail').value,
            phone: document.getElementById('businessPhone').value,
            address: document.getElementById('businessAddress').value,
            gst: document.getElementById('businessGST').value
        };
        
        this.saveData();
        this.applySettings();
        this.showToast('Profile saved!', 'success');
    }

    savePayment() {
        this.data.settings.payment = {
            upi: document.getElementById('upiId').value,
            bank: document.getElementById('bankName').value,
            account: document.getElementById('accountNumber').value,
            ifsc: document.getElementById('ifscCode').value
        };
        
        this.saveData();
        this.showToast('Payment details saved!', 'success');
    }

    saveInvoiceSettings() {
        this.data.settings.invoice = {
            ...this.data.settings.invoice,
            currency: document.getElementById('currency').value,
            taxRate: parseFloat(document.getElementById('defaultTaxRate').value),
            prefix: document.getElementById('invoicePrefix').value,
            paymentTerms: parseInt(document.getElementById('paymentTerms').value)
        };
        
        this.saveData();
        this.showToast('Invoice settings saved!', 'success');
    }

    applySettings() {
        // Apply profile settings
        if (this.data.settings.profile.name) {
            document.getElementById('businessName').value = this.data.settings.profile.name;
            document.getElementById('sidebarUserName').textContent = this.data.settings.profile.name;
            document.getElementById('sidebarAvatar').textContent = this.data.settings.profile.name.charAt(0).toUpperCase();
        }
        if (this.data.settings.profile.email) {
            document.getElementById('businessEmail').value = this.data.settings.profile.email;
            document.getElementById('sidebarUserEmail').textContent = this.data.settings.profile.email;
        }
        if (this.data.settings.profile.phone) {
            document.getElementById('businessPhone').value = this.data.settings.profile.phone;
        }
        if (this.data.settings.profile.address) {
            document.getElementById('businessAddress').value = this.data.settings.profile.address;
        }
        if (this.data.settings.profile.gst) {
            document.getElementById('businessGST').value = this.data.settings.profile.gst;
        }
        
        // Apply payment settings
        if (this.data.settings.payment.upi) {
            document.getElementById('upiId').value = this.data.settings.payment.upi;
        }
        if (this.data.settings.payment.bank) {
            document.getElementById('bankName').value = this.data.settings.payment.bank;
        }
        if (this.data.settings.payment.account) {
            document.getElementById('accountNumber').value = this.data.settings.payment.account;
        }
        if (this.data.settings.payment.ifsc) {
            document.getElementById('ifscCode').value = this.data.settings.payment.ifsc;
        }
        
        // Apply invoice settings
        document.getElementById('currency').value = this.data.settings.invoice.currency;
        document.getElementById('defaultTaxRate').value = this.data.settings.invoice.taxRate;
        document.getElementById('invoicePrefix').value = this.data.settings.invoice.prefix;
        document.getElementById('paymentTerms').value = this.data.settings.invoice.paymentTerms;
        
        // Apply dark mode
        if (this.data.settings.app.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.getElementById('darkModeToggle').checked = true;
        }
    }

    toggleDarkMode() {
        const isDark = document.getElementById('darkModeToggle').checked;
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        this.data.settings.app.darkMode = isDark;
        this.saveData();
    }

    // Quick Actions
    quickAction(action) {
        switch(action) {
            case 'new-invoice':
                this.showNewInvoice();
                break;
            case 'new-client':
                this.showNewClient();
                break;
            case 'view-reports':
                this.showToast('Reports feature coming soon!', 'info');
                break;
            case 'export':
                this.exportData();
                break;
        }
    }

    exportData() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', `invoice_data_${Date.now()}.json`);
        link.click();
        
        this.showToast('Data exported successfully!', 'success');
    }

    clearData() {
        if (confirm('This will delete all your data. Are you sure?')) {
            if (confirm('This action cannot be undone. Please confirm again.')) {
                localStorage.removeItem('invoiceAppData');
                location.reload();
            }
        }
    }

    // Utilities
    formatCurrency(amount) {
        const currency = this.data.settings.invoice.currency || '₹';
        const value = parseFloat(amount) || 0;
        // Round to 2 decimal places
        const rounded = Math.round(value * 100) / 100;
        return `${currency}${rounded.toFixed(2)}`;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span>${message}</span>
        `;
        
        document.getElementById('toastContainer').appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Filters
    filterInvoices(searchTerm) {
        // Implementation for invoice search
        console.log('Searching invoices:', searchTerm);
    }

    filterInvoicesByStatus(status) {
        // Implementation for status filter
        console.log('Filtering by status:', status);
    }

    filterClients(searchTerm) {
        // Implementation for client search
        console.log('Searching clients:', searchTerm);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new InvoiceApp();
    console.log('Invoice App initialized');
});