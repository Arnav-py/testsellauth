lucide.createIcons();

// --- STATE MANAGER ---
const state = {
    keysData: [],
    crmData: [],
    keysPage: 1,
    crmPage: 1,
    rowsPerPage: 8,
    chartsRendered: false
};

// --- AUTHENTICATION ---
const app = {
    verify() {
        const input = document.getElementById('auth-input');
        const err = document.getElementById('auth-error');
        if (input.value === 'azort') {
            document.getElementById('auth-guard').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('auth-guard').classList.add('hidden');
                document.getElementById('app-root').classList.remove('hidden');
                this.navigate('home');
            }, 400);
        } else {
            err.classList.add('show');
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

    // --- ROUTER ---
    navigate(view) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.getElementById(`view-${view}`).classList.remove('hidden');
        
        if(view === 'keys') this.fetchKeys();
        if(view === 'crm') this.fetchCRM();
        if(view === 'stats') this.renderCharts();
    },

    // --- KEYS MODULE (WITH PAGINATION & PANEL) ---
    async fetchKeys() {
        // Generate massive mock database for testing pagination
        if(state.keysData.length === 0) {
            for(let i=0; i<45; i++) {
                state.keysData.push({
                    id: Math.random().toString(36).substr(2, 8).toUpperCase(),
                    product: i % 3 === 0 ? 'SOURCE CODE' : 'L-SCRIPT',
                    key: `AZRT-${Math.random().toString(36).substr(2, 5).toUpperCase()}-XXXX`,
                    email: `buyer_${i}@proton.me`,
                    date: new Date(Date.now() - (Math.random() * 10000000000)).toLocaleString()
                });
            }
        }
        this.renderKeysTable();
    },
    
    renderKeysTable(data = state.keysData) {
        const tbody = document.getElementById('keys-tbody');
        const start = (state.keysPage - 1) * state.rowsPerPage;
        const paginatedData = data.slice(start, start + state.rowsPerPage);
        
        tbody.innerHTML = paginatedData.map((item, index) => `
            <tr>
                <td><span class="badge">COMPLETED</span></td>
                <td class="neon-text">#${item.id}</td>
                <td>${item.product}</td>
                <td>${item.key}</td>
                <td><button class="btn-outline" onclick="app.openDrawer(${start + index})">VIEW DETAILS</button></td>
            </tr>
        `).join('');
        
        this.renderPagination('keys', data.length);
    },

    filterKeys() {
        const term = document.getElementById('keys-search').value.toLowerCase();
        const filtered = state.keysData.filter(k => k.id.toLowerCase().includes(term) || k.email.toLowerCase().includes(term));
        state.keysPage = 1;
        this.renderKeysTable(filtered);
    },

    // --- DRAWER LOGIC (MASTER-DETAIL VIEW) ---
    openDrawer(index) {
        const item = state.keysData[index];
        const content = document.getElementById('drawer-data');
        content.innerHTML = `
            <div class="detail-row">
                <div class="detail-label">ORDER ID</div>
                <div class="detail-value neon-text">#${item.id}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">STATUS</div>
                <div class="detail-value"><span class="badge">MANUALLY COMPLETED</span></div>
            </div>
            <div class="detail-row">
                <div class="detail-label">PRODUCT PURCHASED</div>
                <div class="detail-value">${item.product}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">CUSTOMER EMAIL</div>
                <div class="detail-value">${item.email}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">TIMESTAMP</div>
                <div class="detail-value text-dim">${item.date}</div>
            </div>
            <div class="detail-row" style="margin-top: 3rem;">
                <div class="detail-label">LICENSE KEY (CLICK TO COPY)</div>
                <div class="big-key-box" onclick="app.copyText('${item.key}')">${item.key}</div>
            </div>
            <button class="btn-neon blue-bg" style="margin-top: 2rem;">REVOKE ACCESS</button>
        `;
        document.getElementById('side-drawer').classList.add('open');
        document.getElementById('drawer-overlay').classList.add('open');
    },
    closeDrawer() {
        document.getElementById('side-drawer').classList.remove('open');
        document.getElementById('drawer-overlay').classList.remove('open');
    },

    // --- CRM MODULE ---
    fetchCRM() {
        if(state.crmData.length === 0) {
            for(let i=0; i<30; i++) {
                state.crmData.push({
                    email: `client${i}@gmail.com`,
                    spend: (Math.random() * 500).toFixed(2),
                    orders: Math.floor(Math.random() * 10) + 1,
                    status: i % 8 === 0 ? 'BANNED' : 'ACTIVE'
                });
            }
        }
        this.renderCRMTable();
    },

    renderCRMTable(data = state.crmData) {
        const tbody = document.getElementById('crm-tbody');
        const start = (state.crmPage - 1) * state.rowsPerPage;
        const paginatedData = data.slice(start, start + state.rowsPerPage);
        
        tbody.innerHTML = paginatedData.map(item => `
            <tr>
                <td class="blue-text">${item.email}</td>
                <td class="neon-text">$${item.spend}</td>
                <td>${item.orders}</td>
                <td><span class="badge" style="${item.status==='BANNED' ? 'color:var(--bold-red); border-color:var(--bold-red); background:rgba(255,0,60,0.1);' : ''}">${item.status}</span></td>
                <td><button class="btn-outline" style="border-color:var(--bold-red); color:var(--bold-red);">BLACKLIST</button></td>
            </tr>
        `).join('');
        this.renderPagination('crm', data.length);
    },

    filterCRM() {
        const term = document.getElementById('crm-search').value.toLowerCase();
        const filtered = state.crmData.filter(c => c.email.toLowerCase().includes(term));
        state.crmPage = 1;
        this.renderCRMTable(filtered);
    },

    // --- UNIVERSAL PAGINATION LOGIC ---
    renderPagination(module, totalItems) {
        const totalPages = Math.ceil(totalItems / state.rowsPerPage);
        const currentPage = module === 'keys' ? state.keysPage : state.crmPage;
        const container = document.getElementById(`${module}-pagination`);
        
        container.innerHTML = `
            <span class="page-info">PAGE ${currentPage} OF ${totalPages || 1}</span>
            <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="app.changePage('${module}', -1)">PREV</button>
            <button class="page-btn" ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''} onclick="app.changePage('${module}', 1)">NEXT</button>
        `;
    },
    changePage(module, dir) {
        if(module === 'keys') { state.keysPage += dir; this.renderKeysTable(); }
        if(module === 'crm') { state.crmPage += dir; this.renderCRMTable(); }
    },

    // --- CHARTS & UTILS ---
    renderCharts() {
        if(state.chartsRendered) return;
        new Chart(document.getElementById('revenueChart'), {
            type: 'line',
            data: {
                labels: ['1', '5', '10', '15', '20', '25', '30'],
                datasets: [{
                    label: 'USD', data: [120, 300, 150, 400, 220, 500, 800],
                    borderColor: '#00ff66', backgroundColor: 'rgba(0, 255, 102, 0.1)',
                    borderWidth: 2, tension: 0.1, fill: true, pointBackgroundColor: '#00ff66'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#262626' }, ticks:{color:'#888'} }, x: { grid: { display: false }, ticks:{color:'#888'} } } }
        });
        state.chartsRendered = true;
    },

    copyText(txt) {
        navigator.clipboard.writeText(txt).then(() => {
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.innerHTML = `<i data-lucide="check"></i> KEY COPIED SECURELY`;
            document.getElementById('toast-container').appendChild(toast);
            lucide.createIcons({root: toast});
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(()=>toast.remove(), 300); }, 3000);
        });
    }
};

window.app = app;
