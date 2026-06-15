// Text Comparison (Diff) Tool Implementation

let options = {
  ignoreWhitespace: true,
  ignoreCase: false
};

let viewMode = 'split'; // 'split' or 'unified'
let alignedRows = [];

// Sample Texts to showcase the tool
const sampleOriginal = `// User Authentication Handler
function authenticateUser(username, password) {
  console.log("Attempting login for user: " + username);
  
  if (!username || !password) {
    return { success: false, error: "Missing fields" };
  }
  
  const user = database.findUserByUsername(username);
  if (user && user.password === password) {
    // Session token expires in 1 hour
    const token = generateToken(user.id);
    return {
      success: true,
      token: token,
      expires: Date.now() + 3600000
    };
  }
  
  return { success: false, error: "Invalid credentials" };
}`;

const sampleModified = `// Modernized User Authentication Handler (v2)
import { generateJWT } from './security.js';

export async function authenticateUser(username, password) {
  console.info(\`Attempting login for user: \${username}\`);
  
  if (!username || !password) {
    throw new Error("Missing required credentials");
  }
  
  const user = await database.findUserByUsername(username);
  if (user && await verifyPassword(password, user.passwordHash)) {
    // Session token expires in 2 hours (7200s)
    const token = await generateJWT(user);
    return {
      success: true,
      token,
      expiresIn: 7200
    };
  }
  
  return { success: false, error: "Invalid username or password" };
}`;

// HTML Escaping Utility to prevent rendering glitches and XSS
function escapeHtml(text) {
  if (text === undefined || text === null) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Compute LCS at line level
function computeLineDiff(lines1, lines2) {
  const n = lines1.length;
  const m = lines2.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));

  // Helper to normalize lines based on user settings
  const normalize = (line) => {
    let res = line || '';
    if (options.ignoreCase) {
      res = res.toLowerCase();
    }
    if (options.ignoreWhitespace) {
      res = res.trim().replace(/\s+/g, ' ');
    }
    return res;
  };

  const norm1 = lines1.map(normalize);
  const norm2 = lines2.map(normalize);

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (norm1[i - 1] === norm2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = n;
  let j = m;
  const diff = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && norm1[i - 1] === norm2[j - 1]) {
      diff.push({
        type: 'unchanged',
        leftLineNum: i,
        rightLineNum: j,
        leftValue: lines1[i - 1],
        rightValue: lines2[j - 1]
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.push({
        type: 'added',
        rightLineNum: j,
        rightValue: lines2[j - 1]
      });
      j--;
    } else {
      diff.push({
        type: 'deleted',
        leftLineNum: i,
        leftValue: lines1[i - 1]
      });
      i--;
    }
  }

  return diff.reverse();
}

