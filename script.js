// Initialize Icons on load
lucide.createIcons();

let allKeys = []; // Store data locally for fast searching

// Function to fetch and display keys
async function fetchKeys() {
    const tbody = document.getElementById('keyTable');
    const statTotal = document.getElementById('stat-total');
    const refreshIcon = document.getElementById('refreshIcon');
    
    // Spin the refresh button
    refreshIcon.classList.add('spinner');

    try {
        const response = await fetch('/api/keys');
        const data = await response.json();
        
        allKeys = data; // Save to global variable
        statTotal.innerText = data.length || 0;
        
        renderTable(allKeys);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#EF4444;">
            <i data-lucide="alert-triangle"></i> Failed to connect to database.
        </td></tr>`;
        lucide.createIcons();
    } finally {
        setTimeout(() => refreshIcon.classList.remove('spinner'), 500);
    }
}

// Function to render the table rows
function renderTable(dataArray) {
    const tbody = document.getElementById('keyTable');
    
    if (dataArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #9CA3AF;">No keys found in the database.</td></tr>`;
        return;
    }

    tbody.innerHTML = dataArray.map(entry => {
        // Handle parsing if the entry from Redis is a JSON string
        let item = typeof entry === 'string' ? JSON.parse(entry) : entry;
        
        // Format the date nicely
        const dateObj = new Date(item.timestamp || item.generated_at || Date.now());
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });

        return `
            <tr>
                <td style="color: #9CA3AF;">${formattedDate}</td>
                <td style="font-weight: 500;">#${item.orderId || 'MANUAL-GEN'}</td>
                <td>${item.product || 'Unknown Product'}</td>
                <td><code>${item.key || 'N/A'}</code></td>
                <td>
                    <button class="copy-btn" onclick="copyKey('${item.key}')">
                        <i data-lucide="copy" style="width: 14px; height: 14px;"></i> Copy
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Re-initialize icons for the newly injected HTML
    lucide.createIcons();
}

// Live Search Filtering
document.getElementById('searchInput').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = allKeys.filter(entry => {
        let item = typeof entry === 'string' ? JSON.parse(entry) : entry;
        // Search through orderId, product, or the key itself
        return (item.orderId && item.orderId.toLowerCase().includes(searchTerm)) ||
               (item.product && item.product.toLowerCase().includes(searchTerm)) ||
               (item.key && item.key.toLowerCase().includes(searchTerm));
    });
    renderTable(filtered);
});

// Slick Copy to Clipboard with Toast Notification
function copyKey(keyText) {
    if (!keyText || keyText === 'N/A') return;
    
    navigator.clipboard.writeText(keyText).then(() => {
        const toast = document.getElementById('toast');
        toast.classList.add('show');
        
        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    });
}

// Fetch immediately on page load
window.onload = fetchKeys;
