// Formatter Tool Implementation

let activeMode = 'json'; // 'json' or 'xml'

// HTML Escaping for XML serialization
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// XML Beautifier Traverser
function formatXMLNode(node, indentStr, currentIndent = 0) {
  const pad = indentStr.repeat(currentIndent);

  // Element Node
  if (node.nodeType === 1) { // Node.ELEMENT_NODE
    let result = pad + '<' + node.nodeName;

    // Attributes
    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes[i];
      result += ` ${attr.name}="${escapeHTML(attr.value)}"`;
    }

    if (node.childNodes.length === 0) {
      result += ' />';
      return result;
    }

    // Check if element has only text children
    const hasOnlyTextChildren = Array.from(node.childNodes).every(
      child => child.nodeType === 3 || child.nodeType === 4 // Node.TEXT_NODE or Node.CDATA_SECTION_NODE
    );

    if (hasOnlyTextChildren) {
      const textContent = node.textContent.trim();
      if (textContent === '') {
        result += ' />';
      } else {
        result += '>';
        if (node.firstChild && node.firstChild.nodeType === 4) {
          result += `<![CDATA[${node.textContent}]]>`;
        } else {
          result += escapeHTML(textContent);
        }
        result += `</${node.nodeName}>`;
      }
      return result;
    }

    result += '>\n';

    // Children traversal
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      // Ignore empty white-space nodes
      if (child.nodeType === 3 && child.textContent.trim() === '') {
        continue;
      }
      const childStr = formatXMLNode(child, indentStr, currentIndent + 1);
      if (childStr) {
        result += childStr + '\n';
      }
    }

    result += pad + `</${node.nodeName}>`;
    return result;
  }

  // Text Node
  if (node.nodeType === 3) { // Node.TEXT_NODE
    const text = node.textContent.trim();
    return text ? pad + escapeHTML(text) : '';
  }

  // CDATA Section
  if (node.nodeType === 4) { // Node.CDATA_SECTION_NODE
    return pad + `<![CDATA[${node.textContent}]]>`;
  }

  // Comment Node
  if (node.nodeType === 8) { // Node.COMMENT_NODE
    return pad + `<!-- ${node.textContent.trim()} -->`;
  }

  // Processing Instruction
  if (node.nodeType === 7) { // Node.PROCESSING_INSTRUCTION_NODE
    return pad + `<?${node.target} ${node.data}?>`;
  }

  // Document Node / Fragment
  if (node.nodeType === 9 || node.nodeType === 11) { // DOCUMENT or FRAGMENT
    let result = '';
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      const childStr = formatXMLNode(child, indentStr, currentIndent);
      if (childStr) {
        result += childStr + '\n';
      }
    }
    return result.trim();
  }

  return '';
}

// XML Formatting Main Function
function formatXML(xmlString, indentStr) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');
  
  // Check for parsing errors
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error(parserError.textContent.trim() || 'XML parsing error');
  }

  return formatXMLNode(doc, indentStr, 0);
}

// XML Minifier
function minifyXML(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');
  
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error(parserError.textContent.trim() || 'XML parsing error');
  }

  function minifyNode(node) {
    if (node.nodeType === 1) { // ELEMENT
      let result = '<' + node.nodeName;
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        result += ` ${attr.name}="${escapeHTML(attr.value)}"`;
      }
      
      if (node.childNodes.length === 0) {
        return result + ' />';
      }
      
      let childResult = '';
      for (let i = 0; i < node.childNodes.length; i++) {
        childResult += minifyNode(node.childNodes[i]);
      }
      
      if (childResult === '') {
        return result + ' />';
      }
      
      return result + '>' + childResult + `</${node.nodeName}>`;
    }
    
    if (node.nodeType === 3) { // TEXT
      return node.textContent.trim();
    }
    
    if (node.nodeType === 4) { // CDATA
      return `<![CDATA[${node.textContent}]]>`;
    }
    
    if (node.nodeType === 7) { // PROCESSING INSTRUCTION
      return `<?${node.target} ${node.data}?>`;
    }
    
    // Ignore comments (nodeType 8) for aggressive minification
    
    if (node.nodeType === 9 || node.nodeType === 11) { // DOCUMENT / FRAGMENT
      let result = '';
      for (let i = 0; i < node.childNodes.length; i++) {
        result += minifyNode(node.childNodes[i]);
      }
      return result;
    }
    
    return '';
  }

  return minifyNode(doc);
}

