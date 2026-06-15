// Calculator Tool Implementation

let expression = '';
let isResultShown = false;

// Safe parser and evaluator for mathematical expressions
function evaluateExpression(exprStr) {
  if (!exprStr.trim()) return '';

  // Sanitize operators for execution
  const sanitized = exprStr
    .replace(/÷/g, '/')
    .replace(/×/g, '*')
    .replace(/−/g, '-');

  // Tokenize: numbers (including decimals), operators (+, -, *, /, %, (, ))
  const tokens = sanitized.match(/\d+(?:\.\d+)?|[\+\-\*\/\%\(\)]/g) || [];
  if (tokens.length === 0) return '';

  let index = 0;

  function peek() {
    return tokens[index];
  }

  function consume(expected) {
    const token = peek();
    if (expected && token !== expected) {
      throw new Error(`Expected ${expected} but got ${token}`);
    }
    index++;
    return token;
  }

  function parseExpr() {
    let result = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const right = parseTerm();
      if (op === '+') result += right;
      else result -= right;
    }
    return result;
  }

  function parseTerm() {
    let result = parseFactor();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = consume();
      const right = parseFactor();
      if (op === '*') {
        result *= right;
      } else if (op === '/') {
        if (right === 0) throw new Error("Division by zero");
        result /= right;
      } else if (op === '%') {
        result %= right;
      }
    }
    return result;
  }

  function parseFactor() {
    const next = peek();
    if (next === '-') {
      consume();
      return -parseFactor();
    }
    if (next === '+') {
      consume();
      return parseFactor();
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const token = peek();
    if (!token) throw new Error("Unexpected end of expression");

    if (token === '(') {
      consume('(');
      const result = parseExpr();
      consume(')');
      return result;
    }

    // Must be a number
    if (/^\d+(?:\.\d+)?$/.test(token)) {
      consume();
      return parseFloat(token);
    }

    throw new Error(`Unexpected token "${token}"`);
  }

  const result = parseExpr();
  if (index < tokens.length) {
    throw new Error("Invalid syntax");
  }

  // Format result to avoid floating point precision issues (e.g. 0.1 + 0.2)
  if (Number.isInteger(result)) {
    return result.toString();
  } else {
    // Check if it has a very long decimal component
    const resStr = result.toString();
    if (resStr.includes('.') && resStr.split('.')[1].length > 10) {
      return parseFloat(result.toFixed(10)).toString(); // round to max 10 decimal places and strip trailing zeros
    }
    return resStr;
  }
}

// History Management
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem('bldash_calc_history')) || [];
  } catch (e) {
    return [];
  }
}

function saveHistory(expr, res) {
  const history = getHistory();
  // Don't save duplicate consecutive calculations
  if (history.length > 0 && history[0].expr === expr) return;

  history.unshift({ expr, res });
  // Keep last 50 items
  if (history.length > 50) history.pop();
  localStorage.setItem('bldash_calc_history', JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const container = document.getElementById('calc-history-list');
  if (!container) return;

  const history = getHistory();
  if (history.length === 0) {
    container.innerHTML = `
      <div class="calc-history-empty">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span>No calculation history yet</span>
      </div>
    `;
    return;
  }

  container.innerHTML = history.map((item, index) => `
    <div class="calc-history-item" data-index="${index}">
      <div class="calc-hist-expr">${item.expr}</div>
      <div class="calc-hist-res">= ${item.res}</div>
    </div>
  `).join('');

  // Attach restore listeners
  container.querySelectorAll('.calc-history-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.getAttribute('data-index'));
      const record = history[idx];
      if (record) {
        expression = record.expr;
        updateDisplay(record.res);
        isResultShown = true;
      }
    });
  });
}

function clearHistory() {
  localStorage.removeItem('bldash_calc_history');
  renderHistory();
  window.showToast('Calculation history cleared', 'success');
}

// Display Updates
function updateDisplay(resultOverride = null) {
  const formulaEl = document.getElementById('calc-formula');
  const currentEl = document.getElementById('calc-current');

  if (formulaEl) {
    formulaEl.textContent = expression;
  }

  if (currentEl) {
    if (resultOverride !== null) {
      currentEl.textContent = resultOverride;
    } else {
      currentEl.textContent = expression || '0';
    }
  }
}

