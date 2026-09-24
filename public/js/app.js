/**
 * HOME AUTOMATION - Main Application Script
 * Designed and Developed by ADITI DHANDE, Dept. of Electrical Engineering, GCOEY
 */

// Application State
let currentTab = 1;
let currentPage = 1;
let totalPages = 1;
let syncTimer = 10;
let syncInterval = null;
let currentLedState = 'OFF';
let authToken = localStorage.getItem('iot_auth_token') || null;
let currentUser = null;

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initSensorChart();
  checkAuth();
  
  // Initial data fetches
  fetchSensorData(1);
  fetchSensorHistory();
  fetchLcdState();
  fetchLedState();

  // Start 10s auto-refresh cycle
  startSyncCycle();
});

/* ==========================================================================
   TIME & TIMEZONE (+5:30 Asia/Kolkata)
   ========================================================================== */
function initClock() {
  function updateTime() {
    const clockEl = document.getElementById('istClock');
    if (!clockEl) return;
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    clockEl.textContent = `${formatter.format(now)} IST`;
  }
  updateTime();
  setInterval(updateTime, 1000);
}

/* ==========================================================================
   10-SECOND AUTO SYNC CYCLE
   ========================================================================== */
function startSyncCycle() {
  if (syncInterval) clearInterval(syncInterval);
  syncTimer = 10;

  syncInterval = setInterval(() => {
    syncTimer--;
    const countdownEl = document.getElementById('syncCountdown');
    if (countdownEl) countdownEl.textContent = `${syncTimer}s`;

    if (syncTimer <= 0) {
      syncTimer = 10;
      // Auto-refresh sensor data, chart, and device controls
      fetchSensorData(currentPage, false);
      fetchSensorHistory();
      fetchLedState();
      fetchLcdState();
    }
  }, 1000);
}

/* ==========================================================================
   TAB NAVIGATION
   ========================================================================== */
function switchTab(tabNumber) {
  currentTab = tabNumber;

  // Tab contents
  const tabs = [1, 2, 3];
  tabs.forEach(num => {
    const content = document.getElementById(`tabContent${num}`);
    const btn = document.getElementById(`tabBtn${num}`);
    if (num === tabNumber) {
      content.classList.remove('hidden');
      btn.className = 'tab-btn flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10';
    } else {
      content.classList.add('hidden');
      btn.className = 'tab-btn flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50';
    }
  });

  if (tabNumber === 1 && sensorChart) {
    sensorChart.resize();
  }
  lucide.createIcons();
}

/* ==========================================================================
   TAB 1: ENVIRONMENT MONITORING (DHT11)
   ========================================================================== */
async function fetchSensorData(page = 1, showSpinner = true) {
  currentPage = page;
  try {
    const res = await fetch(`/api/sensor-data?page=${page}&limit=20`);
    const result = await res.json();

    if (!result.success) throw new Error(result.message);

    const { data: records, pagination, stats } = result;

    // 1. Update pagination variables
    totalPages = pagination.totalPages;
    document.getElementById('pageIndicator').textContent = pagination.page;
    document.getElementById('totalPagesIndicator').textContent = pagination.totalPages;
    document.getElementById('recordsBadge').textContent = `${pagination.total} records`;
    document.getElementById('showingCountText').textContent = records.length;

    document.getElementById('prevPageBtn').disabled = (pagination.page <= 1);
    document.getElementById('nextPageBtn').disabled = (pagination.page >= pagination.totalPages);
    renderPaginationNumbers(pagination.page, pagination.totalPages);

    // 2. Update Quick Stats
    if (stats.minTemperature !== null) {
      document.getElementById('statMinTemp').textContent = stats.minTemperature.toFixed(1);
    }
    if (stats.maxTemperature !== null) {
      document.getElementById('statMaxTemp').textContent = stats.maxTemperature.toFixed(1);
    }

    // 3. Update Latest Reading & Innovative Gauges
    const latest = stats.latestReading || (records.length > 0 ? records[0] : null);
    if (latest) {
      updateInnovativeGauges(latest.temperature, latest.humidity);
    }

    // 4. Update Records Table
    renderSensorTable(records);
    lucide.createIcons();
  } catch (err) {
    console.error('Error fetching sensor data:', err);
  }
}

