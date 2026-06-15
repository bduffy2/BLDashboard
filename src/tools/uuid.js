// UUID Generator Tool Implementation

let currentUuids = [];
let options = {
  version: '4', // '4' or '7'
  quantity: 5,
  uppercase: false,
  hyphens: true
};

// UUID v4 Generator
function generateV4() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Safe Fallback
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xxxxxx
  
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// UUID v7 Generator (RFC 9562 Time-Ordered)
function generateV7() {
  const bytes = new Uint8Array(16);
  const timestamp = Date.now(); // 48-bit millisecond timestamp
  
  bytes[0] = (timestamp / 0x10000000000) & 0xff;
  bytes[1] = (timestamp / 0x100000000) & 0xff;
  bytes[2] = (timestamp / 0x1000000) & 0xff;
  bytes[3] = (timestamp / 0x10000) & 0xff;
  bytes[4] = (timestamp / 0x100) & 0xff;
  bytes[5] = timestamp & 0xff;
  
  // Fill the remaining 10 bytes with randomness
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes.subarray(6));
  } else {
    for (let i = 6; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  
  bytes[6] = (bytes[6] & 0x0f) | 0x70; // Version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xxxxxx
  
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// Format UUID according to options
function formatUuid(uuidStr) {
  let result = uuidStr;
  if (!options.hyphens) {
    result = result.replace(/-/g, '');
  }
  if (options.uppercase) {
    result = result.toUpperCase();
  }
  return result;
}

// Main Generation Function
function generateUuids() {
  const list = [];
  const qtyInput = document.getElementById('uuid-quantity');
  let quantity = qtyInput ? parseInt(qtyInput.value) : 5;
  
  // Bounds check
  if (isNaN(quantity) || quantity < 1) quantity = 1;
  if (quantity > 500) quantity = 500;
  if (qtyInput) qtyInput.value = quantity;
  
  options.quantity = quantity;

  for (let i = 0; i < quantity; i++) {
    const rawUuid = options.version === '7' ? generateV7() : generateV4();
    list.push(formatUuid(rawUuid));
  }

  currentUuids = list;
  renderUuids();
}

// Render to UI
function renderUuids() {
  const container = document.getElementById('uuid-list-container');
  if (!container) return;

  if (currentUuids.length === 0) {
    container.innerHTML = '<div class="uuid-list-empty">Click generate to create UUIDs</div>';
    return;
  }

  container.innerHTML = currentUuids.map((uuid, index) => `
    <div class="uuid-list-item">
      <span>${uuid}</span>
      <div class="uuid-item-actions">
        <button class="uuid-item-btn btn-copy-hover" data-action="copy" data-index="${index}" title="Copy UUID">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
        <button class="uuid-item-btn" data-action="delete" data-index="${index}" title="Delete">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('');

  // Attach row item action listeners
  container.querySelectorAll('.uuid-item-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = btn.getAttribute('data-action');
      const idx = parseInt(btn.getAttribute('data-index'));
      
      if (action === 'copy') {
        const val = currentUuids[idx];
        if (val) {
          navigator.clipboard.writeText(val)
            .then(() => window.showToast('UUID copied', 'success'))
            .catch(() => window.showToast('Failed to copy', 'error'));
        }
      } else if (action === 'delete') {
        currentUuids.splice(idx, 1);
        renderUuids();
        window.showToast('UUID deleted from list', 'info');
      }
    });
  });
}

// Bulk Actions
function copyAllUuids() {
  if (currentUuids.length === 0) {
    window.showToast('No UUIDs to copy', 'info');
    return;
  }
  const text = currentUuids.join('\n');
  navigator.clipboard.writeText(text)
    .then(() => window.showToast(`Copied all ${currentUuids.length} UUIDs`, 'success'))
    .catch(() => window.showToast('Failed to copy', 'error'));
}

function downloadUuids() {
  if (currentUuids.length === 0) {
    window.showToast('No UUIDs to download', 'info');
    return;
  }
  const text = currentUuids.join('\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `uuids-${options.version === '7' ? 'v7' : 'v4'}-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  window.showToast('Downloaded text file', 'success');
}

// Initializer
export function initUuid() {
  // Version Select
  const versionSelect = document.getElementById('uuid-version');
  if (versionSelect) {
    versionSelect.addEventListener('change', (e) => {
      options.version = e.target.value;
    });
  }

  // Toggles
  const uppercaseToggle = document.getElementById('uuid-uppercase-toggle');
  if (uppercaseToggle) {
    uppercaseToggle.addEventListener('click', () => {
      options.uppercase = !options.uppercase;
      uppercaseToggle.classList.toggle('active', options.uppercase);
    });
  }

  const hyphensToggle = document.getElementById('uuid-hyphens-toggle');
  if (hyphensToggle) {
    // Set active by default matching default options.hyphens = true
    hyphensToggle.classList.add('active');
    hyphensToggle.addEventListener('click', () => {
      options.hyphens = !options.hyphens;
      hyphensToggle.classList.toggle('active', options.hyphens);
    });
  }

  // Action Buttons
  const genBtn = document.getElementById('generate-uuid-btn');
  if (genBtn) genBtn.addEventListener('click', generateUuids);

  const copyAllBtn = document.getElementById('uuid-copy-all-btn');
  if (copyAllBtn) copyAllBtn.addEventListener('click', copyAllUuids);

  const dlBtn = document.getElementById('uuid-download-btn');
  if (dlBtn) dlBtn.addEventListener('click', downloadUuids);

  // Generate initial batch on load
  generateUuids();
}
