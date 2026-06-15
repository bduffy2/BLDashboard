// Epoch Converter Tool Implementation

let isClockRunning = true;
let clockIntervalId = null;

// Helper to format local date for datetime-local input
function formatLocalDateTime(date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 19);
  return localISOTime;
}

// Relative time string helper
function getRelativeTimeString(date) {
  const delta = date.getTime() - Date.now();
  const absDelta = Math.abs(delta);

  if (absDelta < 2000) return 'just now';

  const seconds = Math.floor(absDelta / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  const prefix = delta >= 0 ? 'in ' : '';
  const suffix = delta < 0 ? ' ago' : '';

  if (years > 0) return `${prefix}${years} year${years > 1 ? 's' : ''}${suffix}`;
  if (months > 0) return `${prefix}${months} month${months > 1 ? 's' : ''}${suffix}`;
  if (days > 0) return `${prefix}${days} day${days > 1 ? 's' : ''}${suffix}`;
  if (hours > 0) return `${prefix}${hours} hour${hours > 1 ? 's' : ''}${suffix}`;
  if (minutes > 0) return `${prefix}${minutes} minute${minutes > 1 ? 's' : ''}${suffix}`;
  return `${prefix}${seconds} second${seconds > 1 ? 's' : ''}${suffix}`;
}

// Live Clock Ticker
function tick() {
  if (!isClockRunning) return;

  const now = Date.now();
  const secEl = document.getElementById('epoch-live-sec');
  const msEl = document.getElementById('epoch-live-ms');

  if (secEl) secEl.textContent = Math.floor(now / 1000);
  if (msEl) msEl.textContent = `${now} ms`;
}

function startClock() {
  isClockRunning = true;
  tick(); // immediate run
  if (clockIntervalId) clearInterval(clockIntervalId);
  clockIntervalId = setInterval(tick, 33); // Ticks ~30 times a second for fluid ms update

  const pauseBtn = document.getElementById('epoch-live-pause-btn');
  if (pauseBtn) {
    pauseBtn.textContent = 'Pause Clock';
    pauseBtn.classList.remove('btn-success');
    pauseBtn.classList.add('btn-secondary');
  }
}

function pauseClock() {
  isClockRunning = false;
  if (clockIntervalId) {
    clearInterval(clockIntervalId);
    clockIntervalId = null;
  }

  const pauseBtn = document.getElementById('epoch-live-pause-btn');
  if (pauseBtn) {
    pauseBtn.textContent = 'Resume Clock';
    pauseBtn.classList.remove('btn-secondary');
    pauseBtn.classList.add('btn-success');
  }
}

// Event handlers
function handleLiveCopy() {
  const currentVal = isClockRunning ? Date.now() : parseInt(document.getElementById('epoch-live-sec').textContent) * 1000;
  const secVal = Math.floor(currentVal / 1000).toString();

  navigator.clipboard.writeText(secVal)
    .then(() => window.showToast(`Copied ${secVal} (seconds) to clipboard`, 'success'))
    .catch(() => window.showToast('Failed to copy', 'error'));
}

function handleEpochToDate() {
  const inputEl = document.getElementById('epoch-input-val');
  const resLocalEl = document.getElementById('epoch-res-local');
  const resUtcEl = document.getElementById('epoch-res-utc');
  const resRelativeEl = document.getElementById('epoch-res-relative');

  if (!inputEl) return;

  const rawInput = inputEl.value.trim();
  if (!rawInput) {
    window.showToast('Please enter an epoch timestamp', 'error');
    return;
  }

  const numInput = parseInt(rawInput);
  if (isNaN(numInput)) {
    window.showToast('Invalid numerical value', 'error');
    return;
  }

  try {
    // Detect seconds vs milliseconds (length <= 10 is seconds, e.g. 1778945600)
    const isSeconds = rawInput.length <= 10;
    const date = new Date(isSeconds ? numInput * 1000 : numInput);

    if (isNaN(date.getTime())) {
      throw new Error("Invalid timestamp range");
    }

    if (resLocalEl) resLocalEl.textContent = date.toLocaleString();
    if (resUtcEl) resUtcEl.textContent = date.toISOString();
    if (resRelativeEl) resRelativeEl.textContent = getRelativeTimeString(date);
    
    window.showToast('Timestamp converted successfully', 'success');
  } catch (error) {
    window.showToast('Failed to parse date from epoch', 'error');
  }
}

function handleDateToEpoch() {
  const dateInput = document.getElementById('date-input-val');
  const resSecEl = document.getElementById('date-res-sec');
  const resMsEl = document.getElementById('date-res-ms');

  if (!dateInput || !dateInput.value) {
    window.showToast('Please select a date and time', 'error');
    return;
  }

  try {
    const date = new Date(dateInput.value);
    const msValue = date.getTime();
    if (isNaN(msValue)) {
      throw new Error("Invalid Date input");
    }

    const secValue = Math.floor(msValue / 1000);

    if (resSecEl) resSecEl.textContent = secValue;
    if (resMsEl) resMsEl.textContent = msValue;

    window.showToast('Date converted successfully', 'success');
  } catch (error) {
    window.showToast('Failed to convert date', 'error');
  }
}

// Initializer
export function initEpoch() {
  // Live Clock buttons
  const pauseBtn = document.getElementById('epoch-live-pause-btn');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      if (isClockRunning) {
        pauseClock();
      } else {
        startClock();
      }
    });
  }

  const copyBtn = document.getElementById('epoch-live-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', handleLiveCopy);
  }

  // Click on tick values directly to copy
  const secEl = document.getElementById('epoch-live-sec');
  if (secEl) {
    secEl.addEventListener('click', () => {
      const val = secEl.textContent;
      navigator.clipboard.writeText(val)
        .then(() => window.showToast(`Copied seconds: ${val}`, 'success'));
    });
  }

  const msEl = document.getElementById('epoch-live-ms');
  if (msEl) {
    msEl.addEventListener('click', () => {
      const val = msEl.textContent.split(' ')[0];
      navigator.clipboard.writeText(val)
        .then(() => window.showToast(`Copied milliseconds: ${val}`, 'success'));
    });
  }

  // Epoch to Date Converter
  const convertToDateBtn = document.getElementById('epoch-convert-to-date-btn');
  if (convertToDateBtn) {
    convertToDateBtn.addEventListener('click', handleEpochToDate);
  }

  const epochInput = document.getElementById('epoch-input-val');
  if (epochInput) {
    // Fill current timestamp as placeholder hint
    epochInput.placeholder = Math.floor(Date.now() / 1000);
    epochInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleEpochToDate();
    });
  }

  // Date to Epoch Converter
  const convertToEpochBtn = document.getElementById('epoch-convert-to-epoch-btn');
  if (convertToEpochBtn) {
    convertToEpochBtn.addEventListener('click', handleDateToEpoch);
  }

  // Set default datetime value to local now
  const dateInput = document.getElementById('date-input-val');
  if (dateInput) {
    dateInput.value = formatLocalDateTime(new Date());
  }

  // Set Local Timezone String Display
  const localTzLabel = document.getElementById('epoch-local-tz-label');
  if (localTzLabel) {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = new Date().toString().match(/([-\+]\d+)/);
    const offsetStr = offset ? `(UTC${offset[0].slice(0, 3)}:${offset[0].slice(3)})` : '';
    localTzLabel.textContent = `Local TZ: ${timeZone} ${offsetStr}`;
  }

  // Add click-to-copy handlers on all result boxes
  document.querySelectorAll('.epoch-result-val').forEach(el => {
    el.addEventListener('click', () => {
      const text = el.textContent;
      if (text && text !== '--') {
        navigator.clipboard.writeText(text)
          .then(() => window.showToast('Copied to clipboard', 'success'));
      }
    });
  });

  // Start the live clock ticking
  startClock();
}
