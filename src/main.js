import './style.css';
import { initCalculator } from './tools/calculator.js';
import { initFormatter } from './tools/formatter.js';
import { initUuid } from './tools/uuid.js';
import { initEpoch } from './tools/epoch.js';

// Global Toast System
window.showToast = function(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Icon based on type
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  } else {
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }

  toast.innerHTML = `
    ${iconSvg}
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px) scale(0.98)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => {
      if (toast.parentNode === container) {
        container.removeChild(toast);
      }
    }, 200);
  }, 3000);
};

// Tool Definitions for Sidebar Nav Title & Description Updates
const toolsInfo = {
  calculator: {
    title: 'Calculator',
    desc: 'A tactile, keyboard-friendly basic calculator with local history.'
  },
  formatter: {
    title: 'JSON / XML Formatter',
    desc: 'Beautify or minify JSON and XML documents instantly in your browser.'
  },
  uuid: {
    title: 'UUID Generator',
    desc: 'Generate UUID v4 (random) and UUID v7 (time-ordered) in bulk.'
  },
  epoch: {
    title: 'Epoch Timestamp Converter',
    desc: 'Real-time Unix epoch clock and bidirectional timestamp converter.'
  }
};

// Sidebar Nav Switching Logic
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const toolViews = document.querySelectorAll('.tool-view');
  const viewTitle = document.getElementById('view-title');
  const viewDesc = document.getElementById('view-desc');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTool = item.getAttribute('data-tool');
      if (!targetTool) return;

      // Update active nav state
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      // Update active view visibility
      toolViews.forEach(view => {
        if (view.id === `${targetTool}-view`) {
          view.classList.add('active');
        } else {
          view.classList.remove('active');
        }
      });

      // Update header content
      const info = toolsInfo[targetTool];
      if (info && viewTitle && viewDesc) {
        viewTitle.textContent = info.title;
        viewDesc.textContent = info.desc;
      }
    });
  });
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  
  // Initialize each individual tool module
  initCalculator();
  initFormatter();
  initUuid();
  initEpoch();
});