// Core Operations
function handleBeautify() {
  const inputEl = document.getElementById('format-input');
  const outputEl = document.getElementById('format-output');
  const errorEl = document.getElementById('formatter-error');
  const errorTextEl = document.getElementById('formatter-error-text');

  if (!inputEl || !outputEl) return;

  const rawInput = inputEl.value.trim();
  if (!rawInput) {
    outputEl.value = '';
    hideError();
    return;
  }

  // Get spacing choice
  const indentSelect = document.getElementById('indent-size');
  const indentVal = indentSelect ? indentSelect.value : '2';
  let indentStr = '  ';
  if (indentVal === '4') indentStr = '    ';
  if (indentVal === 'tab') indentStr = '\t';

  try {
    hideError();
    if (activeMode === 'json') {
      const parsed = JSON.parse(rawInput);
      outputEl.value = JSON.stringify(parsed, null, indentStr);
    } else {
      outputEl.value = formatXML(rawInput, indentStr);
    }
    window.showToast('Formatted successfully', 'success');
  } catch (error) {
    showError(error.message);
  }
}

function handleMinify() {
  const inputEl = document.getElementById('format-input');
  const outputEl = document.getElementById('format-output');

  if (!inputEl || !outputEl) return;

  const rawInput = inputEl.value.trim();
  if (!rawInput) {
    outputEl.value = '';
    hideError();
    return;
  }

  try {
    hideError();
    if (activeMode === 'json') {
      const parsed = JSON.parse(rawInput);
      outputEl.value = JSON.stringify(parsed);
    } else {
      outputEl.value = minifyXML(rawInput);
    }
    window.showToast('Minified successfully', 'success');
  } catch (error) {
    showError(error.message);
  }
}

// Error UI Controllers
function showError(msg) {
  const errorEl = document.getElementById('formatter-error');
  const errorTextEl = document.getElementById('formatter-error-text');
  if (errorEl && errorTextEl) {
    errorTextEl.textContent = msg;
    errorEl.classList.add('visible');
  }
}

function hideError() {
  const errorEl = document.getElementById('formatter-error');
  if (errorEl) {
    errorEl.classList.remove('visible');
  }
}

// Copy & Clear Utility
function copyOutput() {
  const outputEl = document.getElementById('format-output');
  if (!outputEl || !outputEl.value) {
    window.showToast('No formatted content to copy', 'info');
    return;
  }

  navigator.clipboard.writeText(outputEl.value)
    .then(() => {
      window.showToast('Copied output to clipboard', 'success');
    })
    .catch(() => {
      window.showToast('Failed to copy', 'error');
    });
}

function clearEditors() {
  const inputEl = document.getElementById('format-input');
  const outputEl = document.getElementById('format-output');
  if (inputEl) inputEl.value = '';
  if (outputEl) outputEl.value = '';
  hideError();
  window.showToast('Cleared formatter editors', 'success');
}

// Mode Switching
function setMode(mode) {
  activeMode = mode;
  const jsonBtn = document.getElementById('format-mode-json');
  const xmlBtn = document.getElementById('format-mode-xml');
  const inputEl = document.getElementById('format-input');

  if (mode === 'json') {
    if (jsonBtn) jsonBtn.classList.add('active');
    if (xmlBtn) xmlBtn.classList.remove('active');
    if (inputEl) inputEl.placeholder = 'Paste your raw JSON here...\nExample: {"name":"John", "age":30, "city":"New York"}';
  } else {
    if (jsonBtn) jsonBtn.classList.remove('active');
    if (xmlBtn) xmlBtn.classList.add('active');
    if (inputEl) inputEl.placeholder = 'Paste your raw XML here...\nExample: <user><name>John</name><age>30</age></user>';
  }
  
  // Refresh outputs
  const outputEl = document.getElementById('format-output');
  if (outputEl) outputEl.value = '';
  hideError();
}

// Initializer
export function initFormatter() {
  // Mode Button listeners
  const jsonBtn = document.getElementById('format-mode-json');
  const xmlBtn = document.getElementById('format-mode-xml');

  if (jsonBtn) jsonBtn.addEventListener('click', () => setMode('json'));
  if (xmlBtn) xmlBtn.addEventListener('click', () => setMode('xml'));

  // Action listeners
  const beautifyBtn = document.getElementById('beautify-btn');
  const minifyBtn = document.getElementById('minify-btn');
  const copyBtn = document.getElementById('format-copy-btn');
  const clearBtn = document.getElementById('format-clear-btn');

  if (beautifyBtn) beautifyBtn.addEventListener('click', handleBeautify);
  if (minifyBtn) minifyBtn.addEventListener('click', handleMinify);
  if (copyBtn) copyBtn.addEventListener('click', copyOutput);
  if (clearBtn) clearBtn.addEventListener('click', clearEditors);

  // Set default state
  setMode('json');
}
