lucide.createIcons();

const state = {
    keysData: [],
    crmData: [],
    keysPage: 1,
    crmPage: 1,
    rowsPerPage: 8,
    chartInstance: null
};

const app = {
    // --- 1. CORE SYSTEM ---
    verify() {
        const input = document.getElementById('auth-input');
        if (input.value === 'azort') { 
            const guard = document.getElementById('auth-guard');
            guard.style.opacity = '0';
            setTimeout(() => {
                guard.classList.add('hidden');
                document.getElementById('app-root').classList.remove('hidden');
                this.loadSettings(); 
                this.fetchData(); 
            }, 400);
        } else {
            document.getElementById('auth-error').style.display = 'block';
            input.value = '';
        }
    },
    logout() {
        document.getElementById('app-root').classList.add('hidden');
        const guard = document.getElementById('auth-guard');
        guard.classList.remove('hidden');
        guard.style.opacity = '1';
        document.getElementById('auth-input').value = '';
    },
    navigate(viewId, navElement) {
        if (navElement) {
            document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
            navElement.classList.add('active');
        }
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.getElementById(`view-${viewId}`).classList.remove('hidden');

        if (viewId === 'keys') this.renderKeysTable();
        if (viewId === 'crm') this.renderCRMTable();
        if (viewId === 'stats') this.renderChart();
    },

    // --- 2. CONFIGURATION ---
    loadSettings() {
        document.getElementById('config-url').value = localStorage.getItem('upstash_url') || '';
        document.getElementById('config-token').value = localStorage.getItem('upstash_token') || '';
    },
    saveSettings() {
        const url = document.getElementById('config-url').value.trim();
        const token = document.getElementById('config-token').value.trim();
        localStorage.setItem('upstash_url', url);
        localStorage.setItem('upstash_token', token);
        this.showToast("Settings Saved", "Database config updated.");
        this.fetchData();
    },

    // --- 3. LIVE DATABASE ENGINE ---
    async fetchData() {
        const url = localStorage.getItem('upstash_url');
        const token = localStorage.getItem('upstash_token');

        if (!url || !token) {
            this.showToast("Setup Required", "Please enter Upstash details in Settings.");
            return;
        }

        try {
            const cleanUrl = url.replace(/\/$/, "");
            
            // Hit Upstash REST API directly
            const response = await fetch(`${cleanUrl}/lrange/generated_keys/0/500`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Connection failed");
            
            const json = await response.json();
            if (json.error) throw new Error(json.error);

            // Parse DB Data strictly
            const rawData = json.result || [];
            state.keysData = rawData.map(entry => {
                try { return typeof entry === 'string' ? JSON.parse(entry) : entry; }
                catch (e) { return null; }
            }).filter(item => item !== null);

            // Sort newest first
            state.keysData.sort((a, b) => new Date(b.timestamp || Date.now()) - new Date(a.timestamp || Date.now()));

            // Render all modules
            this.processAnalytics();
            this.processCRM();
            this.renderKeysTable();
            this.showToast("Sync Complete", `Loaded ${state.keysData.length} live records.`);

        } catch (err) {
            this.showToast("Database Error", "Failed to connect to Upstash.");
            state.keysData = [];
            state.crmData = [];
            this.renderKeysTable();
            this.renderCRMTable();
        }
    },

    // --- 4. INVOICES MODULE ---
    renderKeysTable(dataToRender = state.keysData) {
        const tbody = document.getElementById('keys-tbody');
        const start = (state.keysPage - 1) * state.rowsPerPage;
        const paginatedData = dataToRender.slice(start, start + state.rowsPerPage);
        
        if (paginatedData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No real invoices found. Check your database config.</td></tr>`;
            return;
        }

        tbody.innerHTML = paginatedData.map((item) => {
            const globalIndex = state.keysData.indexOf(item); 
            const price = parseFloat(item.amount || item.price || 0.10).toFixed(2);
            
            return `
                <tr class="clickable-row" onclick="app.showDetail(${globalIndex})">
                    <td><span class="badge blue">Manual</span></td>
                    <td class="monospace">${item.orderId || 'MANUAL-GEN'}</td>
                    <td>${item.product || 'Unknown'}</td>
                    <td class="text-green">+$${price}</td>
                    <td class="monospace">${item.key ? item.key.substring(0, 10) + '...' : 'N/A'}</td>
                    <td class="flex-align"><i data-lucide="gem" class="icon-blue"></i> ${item.gateway || 'Litecoin'}</td>
                    <td style="color: var(--text-muted);">${item.email || 'Not Provided'}</td>
                </tr>
            `;
        }).join('');
        
        lucide.createIcons();
        this.renderPagination('keys', dataToRender.length);
    },

    filterKeys() {
        const term = document.getElementById('keys-search').value.toLowerCase();
        const filtered = state.keysData.filter(k => 
            (k.orderId && k.orderId.toLowerCase().includes(term)) || 
            (k.email && k.email.toLowerCase().includes(term))
        );
        state.keysPage = 1;
        this.renderKeysTable(filtered);
    },

    showDetail(index) {
        const item = state.keysData[index];
        if(!item) return;

        document.getElementById('view-keys').classList.add('hidden');
        document.getElementById('view-detail').classList.remove('hidden');

        const dateObj = item.timestamp ? new Date(item.timestamp) : new Date();
        const price = parseFloat(item.amount || item.price || 0.10).toFixed(2);

        document.getElementById('det-id').innerText = item.orderId || 'MANUAL-GEN';
        document.getElementById('det-key').innerText = item.key || 'N/A';
        document.getElementById('det-paid').innerText = `+$${price}`;
        document.getElementById('det-date').innerText = dateObj.toLocaleString('en-GB');
        document.getElementById('det-email').innerText = item.email || 'Not Provided';
        
        const discordEl = document.getElementById('det-discord');
        if (item.claimed_by) {
            discordEl.innerText = item.claimed_by;
            discordEl.classList.add('blue-text');
        } else {
            discordEl.innerText = 'Not Claimed';
            discordEl.classList.remove('blue-text');
        }
    },

    // --- 5. CRM MODULE (Calculates live data) ---
    processCRM() {
        const crmMap = {};
        state.keysData.forEach(order => {
            if(!order.email) return; 
            
            const price = parseFloat(order.amount || order.price || 0.10);
            const ts = new Date(order.timestamp || Date.now()).getTime();

            if(!crmMap[order.email]) {
                crmMap[order.email] = { email: order.email, spent: 0, orders: 0, lastActive: ts };
            }
            crmMap[order.email].spent += price;
            crmMap[order.email].orders += 1;
            if(ts > crmMap[order.email].lastActive) crmMap[order.email].lastActive = ts;
        });
        
        state.crmData = Object.values(crmMap).sort((a, b) => b.spent - a.spent); 
    },

    renderCRMTable(dataToRender = state.crmData) {
        const tbody = document.getElementById('crm-tbody');
        const start = (state.crmPage - 1) * state.rowsPerPage;
        const paginatedData = dataToRender.slice(start, start + state.rowsPerPage);
        
        if (paginatedData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No customers found.</td></tr>`;
            return;
        }

        tbody.innerHTML = paginatedData.map(item => `
            <tr>
                <td class="blue-text">${item.email}</td>
                <td class="text-green monospace">$${item.spent.toFixed(2)}</td>
                <td class="monospace">${item.orders}</td>
                <td style="color: var(--text-muted);">${new Date(item.lastActive).toLocaleDateString('en-GB')}</td>
                <td><button class="btn outline" style="color: #f85149; border-color: #f85149;">Blacklist</button></td>
            </tr>
        `).join('');
        this.renderPagination('crm', dataToRender.length);
    },

    filterCRM() {
        const term = document.getElementById('crm-search').value.toLowerCase();
        const filtered = state.crmData.filter(c => c.email.toLowerCase().includes(term));
        state.crmPage = 1;
        this.renderCRMTable(filtered);
    },

    // --- 6. ANALYTICS MODULE (Live Calculations) ---
    processAnalytics() {
        let totalRev = 0;
        const uniqueEmails = new Set();

        state.keysData.forEach(order => {
            totalRev += parseFloat(order.amount || order.price || 0.10);
            if(order.email) uniqueEmails.add(order.email);
        });

        document.getElementById('dash-rev').innerText = `$${totalRev.toFixed(2)}`;
        document.getElementById('dash-orders').innerText = state.keysData.length;
        document.getElementById('dash-customers').innerText = uniqueEmails.size;
    },

    renderChart() {
        if(state.chartInstance) state.chartInstance.destroy(); 
        
        const last7Days = Array(7).fill(0);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        state.keysData.forEach(order => {
            const orderDate = new Date(order.timestamp || Date.now());
            orderDate.setHours(0,0,0,0);
            const diffDays = Math.floor((today - orderDate) / (1000 * 60 * 60 * 24));
            if(diffDays >= 0 && diffDays < 7) {
                last7Days[6 - diffDays] += parseFloat(order.amount || order.price || 0.10);
            }
        });

        const ctx = document.getElementById('revenueChart').getContext('2d');
        state.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['6 Days Ago', '5 Days Ago', '4 Days Ago', '3 Days Ago', '2 Days Ago', 'Yesterday', 'Today'],
                datasets: [{
                    label: 'Gross Volume ($)', data: last7Days,
                    borderColor: '#58a6ff', backgroundColor: 'rgba(88, 166, 255, 0.1)',
                    borderWidth: 2, tension: 0.4, fill: true, pointBackgroundColor: '#0d1117', pointBorderColor: '#58a6ff'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { grid: { color: '#30363d' }, ticks: { color: '#8b949e', callback: (v) => '$'+v } },
                    x: { grid: { display: false }, ticks: { color: '#8b949e' } }
                }
            }
        });
    },

    // --- 7. UTILITIES ---
    renderPagination(module, totalItems) {
        const totalPages = Math.ceil(totalItems / state.rowsPerPage);
        const current = module === 'keys' ? state.keysPage : state.crmPage;
        
        document.getElementById(`${module}-pagination`).innerHTML = `
            <span class="page-info">Page ${current} of ${totalPages || 1}</span>
            <button class="page-btn" ${current <= 1 ? 'disabled' : ''} onclick="app.changePage('${module}', -1)">Prev</button>
            <button class="page-btn" ${current >= totalPages || totalPages === 0 ? 'disabled' : ''} onclick="app.changePage('${module}', 1)">Next</button>
        `;
    },
    changePage(module, dir) {
        if(module === 'keys') { state.keysPage += dir; this.renderKeysTable(); }
        if(module === 'crm') { state.crmPage += dir; this.renderCRMTable(); }
    },
    copyText(text) {
        navigator.clipboard.writeText(text);
        this.showToast("Copied!", "License key copied securely.");
    },
    showToast(title, msg) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<strong>${title}</strong><br><span style="color:var(--text-muted);">${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(()=>toast.remove(), 300); }, 3000);
    }
};

window.app = app;
