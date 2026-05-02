/* ============================================================
   Marketing Command Center — app.js
   Responsibilities:
     • Sidebar navigation & view switching
     • Mobile sidebar toggle
     • Result modal (open / close / populate)
     • Forecast table rendering
     • Toast notifications
     • API health-check → status indicator
     • Topbar date
   ============================================================ */

'use strict';

// ── DOM refs ─────────────────────────────────────────────────
const sidebar        = document.getElementById('sidebar');
const sidebarToggle  = document.getElementById('sidebarToggle');
const navItems       = document.querySelectorAll('.nav-item');
const views          = document.querySelectorAll('.view');
const breadcrumb     = document.getElementById('breadcrumbModule');
const topbarDate     = document.getElementById('topbarDate');
const statusDot      = document.getElementById('statusDot');
const statusLabel    = document.getElementById('statusLabel');

const modalOverlay   = document.getElementById('modalOverlay');
const modalClose     = document.getElementById('modalClose');
const modalBadge     = document.getElementById('modalBadge');
const modalTitle     = document.getElementById('modalTitle');
const modalValue     = document.getElementById('modalValue');
const modalUnit      = document.getElementById('modalUnit');
const modalFormula   = document.getElementById('modalFormula');
const modalInterp    = document.getElementById('modalInterpretation');
const modalTableWrap = document.getElementById('modalTableWrap');
const forecastTbody  = document.getElementById('forecastTableBody');

const toast          = document.getElementById('toast');

// ── Breadcrumb labels ─────────────────────────────────────────
const VIEW_LABELS = {
  'paid-media':          'Paid Media Metrics',
  'customer-economics':  'Customer Economics',
  'conversion':          'Conversion Optimisation',
  'forecasting':         'Advanced Forecasting',
};

// ── Topbar date ───────────────────────────────────────────────
(function setDate() {
  const now = new Date();
  topbarDate.textContent = now.toLocaleDateString('en-IN', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
})();

// ── Sidebar navigation ────────────────────────────────────────
function switchView(viewKey) {
  // Update nav items
  navItems.forEach(btn => {
    const isActive = btn.dataset.view === viewKey;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  // Update view sections
  views.forEach(section => {
    const isActive = section.id === `view-${viewKey}`;
    section.classList.toggle('active', isActive);
  });

  // Update breadcrumb
  breadcrumb.textContent = VIEW_LABELS[viewKey] ?? viewKey;

  // Close mobile sidebar after nav
  sidebar.classList.remove('open');
}

navItems.forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// ── Mobile sidebar toggle ─────────────────────────────────────
sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', e => {
  if (
    sidebar.classList.contains('open') &&
    !sidebar.contains(e.target) &&
    e.target !== sidebarToggle
  ) {
    sidebar.classList.remove('open');
  }
});

// ── Modal ─────────────────────────────────────────────────────

/**
 * Open the result modal with a standard metric result.
 * @param {Object} data - Response from the API
 * @param {string} data.metric
 * @param {number} data.result
 * @param {string} data.unit
 * @param {string} data.formula
 * @param {string} data.interpretation
 */
function openModal(data) {
  modalBadge.textContent    = data.metric;
  modalTitle.textContent    = data.metric;
  modalValue.textContent    = formatResult(data.result, data.metric);
  modalUnit.textContent     = data.unit;
  modalFormula.textContent  = data.formula;
  modalInterp.textContent   = data.interpretation;

  // Hide forecast table for standard metrics
  modalTableWrap.hidden = true;
  forecastTbody.innerHTML = '';

  modalOverlay.hidden = false;
  document.body.style.overflow = 'hidden';

  // Focus the close button for accessibility
  setTimeout(() => modalClose.focus(), 50);
}

/**
 * Open the modal for the Ad Spend Forecast (includes table).
 * @param {Object} data - ForecastResult from the API
 */
function openForecastModal(data) {
  modalBadge.textContent   = 'Ad Spend Forecast';
  modalTitle.textContent   = 'Revenue Forecast';
  modalValue.textContent   = formatCurrency(data.total_revenue);
  modalUnit.textContent    = `Projected revenue over ${data.monthly_projections.length} months`;
  modalFormula.textContent = data.formula;
  modalInterp.textContent  = data.interpretation;

  // Populate forecast table
  forecastTbody.innerHTML = '';
  const bepMonth = data.break_even_month;

  data.monthly_projections.forEach(row => {
    const isBep    = row.month === bepMonth;
    const profitCls = row.projected_profit >= 0 ? 'profit-pos' : 'profit-neg';
    const tr = document.createElement('tr');
    if (isBep) tr.classList.add('bep-row');
    tr.innerHTML = `
      <td>${row.month}${isBep ? ' ★' : ''}</td>
      <td>${formatCurrency(row.ad_spend)}</td>
      <td>${formatCurrency(row.projected_revenue)}</td>
      <td>${row.projected_roas.toFixed(2)}×</td>
      <td class="${profitCls}">${formatCurrency(row.projected_profit)}</td>
      <td>${formatCurrency(row.cumulative_spend)}</td>
      <td>${formatCurrency(row.cumulative_revenue)}</td>
    `;
    forecastTbody.appendChild(tr);
  });

  modalTableWrap.hidden = false;
  modalOverlay.hidden   = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => modalClose.focus(), 50);
}

function closeModal() {
  modalOverlay.hidden = true;
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);

modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modalOverlay.hidden) closeModal();
});

// ── Formatting helpers ────────────────────────────────────────
function formatCurrency(value) {
  return '₹' + Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatResult(value, metric) {
  const pctMetrics = ['CTR', 'Conversion Rate', 'Cart Abandonment Rate'];
  const ratioMetrics = ['ROAS', 'LTV:CAC Ratio'];

  if (pctMetrics.includes(metric)) {
    return value.toFixed(2) + '%';
  }
  if (ratioMetrics.includes(metric)) {
    return value.toFixed(2) + '×';
  }
  // Currency metrics: CAC, LTV, CPC, CPM, Break-Even Point (revenue equiv shown in interp)
  if (metric === 'Break-Even Point') {
    return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
  return '₹' + Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── Toast ─────────────────────────────────────────────────────
let toastTimer = null;

/**
 * Show a transient toast notification.
 * @param {string} message
 * @param {'info'|'success'|'error'} [type='info']
 * @param {number} [duration=3500]
 */
function showToast(message, type = 'info', duration = 3500) {
  toast.textContent = message;
  toast.className   = 'toast show';
  if (type === 'error')   toast.classList.add('toast--error');
  if (type === 'success') toast.classList.add('toast--success');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// ── API health check ──────────────────────────────────────────
async function checkApiHealth() {
  try {
    const res = await fetch(`${window.MCC_API_BASE}/health`, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      statusDot.className   = 'status-dot online';
      statusLabel.textContent = 'API Online';
    } else {
      throw new Error('Non-OK status');
    }
  } catch {
    statusDot.className     = 'status-dot offline';
    statusLabel.textContent = 'API Offline';
    showToast('Backend API is offline. Start the FastAPI server on port 8000.', 'error', 6000);
  }
}

// ── Exports (consumed by module JS files) ────────────────────
window.MCC = {
  openModal,
  openForecastModal,
  closeModal,
  showToast,
  formatCurrency,
  formatResult,
};

// ── Init ──────────────────────────────────────────────────────
(function init() {
  switchView('paid-media');   // default view
  checkApiHealth();
})();