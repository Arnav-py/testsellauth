// Initialize Icons
lucide.createIcons();

let allKeys = []; // Global store

// Toggle Views
function showDetail(index) {
    const item = allKeys[index];
    if(!item) return;

    // Hide table view, show detail view
    document.getElementById('view-table').style.display = 'none';
    document.getElementById('view-detail').style.display = 'block';

    // Parse Date safely
    const dateObj = new Date(item.timestamp || item.generated_at || Date.now());
    const formattedDate = dateObj.toLocaleDateString('en-GB') + ', ' + dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Populate Order Information
    document.getElementById('det-id').innerText = item.orderId || 'MANUAL-GEN-' + Math.floor(Math.random() * 100000);
    document.getElementById('det-key').innerText = item.key || 'N/A';
    document.getElementById('det-date').innerText = formattedDate;
    
    // Formatting exact price string to match "$0.10"
    let rawPrice = item.amount || item.price || '0.10';
    rawPrice = rawPrice.replace('$', '').replace(' USD', ''); // Clean it if it has currency strings
    document.getElementById('det-price').innerText = `$${rawPrice}`;
    document.getElementById('det-paid').innerText = `+$${rawPrice}`;
    
    // Gateway parsing
    const gateway = item.gateway || item.payment_method || 'Litecoin';
    document.getElementById('det-gateway').innerHTML = `${gateway} <i data-lucide="wallet" class="crypto-icon"></i>`;
    
    // Populate Customer Information
    document.getElementById('det-email').innerText = item.email || 'Not Provided';
    
    // Discord Claim logic
    const discordEl = document.getElementById('det-discord');
    if (item.claimed_by) {
        discordEl.innerText = item.claimed_by;
        discordEl.classList.add('blue-text');
    } else {
        discordEl.innerText = 'Not Claimed';
        discordEl.classList.remove('blue-text');
    }

    // Refresh icons inside the dynamic HTML
    lucide.createIcons();
}

function showTable() {
    // Hide detail view, show table view
    document.getElementById('view-detail').style.display = 'none';
    document.getElementById('view-table').style.display = 'block';
}

function copyKeyFromDetail() {
    const keyEl = document.getElementById('det-key');
    const text = keyEl.innerText;
    
    navigator.clipboard.writeText(text).then(() => {
        // Subtle visual change to indicate copy
        const originalText = keyEl.innerText;
        keyEl.innerText = "Copied!";
        keyEl.style.color = "var(--badge-green-text)";
        
        setTimeout(() => {
            keyEl.innerText = originalText;
            keyEl.style.color = ""; // reset to CSS default
        }, 1500);
    });
}

// Data Fetching
async function fetchKeys() {
    const tbody = document.getElementById('keyTable');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 2rem;">Refreshing data...</td></tr>`;
    
    try {
        const response = await fetch('/api/keys');
        const data = await response.json();
        
        // Strict parsing for Upstash data
        allKeys = data.map(entry => {
            try { return typeof entry === 'string' ? JSON.parse(entry) : entry; }
            catch (e) { return null; }
        }).filter(item => item !== null);

        renderTable(allKeys);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #f87171; padding: 2rem;">Failed to connect to database.</td></tr>`;
    }
}

function renderTable(dataArray) {
    const tbody = document.getElementById('keyTable');
    
    if (dataArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 2rem;">No invoices found.</td></tr>`;
        return;
    }

    tbody.innerHTML = dataArray.map((item, index) => {
        // Data Fallbacks
        const safeOrder = item.orderId || 'MANUAL-GEN';
        const safeProduct = item.product || 'L'; 
        const safeEmail = item.email || 'Not Provided';
        const gateway = item.gateway || item.payment_method || 'Litecoin';
        
        // Price formatting
        let rawPrice = item.amount || item.price || '0.10';
        rawPrice = rawPrice.replace('$', '').replace(' USD', '');
        
        // Truncate long emails for the single-liner table
        const shortEmail = safeEmail.length > 20 ? safeEmail.substring(0, 18) + '...' : safeEmail;

        return `
            <tr onclick="showDetail(${index})">
                <td><span class="badge badge-blue">Manual</span></td>
                <td class="monospace" style="color: var(--text-primary);">${safeOrder}</td>
                <td>${safeProduct}</td>
                <td><span class="badge badge-green solid">+$${rawPrice}</span></td>
                <td class="monospace" style="color: var(--text-primary);">${item.key ? item.key.substring(0, 12) + '...' : 'N/A'}</td>
                <td class="flex-align">
                    <i data-lucide="wallet" class="crypto-icon"></i> ${gateway}
                </td>
                <td style="color: var(--text-secondary);">${shortEmail}</td>
            </tr>
        `;
    }).join('');
    
    lucide.createIcons();
}

// Search Filter
document.getElementById('searchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allKeys.filter(item => 
        (item.orderId && item.orderId.toLowerCase().includes(term)) ||
        (item.email && item.email.toLowerCase().includes(term)) ||
        (item.key && item.key.toLowerCase().includes(term))
    );
    renderTable(filtered);
});

// Initial load
window.onload = fetchKeys;