// Compute LCS at character level (for inline differences)
function computeCharacterDiff(str1, str2) {
  const n = str1.length;
  const m = str2.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = n;
  let j = m;
  const diff = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && str1[i - 1] === str2[j - 1]) {
      diff.push({ type: 'unchanged', val: str1[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.push({ type: 'added', val: str2[j - 1] });
      j--;
    } else {
      diff.push({ type: 'deleted', val: str1[i - 1] });
      i--;
    }
  }

  return diff.reverse();
}

// Formats character diff highlighting (creates a single HTML string with span tags for changed text parts)
function formatLineWithHighlights(charDiff, side) {
  let html = '';
  let currentSpanType = null;
  let currentText = '';

  const flush = () => {
    if (currentText) {
      if (currentSpanType === 'highlight') {
        const cls = side === 'left' ? 'diff-char-delete' : 'diff-char-add';
        html += `<span class="${cls}">${escapeHtml(currentText)}</span>`;
      } else {
        html += escapeHtml(currentText);
      }
      currentText = '';
    }
  };

  for (const token of charDiff) {
    if (side === 'left') {
      if (token.type === 'added') continue; // Ignore added chars on left side
      const isDel = token.type === 'deleted';
      const spanType = isDel ? 'highlight' : 'normal';
      if (spanType !== currentSpanType) {
        flush();
        currentSpanType = spanType;
      }
      currentText += token.val;
    } else {
      if (token.type === 'deleted') continue; // Ignore deleted chars on right side
      const isAdd = token.type === 'added';
      const spanType = isAdd ? 'highlight' : 'normal';
      if (spanType !== currentSpanType) {
        flush();
        currentSpanType = spanType;
      }
      currentText += token.val;
    }
  }
  flush();
  return html;
}

// Group consecutive deleted and added lines together to align them vertically in split view
function alignDiffRows(diff) {
  const rows = [];
  let i = 0;
  while (i < diff.length) {
    if (diff[i].type === 'unchanged') {
      rows.push({
        type: 'unchanged',
        leftLineNum: diff[i].leftLineNum,
        rightLineNum: diff[i].rightLineNum,
        leftValue: diff[i].leftValue,
        rightValue: diff[i].rightValue
      });
      i++;
    } else {
      const deletes = [];
      const adds = [];

      while (i < diff.length && diff[i].type !== 'unchanged') {
        if (diff[i].type === 'deleted') {
          deletes.push(diff[i]);
        } else if (diff[i].type === 'added') {
          adds.push(diff[i]);
        }
        i++;
      }

      // Align deleted lines with corresponding added lines
      const maxLen = Math.max(deletes.length, adds.length);
      for (let k = 0; k < maxLen; k++) {
        if (k < deletes.length && k < adds.length) {
          rows.push({
            type: 'modified',
            leftLineNum: deletes[k].leftLineNum,
            rightLineNum: adds[k].rightLineNum,
            leftValue: deletes[k].leftValue,
            rightValue: adds[k].rightValue
          });
        } else if (k < deletes.length) {
          rows.push({
            type: 'deleted',
            leftLineNum: deletes[k].leftLineNum,
            leftValue: deletes[k].leftValue
          });
        } else {
          rows.push({
            type: 'added',
            rightLineNum: adds[k].rightLineNum,
            rightValue: adds[k].rightValue
          });
        }
      }
    }
  }
  return rows;
}

// Run comparison and update view
function runComparison() {
  const leftInput = document.getElementById('diff-input-left');
  const rightInput = document.getElementById('diff-input-right');
  const resultsCard = document.getElementById('diff-results-card');
  const statsContainer = document.getElementById('diff-stats');

  if (!leftInput || !rightInput || !resultsCard || !statsContainer) return;

  const leftText = leftInput.value;
  const rightText = rightInput.value;

  // Split lines (supporting Windows and Unix line endings)
  const lines1 = leftText.split(/\r?\n/);
  const lines2 = rightText.split(/\r?\n/);

  // Avoid running diff on blank inputs
  if (leftText.trim() === '' && rightText.trim() === '') {
    resultsCard.style.display = 'none';
    window.showToast('Please enter text in the fields to compare', 'info');
    return;
  }

  // Compute Line Diff and Align Rows
  const rawDiff = computeLineDiff(lines1, lines2);
  alignedRows = alignDiffRows(rawDiff);

  // Statistics counters
  let additions = 0;
  let deletions = 0;
  let modifications = 0;

  alignedRows.forEach(row => {
    if (row.type === 'added') additions++;
    else if (row.type === 'deleted') deletions++;
    else if (row.type === 'modified') modifications++;
  });

  const totalChanges = additions + deletions + modifications;

  // Render Stats Header
  if (totalChanges === 0) {
    statsContainer.innerHTML = `
      <div class="diff-status-indicator status-clean">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-success"><circle cx="12" cy="12" r="10"></circle><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <span>No differences found! The texts are identical.</span>
      </div>
    `;
  } else {
    statsContainer.innerHTML = `
      <div class="diff-status-indicator">
        <span class="diff-stat-chip chip-modified">${modifications} modified</span>
        <span class="diff-stat-chip chip-added">+${additions} additions</span>
        <span class="diff-stat-chip chip-deleted">-${deletions} deletions</span>
      </div>
    `;
  }

  // Reveal results card
  resultsCard.style.display = 'block';

  // Render the current view mode
  renderDiffViews();
  
  window.showToast(totalChanges === 0 ? 'Texts are identical' : `Comparison complete: found ${totalChanges} changes`, 'success');
}

// Renders either Side-by-Side (Split) or Unified (Inline) depending on active tab
function renderDiffViews() {
  const splitContainer = document.getElementById('diff-split-container');
  const unifiedContainer = document.getElementById('diff-unified-container');

  if (!splitContainer || !unifiedContainer) return;

  if (viewMode === 'split') {
    splitContainer.style.display = 'flex';
    unifiedContainer.style.display = 'none';
    renderSplitView(splitContainer);
  } else {
    splitContainer.style.display = 'none';
    unifiedContainer.style.display = 'flex';
    renderUnifiedView(unifiedContainer);
  }
}

// Side-by-Side renderer
function renderSplitView(container) {
  let html = '';

  alignedRows.forEach(row => {
    if (row.type === 'unchanged') {
      html += `
        <div class="diff-row row-unchanged">
          <div class="diff-line-number">${row.leftLineNum}</div>
          <div class="diff-line-content border-divider">${escapeHtml(row.leftValue)}</div>
          <div class="diff-line-number">${row.rightLineNum}</div>
          <div class="diff-line-content">${escapeHtml(row.rightValue)}</div>
        </div>
      `;
    } else if (row.type === 'deleted') {
      html += `
        <div class="diff-row row-deleted">
          <div class="diff-line-number">${row.leftLineNum}</div>
          <div class="diff-line-content border-divider"><span class="diff-line-prefix">-</span>${escapeHtml(row.leftValue)}</div>
          <div class="diff-line-number empty-cell"></div>
          <div class="diff-line-content empty-cell filler-stripes"></div>
        </div>
      `;
    } else if (row.type === 'added') {
      html += `
        <div class="diff-row row-added">
          <div class="diff-line-number empty-cell"></div>
          <div class="diff-line-content border-divider empty-cell filler-stripes"></div>
          <div class="diff-line-number">${row.rightLineNum}</div>
          <div class="diff-line-content"><span class="diff-line-prefix">+</span>${escapeHtml(row.rightValue)}</div>
        </div>
      `;
    } else if (row.type === 'modified') {
      // Inline character diff
      const charDiff = computeCharacterDiff(row.leftValue, row.rightValue);
      
      // Calculate how similar they are. If too divergent, highlight whole lines instead of single characters.
      const lcsLen = charDiff.filter(c => c.type === 'unchanged').length;
      const maxLen = Math.max(row.leftValue.length, row.rightValue.length);
      const similarity = maxLen > 0 ? lcsLen / maxLen : 0;

      let leftHtml = '';
      let rightHtml = '';

      if (similarity >= 0.25) {
        // Show inline changes
        leftHtml = formatLineWithHighlights(charDiff, 'left');
        rightHtml = formatLineWithHighlights(charDiff, 'right');
      } else {
        // Fallback: highlight the whole lines
        leftHtml = escapeHtml(row.leftValue);
        rightHtml = escapeHtml(row.rightValue);
      }

      html += `
        <div class="diff-row row-modified">
          <div class="diff-line-number">${row.leftLineNum}</div>
          <div class="diff-line-content border-divider"><span class="diff-line-prefix">-</span>${leftHtml}</div>
          <div class="diff-line-number">${row.rightLineNum}</div>
          <div class="diff-line-content"><span class="diff-line-prefix">+</span>${rightHtml}</div>
        </div>
      `;
    }
  });

  container.innerHTML = html;
}

// Unified / Inline renderer
function renderUnifiedView(container) {
  let html = '';

  alignedRows.forEach(row => {
    if (row.type === 'unchanged') {
      html += `
        <div class="diff-row row-unchanged">
          <div class="diff-line-number">${row.leftLineNum}</div>
          <div class="diff-line-number">${row.rightLineNum}</div>
          <div class="diff-line-content">${escapeHtml(row.leftValue)}</div>
        </div>
      `;
    } else if (row.type === 'deleted') {
      html += `
        <div class="diff-row row-deleted">
          <div class="diff-line-number">${row.leftLineNum}</div>
          <div class="diff-line-number empty-cell"></div>
          <div class="diff-line-content"><span class="diff-line-prefix">-</span>${escapeHtml(row.leftValue)}</div>
        </div>
      `;
    } else if (row.type === 'added') {
      html += `
        <div class="diff-row row-added">
          <div class="diff-line-number empty-cell"></div>
          <div class="diff-line-number">${row.rightLineNum}</div>
          <div class="diff-line-content"><span class="diff-line-prefix">+</span>${escapeHtml(row.rightValue)}</div>
        </div>
      `;
    } else if (row.type === 'modified') {
      const charDiff = computeCharacterDiff(row.leftValue, row.rightValue);
      const lcsLen = charDiff.filter(c => c.type === 'unchanged').length;
      const maxLen = Math.max(row.leftValue.length, row.rightValue.length);
      const similarity = maxLen > 0 ? lcsLen / maxLen : 0;

      let leftHtml = '';
      let rightHtml = '';

      if (similarity >= 0.25) {
        leftHtml = formatLineWithHighlights(charDiff, 'left');
        rightHtml = formatLineWithHighlights(charDiff, 'right');
      } else {
        leftHtml = escapeHtml(row.leftValue);
        rightHtml = escapeHtml(row.rightValue);
      }

      // Print deletions first, then additions underneath
      html += `
        <div class="diff-row row-deleted">
          <div class="diff-line-number">${row.leftLineNum}</div>
          <div class="diff-line-number empty-cell"></div>
          <div class="diff-line-content"><span class="diff-line-prefix">-</span>${leftHtml}</div>
        </div>
        <div class="diff-row row-added">
          <div class="diff-line-number empty-cell"></div>
          <div class="diff-line-number">${row.rightLineNum}</div>
          <div class="diff-line-content"><span class="diff-line-prefix">+</span>${rightHtml}</div>
        </div>
      `;
    }
  });

  container.innerHTML = html;
}

// Copy git-style Unified Diff to Clipboard
function copyUnifiedDiff() {
  if (alignedRows.length === 0) {
    window.showToast('No diff results to copy', 'info');
    return;
  }

  let diffText = '';
  
  alignedRows.forEach(row => {
    if (row.type === 'unchanged') {
      diffText += `  ${row.leftValue}\n`;
    } else if (row.type === 'deleted') {
      diffText += `-${row.leftValue}\n`;
    } else if (row.type === 'added') {
      diffText += `+${row.rightValue}\n`;
    } else if (row.type === 'modified') {
      diffText += `-${row.leftValue}\n`;
      diffText += `+${row.rightValue}\n`;
    }
  });

  navigator.clipboard.writeText(diffText)
    .then(() => {
      window.showToast('Unified diff copied to clipboard', 'success');
    })
    .catch(() => {
      window.showToast('Failed to copy diff', 'error');
    });
}

// Swap Original and Modified input boxes
function swapInputs() {
  const leftInput = document.getElementById('diff-input-left');
  const rightInput = document.getElementById('diff-input-right');

  if (!leftInput || !rightInput) return;

  const temp = leftInput.value;
  leftInput.value = rightInput.value;
  rightInput.value = temp;

  window.showToast('Inputs swapped', 'success');

  // Re-run comparison if result card is already visible
  const resultsCard = document.getElementById('diff-results-card');
  if (resultsCard && resultsCard.style.display !== 'none') {
    runComparison();
  }
}

// Load high-fidelity sample code
function loadSampleData() {
  const leftInput = document.getElementById('diff-input-left');
  const rightInput = document.getElementById('diff-input-right');

  if (!leftInput || !rightInput) return;

  leftInput.value = sampleOriginal;
  rightInput.value = sampleModified;

  window.showToast('Loaded sample JavaScript functions', 'success');
  runComparison();
}

// Clear individual panes
function clearLeftInput() {
  const leftInput = document.getElementById('diff-input-left');
  if (leftInput) {
    leftInput.value = '';
    window.showToast('Cleared original text', 'success');
  }
}

function clearRightInput() {
  const rightInput = document.getElementById('diff-input-right');
  if (rightInput) {
    rightInput.value = '';
    window.showToast('Cleared modified text', 'success');
  }
}

// Initializer
export function initDiff() {
  // Compare Mode tabs (Side-by-Side / Unified)
  const modeSplitBtn = document.getElementById('diff-mode-split');
  const modeUnifiedBtn = document.getElementById('diff-mode-unified');

  if (modeSplitBtn && modeUnifiedBtn) {
    modeSplitBtn.addEventListener('click', () => {
      viewMode = 'split';
      modeSplitBtn.classList.add('active');
      modeUnifiedBtn.classList.remove('active');
      renderDiffViews();
    });

    modeUnifiedBtn.addEventListener('click', () => {
      viewMode = 'unified';
      modeUnifiedBtn.classList.add('active');
      modeSplitBtn.classList.remove('active');
      renderDiffViews();
    });
  }

  // Toggles (Whitespace / Case)
  const whitespaceToggle = document.getElementById('diff-whitespace-toggle');
  if (whitespaceToggle) {
    whitespaceToggle.addEventListener('click', () => {
      options.ignoreWhitespace = !options.ignoreWhitespace;
      whitespaceToggle.classList.toggle('active', options.ignoreWhitespace);
      
      // Re-run comparison if active
      const resultsCard = document.getElementById('diff-results-card');
      if (resultsCard && resultsCard.style.display !== 'none') {
        runComparison();
      }
    });
  }

  const caseToggle = document.getElementById('diff-case-toggle');
  if (caseToggle) {
    caseToggle.addEventListener('click', () => {
      options.ignoreCase = !options.ignoreCase;
      caseToggle.classList.toggle('active', options.ignoreCase);
      
      // Re-run comparison if active
      const resultsCard = document.getElementById('diff-results-card');
      if (resultsCard && resultsCard.style.display !== 'none') {
        runComparison();
      }
    });
  }

  // Action Buttons
  const compareBtn = document.getElementById('diff-compare-btn');
  if (compareBtn) compareBtn.addEventListener('click', runComparison);

  const swapBtn = document.getElementById('diff-swap-btn');
  if (swapBtn) swapBtn.addEventListener('click', swapInputs);

  const sampleBtn = document.getElementById('diff-sample-btn');
  if (sampleBtn) sampleBtn.addEventListener('click', loadSampleData);

  const clearLeftBtn = document.getElementById('diff-clear-left-btn');
  if (clearLeftBtn) clearLeftBtn.addEventListener('click', clearLeftInput);

  const clearRightBtn = document.getElementById('diff-clear-right-btn');
  if (clearRightBtn) clearRightBtn.addEventListener('click', clearRightInput);

  const copyBtn = document.getElementById('diff-copy-btn');
  if (copyBtn) copyBtn.addEventListener('click', copyUnifiedDiff);
}