// Render dynamic page number pills
function renderPaginationNumbers(current, total) {
  const container = document.getElementById('paginationNumbers');
  if (!container) return;
  container.innerHTML = '';

  const maxButtons = 5;
  let start = Math.max(1, current - 2);
  let end = Math.min(total, start + maxButtons - 1);
  if (end - start < maxButtons - 1) {
    start = Math.max(1, end - maxButtons + 1);
  }

  for (let i = start; i <= end; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = i === current
      ? 'px-3 py-1 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs shadow-sm shadow-cyan-500/20'
      : 'px-3 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 text-xs transition';
    btn.onclick = () => fetchSensorData(i);
    container.appendChild(btn);
  }
}

function changePage(delta) {
  const targetPage = currentPage + delta;
  if (targetPage >= 1 && targetPage <= totalPages) {
    fetchSensorData(targetPage);
  }
}

// Update Temperature Arc Dial and Humidity Liquid Seek Bar
function updateInnovativeGauges(temp, humidity) {
  const tempVal = Number(temp);
  const humVal = Number(humidity);

  // Quick stats card values
  document.getElementById('quickCurrentTemp').textContent = tempVal.toFixed(1);
  document.getElementById('quickCurrentHum').textContent = humVal.toFixed(1);

  // 1. Semi-Circular / Arc Temperature Gauge
  // SVG circumference: 2 * PI * r = 2 * 3.14159 * 80 = 502.65
  // We use a semi-circle track arc length of 251.2
  const gaugeEl = document.getElementById('tempGaugeProgress');
  const tempGaugeVal = document.getElementById('gaugeTempVal');
  if (gaugeEl && tempGaugeVal) {
    tempGaugeVal.textContent = tempVal.toFixed(1);
    
    // Scale 0°C to 50°C
    const clampedTemp = Math.min(Math.max(tempVal, 0), 50);
    const progressRatio = clampedTemp / 50;
    // Stroke dashoffset: 251.2 is 0%, 0 is 100%
    const dashOffset = 251.2 - (progressRatio * 251.2);
    gaugeEl.style.strokeDashoffset = dashOffset;

    // Dynamic color styling based on temperature
    if (tempVal < 22) {
      gaugeEl.style.stroke = '#38bdf8'; // Cold Blue
      document.getElementById('tempStatusBadge').innerHTML = '<i data-lucide="snowflake" class="w-3 h-3 text-blue-400"></i> Cool Atmosphere';
      document.getElementById('tempStatusBadge').className = 'mt-2 text-xs font-semibold text-blue-400 flex items-center gap-1';
    } else if (tempVal <= 30) {
      gaugeEl.style.stroke = '#10b981'; // Emerald Comfort
      document.getElementById('tempStatusBadge').innerHTML = '<i data-lucide="sparkles" class="w-3 h-3 text-emerald-400"></i> Optimal Comfort';
      document.getElementById('tempStatusBadge').className = 'mt-2 text-xs font-semibold text-emerald-400 flex items-center gap-1';
    } else {
      gaugeEl.style.stroke = '#f43f5e'; // Hot Amber/Rose
      document.getElementById('tempStatusBadge').innerHTML = '<i data-lucide="flame" class="w-3 h-3 text-rose-400"></i> High Temperature';
      document.getElementById('tempStatusBadge').className = 'mt-2 text-xs font-semibold text-rose-400 flex items-center gap-1';
    }
  }

  // 2. Humidity Seek Bar / Liquid Indicator
  const seekBar = document.getElementById('humiditySeekBar');
  const seekPercent = document.getElementById('seekBarPercent');
  const humComfortText = document.getElementById('humidityComfortText');
  if (seekBar && seekPercent) {
    const clampedHum = Math.min(Math.max(humVal, 0), 100);
    seekBar.style.width = `${clampedHum}%`;
    seekPercent.textContent = `${clampedHum.toFixed(1)}%`;

    if (humVal < 35) {
      humComfortText.textContent = 'Low Humidity (Dry Air)';
      humComfortText.className = 'font-semibold text-amber-400';
    } else if (humVal <= 65) {
      humComfortText.textContent = 'Ideal Comfort (35% - 65%)';
      humComfortText.className = 'font-semibold text-emerald-400';
    } else {
      humComfortText.textContent = 'High Humidity (Moist/Muggy)';
      humComfortText.className = 'font-semibold text-cyan-400';
    }
  }
}

