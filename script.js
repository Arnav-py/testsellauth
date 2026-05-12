lucide.createIcons();
let allKeys = [];

// Navigation Logic
function showDetail(index) {
    const item = allKeys[index];
    if(!item) return;

    // Hide table, show detail
    document.getElementById('view-table').style.display = 'none';
    document.getElementById('view-detail').style.display = 'block';

    // Populate Data
    const dateObj = new Date(item.timestamp || item.generated_at || Date.now());
    
    document.getElementById('det-id').innerText = item.orderId || 'MANUAL-GEN-' + Math.floor(Math.random()*10000);
    document.getElementById('det-key').innerText = item.key || 'N/A';
    document.getElementById('det-date').innerText = dateObj.toLocaleString('en-GB');
    document.getElementById('det-email').innerText = item.email || 'Not Provided';
    
    // Formatting Price (Mimicking the image)
    const price = item.amount || item.price || '0.10';
    document.getElementById('det-paid').innerText = `+$${price}`;
    
    // Formatting Discord ID if claimed
    const discordLabel = document.getElementById('det-discord');
    if(item.claimed_by) {
        discordLabel.innerText = item.claimed_by;
        discordLabel.classList.add('blue-text');
    } else {
        discordLabel.innerText = 'Not Claimed';
        discordLabel.classList.remove('blue-text');
    }
}

function showTable() {
    document.getElementById('view-detail').style.display = 'none';
    document.getElementById('view-table').style.display = 'block';
}

function copyDetailKey() {
    const keyText = document.getElementById('det-key').innerText;
    navigator.clipboard.writeText(keyText);
    alert("Product Key Copied!"); // Simple alert matching the minimal style
}

// Data Fetching
async function fetchKeys() {
    const tbody = document.getElementById('keyTable');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #8b949e;">Refreshing data...</td></tr>`;
    
    try {
        const response = await fetch('/api/keys');
        const data = await response.json();
        
        allKeys = data.map(entry => {
            try { return typeof entry === 'string' ? JSON.parse(entry) : entry; }
            catch (e) { return null; }
        }).filter(item => item !== null);

        renderTable(allKeys);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #f85149;">Database Error</td></tr>`;
    }
}

function renderTable(dataArray) {
    const tbody = document.getElementById('keyTable');
    if (dataArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #8b949e;">No invoices found.</td></tr>`;
        return;
    }

    tbody.innerHTML = dataArray.map((item, index) => {
        const safeOrder = item.orderId || 'MANUAL-GEN';
        const safeProduct = item.product || 'L'; // 'L' to match your image
        const safePrice = item.amount || item.price || '0.10';
        const safeEmail = item.email ? (item.email.length > 15 ? item.email.substring(0, 15) + '...' : item.email) : 'Not Provided';
        const gateway = item.gateway || 'Litecoin';

        return `
            <tr class="clickable-row" onclick="showDetail(${index})">
                <td><span class="badge blue">Manual</span></td>
                <td class="monospace">${safeOrder}</td>
                <td>${safeProduct}</td>
                <td class="monospace">${item.key ? item.key.substring(0, 10) + '...' : 'N/A'}</td>
                <td class="text-green">+$${safePrice}</td>
                <td style="color: #8b949e;">
                    <i data-lucide="gem" style="width: 14px; vertical-align: middle; margin-right: 4px;"></i> ${gateway}
                </td>
                <td style="color: #8b949e;">${safeEmail}</td>
            </tr>
        `;
    }).join('');
    
    lucide.createIcons();
}

// Live Search
document.getElementById('searchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allKeys.filter(item => 
        (item.orderId && item.orderId.toLowerCase().includes(term)) ||
        (item.email && item.email.toLowerCase().includes(term)) ||
        (item.key && item.key.toLowerCase().includes(term))
    );
    renderTable(filtered);
});

// Init
window.onload = fetchKeys;
