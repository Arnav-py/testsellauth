lucide.createIcons();
let allKeys = [];

async function fetchKeys() {
    const feedList = document.getElementById('feedList');
    
    try {
        const response = await fetch('/api/keys');
        const data = await response.json();
        
        // I added a strict parsing layer here to fix the "glitch"
        allKeys = data.map(entry => {
            try { return typeof entry === 'string' ? JSON.parse(entry) : entry; }
            catch (e) { return null; } // Drops corrupted Upstash entries silently
        }).filter(item => item !== null);

        renderFeed(allKeys);
    } catch (err) {
        feedList.innerHTML = `<div class="loading-state" style="color:#ef4444;"><i data-lucide="alert-triangle"></i> Database Error</div>`;
        lucide.createIcons();
    }
}

function renderFeed(dataArray) {
    const feedList = document.getElementById('feedList');
    
    if (dataArray.length === 0) {
        feedList.innerHTML = `<div class="loading-state">No orders found.</div>`;
        return;
    }

    feedList.innerHTML = dataArray.map((item, index) => {
        const dateObj = new Date(item.timestamp || item.generated_at || Date.now());
        const shortDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Ensure no glitches if data is missing
        const safeOrder = item.orderId || 'MANUAL';
        const safeProduct = item.product || 'Unknown Product';

        // Store index so we can pull full data on click
        return `
            <div class="order-card" onclick="viewDetails(${index}, this)">
                <div class="card-top">
                    <span class="card-id">#${safeOrder}</span>
                    <span>${shortDate}</span>
                </div>
                <div class="card-product">${safeProduct}</div>
            </div>
        `;
    }).join('');
}

// THIS LOADS THE SEPARATE PAGE EFFECT
function viewDetails(index, cardElement) {
    // 1. Manage Active Card Styling
    document.querySelectorAll('.order-card').forEach(c => c.classList.remove('active'));
    cardElement.classList.add('active');

    // 2. Hide Empty State, Show Content
    document.getElementById('emptyState').style.display = 'none';
    const contentBox = document.getElementById('detailContent');
    
    // Quick trick to restart the CSS animation every click
    contentBox.style.display = 'none';
    setTimeout(() => { contentBox.style.display = 'block'; }, 10);

    // 3. Inject Data
    const item = allKeys[index];
    const dateObj = new Date(item.timestamp || item.generated_at || Date.now());

    document.getElementById('view-order-id').innerText = `#${item.orderId || 'MANUAL-GEN'}`;
    document.getElementById('view-date').innerText = dateObj.toLocaleString();
    document.getElementById('view-key').innerText = item.key || 'ERR: NO KEY FOUND';
    document.getElementById('view-product').innerText = item.product || 'Unknown';
    document.getElementById('view-email').innerText = item.email || 'Not Provided';
    document.getElementById('view-qty').innerText = item.quantity || '1';
}

// CLICK TO COPY FUNCTION
function copyKeyFromElement(element) {
    const keyText = element.innerText;
    if (!keyText || keyText.includes('ERR')) return;
    
    navigator.clipboard.writeText(keyText).then(() => {
        // Visual feedback on the block itself
        element.style.background = 'rgba(16, 185, 129, 0.1)';
        element.style.borderColor = '#10B981';
        element.style.color = '#10B981';
        
        // Show Toast
        const toast = document.getElementById('toast');
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            // Reset block colors back to Azort blue
            element.style.background = '';
            element.style.borderColor = '';
            element.style.color = '';
        }, 2000);
    });
}

// Live Search
document.getElementById('searchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allKeys.filter(item => 
        (item.orderId && item.orderId.toLowerCase().includes(term)) ||
        (item.product && item.product.toLowerCase().includes(term)) ||
        (item.email && item.email.toLowerCase().includes(term))
    );
    renderFeed(filtered);
});

window.onload = fetchKeys;