// Render the 20 records in the table
function renderSensorTable(records) {
  const tbody = document.getElementById('sensorTableBody');
  if (!tbody) return;

  if (records.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-slate-500">
          No sensor records found in database.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = records.map((record) => {
    return `
      <tr class="hover:bg-slate-800/40 transition group">
        <td class="py-3.5 px-4 sm:px-6 font-mono text-slate-400">#${record.id}</td>
        <td class="py-3.5 px-4 sm:px-6">
          <span class="font-bold text-white">${record.temperature.toFixed(1)}</span>
          <span class="text-xs text-cyan-400 font-semibold">°C</span>
        </td>
        <td class="py-3.5 px-4 sm:px-6">
          <span class="font-bold text-white">${record.humidity.toFixed(1)}</span>
          <span class="text-xs text-emerald-400 font-semibold">%</span>
        </td>
        <td class="py-3.5 px-4 sm:px-6 font-mono text-cyan-300 text-xs">${record.time}</td>
        <td class="py-3.5 px-4 sm:px-6 text-slate-400 text-xs">${record.date}</td>
        <td class="py-3.5 px-4 sm:px-6 text-right">
          <button 
            onclick="deleteSensorRecord(${record.id})" 
            class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            title="Delete Record #${record.id}"
          >
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Delete Record Action
async function deleteSensorRecord(id) {
  if (!confirm(`Are you sure you want to delete record #${id}?`)) return;

  try {
    const res = await fetch(`/api/sensor-data/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      fetchSensorData(currentPage, false);
      fetchSensorHistory();
    } else {
      alert(result.message || 'Failed to delete record');
    }
  } catch (err) {
    console.error('Error deleting record:', err);
  }
}

// Simulate Reading Button (convenient for immediate testing)
async function simulateReading() {
  const fakeTemp = Number((24 + Math.random() * 10).toFixed(1));
  const fakeHum = Number((50 + Math.random() * 30).toFixed(1));

  try {
    const res = await fetch('/api/sensor-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temperature: fakeTemp, humidity: fakeHum })
    });
    const result = await res.json();
    if (result.success) {
      fetchSensorData(1);
      fetchSensorHistory();
    }
  } catch (err) {
    console.error('Error simulating reading:', err);
  }
}

// Fetch historical 20 readings for line chart
async function fetchSensorHistory() {
  try {
    const res = await fetch('/api/sensor-data/history');
    const result = await res.json();
    if (result.success && result.data) {
      updateSensorChart(result.data);
    }
  } catch (err) {
    console.error('Error fetching sensor history:', err);
  }
}

/* ==========================================================================
   TAB 2: SMART LCD (16x2 I2C Display)
   ========================================================================== */
async function fetchLcdState() {
  try {
    const res = await fetch('/api/lcd');
    const result = await res.json();
    if (result.success) {
      const row1 = result.row1 || '';
      const row2 = result.row2 || '';

      // Update virtual LCD preview
      const preview1 = document.getElementById('lcdDisplayRow1');
      const preview2 = document.getElementById('lcdDisplayRow2');
      if (preview1) preview1.textContent = row1.padEnd(16, ' ').substring(0, 16);
      if (preview2) preview2.textContent = row2.padEnd(16, ' ').substring(0, 16);

      // Update last updated info
      const timeEl = document.getElementById('lcdLastUpdatedText');
      if (timeEl && result.updated_at) {
        timeEl.textContent = `Updated: ${new Date(result.updated_at).toLocaleTimeString()}`;
      }
    }
  } catch (err) {
    console.error('Error fetching LCD state:', err);
  }
}

function updateCharCount(inputId, countId) {
  const input = document.getElementById(inputId);
  const count = document.getElementById(countId);
  if (input && count) {
    count.textContent = `${input.value.length}/16`;
  }
}

function setLcdPreset(row1, row2) {
  const r1 = document.getElementById('lcdRow1Input');
  const r2 = document.getElementById('lcdRow2Input');
  if (r1) r1.value = row1;
  if (r2) r2.value = row2;
  updateCharCount('lcdRow1Input', 'row1Count');
  updateCharCount('lcdRow2Input', 'row2Count');
}

async function handleLcdUpdate(event) {
  event.preventDefault();
  const row1 = document.getElementById('lcdRow1Input').value.trim();
  const row2 = document.getElementById('lcdRow2Input').value.trim();
  const submitBtn = document.getElementById('lcdSubmitBtn');
  const toast = document.getElementById('lcdToast');
  const toastMsg = document.getElementById('lcdToastMsg');

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i><span>Sending to LCD...</span>';
    lucide.createIcons();

    const res = await fetch('/api/lcd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ row1, row2 })
    });

    const result = await res.json();
    if (result.success) {
      // Update virtual preview
      document.getElementById('lcdDisplayRow1').textContent = result.row1.padEnd(16, ' ');
      document.getElementById('lcdDisplayRow2').textContent = result.row2.padEnd(16, ' ');

      toastMsg.textContent = 'LCD display updated! ESP8266 will render on next cycle.';
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 4000);
    } else {
      alert(result.message || 'Failed to update LCD');
    }
  } catch (err) {
    console.error('Error updating LCD:', err);
    alert('Error connecting to server.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i><span>Update LCD Display</span>';
    lucide.createIcons();
  }
}

/* ==========================================================================
   TAB 3: LED AUTOMATION (Pin D5)
   ========================================================================== */
async function fetchLedState() {
  try {
    const res = await fetch('/api/led');
    const result = await res.json();
    if (result.success) {
      applyLedUiState(result.state);
    }
  } catch (err) {
    console.error('Error fetching LED state:', err);
  }
}

async function toggleLed() {
  const toggleBtn = document.getElementById('ledToggleBtn');
  try {
    toggleBtn.disabled = true;
    const res = await fetch('/api/led', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toggle: true })
    });
    const result = await res.json();
    if (result.success) {
      applyLedUiState(result.state);
    }
  } catch (err) {
    console.error('Error toggling LED:', err);
  } finally {
    toggleBtn.disabled = false;
  }
}

function applyLedUiState(state) {
  currentLedState = state;
  const isON = (state === 'ON');

  const core = document.getElementById('ledVisualCore');
  const text = document.getElementById('ledStateText');
  const subtext = document.getElementById('ledSubText');
  const btn = document.getElementById('ledToggleBtn');
  const slider = document.getElementById('ledToggleSlider');
  const badge = document.getElementById('ledStatusBadge');
  const icon = document.getElementById('ledToggleIcon');

  if (isON) {
    // LED is ON (Emerald/Green glow)
    core.className = 'led-core on';
    text.textContent = 'LED IS ON';
    text.className = 'text-2xl font-extrabold text-emerald-400 tracking-wider';
    subtext.textContent = 'Hardware Pin D5 is currently HIGH (3.3V)';

    btn.setAttribute('aria-checked', 'true');
    btn.className = 'group relative inline-flex h-16 w-32 flex-shrink-0 cursor-pointer rounded-full border-4 border-emerald-500 bg-emerald-950/60 transition-colors duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-emerald-500/20 shadow-lg shadow-emerald-500/20';

    slider.className = 'pointer-events-none inline-block h-14 w-14 transform rounded-full bg-emerald-400 shadow-xl ring-0 transition duration-300 ease-in-out translate-x-16 flex items-center justify-center text-slate-950 font-bold';

    badge.textContent = 'ON';
    badge.className = 'px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30';
  } else {
    // LED is OFF
    core.className = 'led-core off';
    text.textContent = 'LED IS OFF';
    text.className = 'text-2xl font-extrabold text-slate-400 tracking-wider';
    subtext.textContent = 'Hardware Pin D5 is currently LOW (0V)';

    btn.setAttribute('aria-checked', 'false');
    btn.className = 'group relative inline-flex h-16 w-32 flex-shrink-0 cursor-pointer rounded-full border-4 border-slate-700 bg-slate-900 transition-colors duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-cyan-500/20';

    slider.className = 'pointer-events-none inline-block h-14 w-14 transform rounded-full bg-slate-600 shadow-lg ring-0 transition duration-300 ease-in-out translate-x-0 flex items-center justify-center text-white';

    badge.textContent = 'OFF';
    badge.className = 'px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 font-bold border border-slate-700';
  }
}

/* ==========================================================================
   AUTHENTICATION (LOGIN & REGISTRATION)
   ========================================================================== */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

async function checkAuth() {
  if (!authToken) {
    renderAuthHeader(null);
    return;
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const result = await res.json();
    if (result.success && result.user) {
      currentUser = result.user;
      renderAuthHeader(currentUser);
    } else {
      logout();
    }
  } catch (err) {
    console.error('Auth verification error:', err);
  }
}

function renderAuthHeader(user) {
  const container = document.getElementById('authHeaderContainer');
  if (!container) return;

  if (user) {
    container.innerHTML = `
      <div class="flex items-center space-x-3">
        <div class="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700">
          <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center text-slate-950 font-bold text-xs">
            ${user.name.charAt(0).toUpperCase()}
          </div>
          <span class="text-xs font-semibold text-slate-200 hidden sm:inline">${user.name}</span>
        </div>
        <button onclick="logout()" class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition" title="Logout">
          <i data-lucide="log-out" class="w-4 h-4"></i>
        </button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <button onclick="openModal('loginModal')" class="px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition">
        Login
      </button>
      <button onclick="openModal('registerModal')" class="px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-semibold shadow-md shadow-cyan-500/25 transition">
        Register
      </button>
    `;
  }
  lucide.createIcons();
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');

  try {
    errorEl.classList.add('hidden');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const result = await res.json();
    if (result.success) {
      authToken = result.token;
      currentUser = result.user;
      localStorage.setItem('iot_auth_token', authToken);
      closeModal('loginModal');
      renderAuthHeader(currentUser);
    } else {
      errorEl.textContent = result.message || 'Login failed';
      errorEl.classList.remove('hidden');
    }
  } catch (err) {
    errorEl.textContent = 'Server connection error.';
    errorEl.classList.remove('hidden');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const errorEl = document.getElementById('registerError');

  try {
    errorEl.classList.add('hidden');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const result = await res.json();
    if (result.success) {
      authToken = result.token;
      currentUser = result.user;
      localStorage.setItem('iot_auth_token', authToken);
      closeModal('registerModal');
      renderAuthHeader(currentUser);
    } else {
      errorEl.textContent = result.message || 'Registration failed';
      errorEl.classList.remove('hidden');
    }
  } catch (err) {
    errorEl.textContent = 'Server connection error.';
    errorEl.classList.remove('hidden');
  }
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('iot_auth_token');
  renderAuthHeader(null);
}