// Calculator operations
function handleKeyPress(key) {
  const ops = ['+', '-', '*', '/', '%', '÷', '×', '−'];
  
  if (isResultShown) {
    // If result was just calculated, start new expression or chain it
    if (ops.includes(key)) {
      const currentVal = document.getElementById('calc-current').textContent;
      expression = currentVal + ' ' + key + ' ';
    } else {
      expression = key === '.' ? '0.' : key;
    }
    isResultShown = false;
  } else {
    // Formatting operators with surrounding spacing for readability
    if (ops.includes(key)) {
      // Map basic key codes to nice symbols
      let symbol = key;
      if (key === '/') symbol = '÷';
      if (key === '*') symbol = '×';
      if (key === '-') symbol = '−';

      // Avoid double spacing operators
      if (expression.endsWith(' ')) {
        // Replace previous operator
        expression = expression.slice(0, -3) + ' ' + symbol + ' ';
      } else if (expression.length > 0) {
        expression += ' ' + symbol + ' ';
      } else if (symbol === '−') {
        // Allow starting expression with negative sign
        expression += '−';
      }
    } else if (key === '(' || key === ')') {
      expression += key;
    } else if (key === '.') {
      // Basic decimal protection
      const parts = expression.split(/[\+\-\*\/\%\(\)\s]+/);
      const currentNum = parts[parts.length - 1];
      if (!currentNum.includes('.')) {
        expression += currentNum === '' ? '0.' : '.';
      }
    } else {
      expression += key;
    }
  }
  updateDisplay();
}

function handleBackspace() {
  if (isResultShown) {
    expression = '';
    isResultShown = false;
  } else if (expression.length > 0) {
    // If ending with operator (with spaces), delete the whole operator space block
    if (expression.endsWith(' ')) {
      expression = expression.slice(0, -3);
    } else {
      expression = expression.slice(0, -1);
    }
  }
  updateDisplay();
}

function handleClear() {
  expression = '';
  isResultShown = false;
  updateDisplay();
}

function handleCalculate() {
  if (!expression) return;
  try {
    const result = evaluateExpression(expression);
    const savedExpr = expression;
    updateDisplay(result);
    isResultShown = true;
    
    // Save to history
    saveHistory(savedExpr, result);
  } catch (error) {
    window.showToast(error.message || 'Invalid calculation', 'error');
  }
}

// Keyboard binding listener
function handleKeyboard(e) {
  // If the user has focus on a text input/textarea, do not intercept keyboard events!
  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
    return;
  }

  const activeView = document.querySelector('.tool-view.active');
  if (!activeView || activeView.id !== 'calculator-view') return;

  const key = e.key;
  if (key >= '0' && key <= '9') {
    handleKeyPress(key);
  } else if (key === '.') {
    handleKeyPress('.');
  } else if (key === '+' || key === '-' || key === '*' || key === '/' || key === '%') {
    handleKeyPress(key);
  } else if (key === '(' || key === ')') {
    handleKeyPress(key);
  } else if (key === 'Enter' || key === '=') {
    e.preventDefault();
    handleCalculate();
  } else if (key === 'Backspace') {
    handleBackspace();
  } else if (key === 'Escape') {
    handleClear();
  }
}

// Initializer
export function initCalculator() {
  // Button Event Listeners
  const grid = document.querySelector('.calc-grid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (!button) return;

      const val = button.getAttribute('data-val');
      const action = button.getAttribute('data-action');

      if (val) {
        handleKeyPress(val);
      } else if (action === 'clear') {
        handleClear();
      } else if (action === 'backspace') {
        handleBackspace();
      } else if (action === 'calculate') {
        handleCalculate();
      }
    });
  }

  // Clear History
  const clearHistBtn = document.getElementById('clear-history-btn');
  if (clearHistBtn) {
    clearHistBtn.addEventListener('click', clearHistory);
  }

  // Keyboard binding
  window.addEventListener('keydown', handleKeyboard);

  // Render history on load
  renderHistory();
}
