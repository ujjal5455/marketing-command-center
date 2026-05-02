/* ============================================================
   Marketing Command Center — customer_economics.js
   Renders and handles all three Customer Economics calculators:
   CAC, LTV, LTV:CAC Ratio
   ============================================================ */

'use strict';

// ── Card definitions ──────────────────────────────────────────
const CUSTOMER_ECONOMICS_CARDS = [
  {
    id:     'cac',
    abbr:   'CAC',
    name:   'Customer Acquisition Cost',
    icon:   '⊕',
    apiKey: 'cac',
    fields: [
      {
        id:          'total_sales_marketing_spend',
        label:       'Total Sales & Marketing Spend',
        placeholder: 'e.g. 500000',
        hint:        'All spend on sales, marketing, and advertising for the period.',
        bodyKey:     'total_sales_marketing_spend',
        isInt:       false,
      },
      {
        id:          'new_customers_acquired',
        label:       'New Customers Acquired',
        placeholder: 'e.g. 250',
        hint:        'Number of new customers gained in the same period.',
        bodyKey:     'new_customers_acquired',
        isInt:       true,
      },
    ],
  },
  {
    id:     'ltv',
    abbr:   'LTV',
    name:   'Customer Lifetime Value',
    icon:   '∞',
    apiKey: 'ltv',
    fields: [
      {
        id:          'average_order_value',
        label:       'Average Order Value',
        placeholder: 'e.g. 1200',
        hint:        'Average revenue earned per transaction.',
        bodyKey:     'average_order_value',
        isInt:       false,
      },
      {
        id:          'purchase_frequency',
        label:       'Purchase Frequency (per year)',
        placeholder: 'e.g. 4',
        hint:        'How many times an average customer buys per year.',
        bodyKey:     'purchase_frequency',
        isInt:       false,
      },
      {
        id:          'average_customer_lifespan_years',
        label:       'Avg. Customer Lifespan (years)',
        placeholder: 'e.g. 3',
        hint:        'How many years an average customer stays active.',
        bodyKey:     'average_customer_lifespan_years',
        isInt:       false,
      },
      {
        id:          'gross_margin_percent',
        label:       'Gross Margin (%)',
        placeholder: 'e.g. 60',
        hint:        'Your gross margin as a percentage (e.g. 60 for 60%).',
        bodyKey:     'gross_margin_percent',
        isInt:       false,
        max:         100,
      },
    ],
  },
  {
    id:     'ltv-cac',
    abbr:   'LTV:CAC',
    name:   'LTV to CAC Ratio',
    icon:   '÷',
    apiKey: 'ltvCacRatio',
    fields: [
      {
        id:          'ltv',
        label:       'Customer Lifetime Value (LTV)',
        placeholder: 'e.g. 12000',
        hint:        'Use the LTV calculator above to get this figure.',
        bodyKey:     'ltv',
        isInt:       false,
      },
      {
        id:          'cac',
        label:       'Customer Acquisition Cost (CAC)',
        placeholder: 'e.g. 3000',
        hint:        'Use the CAC calculator above to get this figure.',
        bodyKey:     'cac',
        isInt:       false,
      },
    ],
  },
];

// ── Render cards into the grid ────────────────────────────────
function renderCustomerEconomicsCards() {
  const grid = document.getElementById('customerEconomicsGrid');
  if (!grid) return;

  grid.innerHTML = CUSTOMER_ECONOMICS_CARDS.map((card, idx) => `
    <article
      class="calc-card"
      id="card-${card.id}"
      style="animation-delay: ${idx * 0.07}s"
      aria-label="${card.name} calculator"
    >
      <div class="calc-card__header">
        <div class="calc-card__title-wrap">
          <div class="calc-card__abbr">${card.abbr}</div>
          <div class="calc-card__name">${card.name}</div>
        </div>
        <div class="calc-card__icon" aria-hidden="true">${card.icon}</div>
      </div>

      <div class="calc-card__fields">
        ${card.fields.map(f => `
          <div class="field">
            <label for="${card.id}-${f.id}">${f.label}</label>
            <input
              id="${card.id}-${f.id}"
              type="number"
              placeholder="${f.placeholder}"
              min="0"
              ${f.max !== undefined ? `max="${f.max}"` : ''}
              step="any"
              autocomplete="off"
            />
            <span class="field__hint">${f.hint}</span>
          </div>
        `).join('')}
      </div>

      <p class="calc-card__error" id="err-${card.id}" aria-live="polite"></p>

      <button
        class="calc-card__btn"
        id="btn-${card.id}"
        type="button"
        data-card="${card.id}"
      >
        CALCULATE
      </button>
    </article>
  `).join('');

  // Attach listeners after DOM is built
  CUSTOMER_ECONOMICS_CARDS.forEach(card => attachCECardListeners(card));
}

// ── Attach listeners ──────────────────────────────────────────
function attachCECardListeners(card) {
  const btn   = document.getElementById(`btn-${card.id}`);
  const errEl = document.getElementById(`err-${card.id}`);
  const inputs = card.fields.map(f =>
    document.getElementById(`${card.id}-${f.id}`)
  );

  inputs.forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') btn.click();
    });
    input.addEventListener('input', () => {
      input.classList.remove('error');
      errEl.textContent = '';
    });
  });

  btn.addEventListener('click', () => handleCECalculate(card, inputs, btn, errEl));
}

// ── Validate and call API ─────────────────────────────────────
async function handleCECalculate(card, inputs, btn, errEl) {
  errEl.textContent = '';
  inputs.forEach(i => i.classList.remove('error'));

  let valid = true;
  const body = {};
  const errors = [];

  card.fields.forEach((f, idx) => {
    const raw = inputs[idx].value.trim();
    const val = parseFloat(raw);

    // Empty or non-numeric
    if (raw === '' || isNaN(val)) {
      inputs[idx].classList.add('error');
      errors.push(`"${f.label}" is required.`);
      valid = false;
      return;
    }

    // Must be > 0
    if (val <= 0) {
      inputs[idx].classList.add('error');
      errors.push(`"${f.label}" must be greater than zero.`);
      valid = false;
      return;
    }

    // Max constraint (e.g. gross margin ≤ 100)
    if (f.max !== undefined && val > f.max) {
      inputs[idx].classList.add('error');
      errors.push(`"${f.label}" cannot exceed ${f.max}.`);
      valid = false;
      return;
    }

    body[f.bodyKey] = f.isInt ? Math.round(val) : val;
  });

  if (!valid) {
    errEl.textContent = errors[0]; // show first error
    return;
  }

  // Loading state
  btn.classList.add('loading');
  btn.textContent = 'CALCULATING…';

  try {
    const result = await MCC_API.call(card.apiKey, body);
    MCC.openModal(result);
    MCC.showToast(`${card.abbr} calculated successfully`, 'success');
  } catch (err) {
    const msg = err.message || 'Unexpected error. Please try again.';
    errEl.textContent = msg;
    MCC.showToast(`Error: ${msg}`, 'error');
    if (err.status === 422) inputs[0].classList.add('error');
  } finally {
    btn.classList.remove('loading');
    btn.textContent = 'CALCULATE';
  }
}

// ── Init ──────────────────────────────────────────────────────
renderCustomerEconomicsCards();