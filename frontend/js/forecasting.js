/* ============================================================
   Marketing Command Center — forecasting.js
   Renders and handles both Advanced Forecasting calculators:
   Break-Even Point and Ad Spend Forecaster
   ============================================================ */

'use strict';

// ── Card definitions ──────────────────────────────────────────
const FORECASTING_CARDS = [
  {
    id:     'break-even',
    abbr:   'BEP',
    name:   'Break-Even Point',
    icon:   '⊜',
    apiKey: 'breakEven',
    isForecast: false,
    fields: [
      {
        id:          'fixed_costs',
        label:       'Total Fixed Costs',
        placeholder: 'e.g. 200000',
        hint:        'Rent, salaries, software, and all other fixed monthly/period costs.',
        bodyKey:     'fixed_costs',
        isInt:       false,
        allowZero:   false,
      },
      {
        id:          'average_selling_price',
        label:       'Average Selling Price per Unit',
        placeholder: 'e.g. 1500',
        hint:        'The average price at which you sell one unit of your product/service.',
        bodyKey:     'average_selling_price',
        isInt:       false,
        allowZero:   false,
      },
      {
        id:          'variable_cost_per_unit',
        label:       'Variable Cost per Unit',
        placeholder: 'e.g. 600',
        hint:        'Cost of goods sold or fulfilment cost per unit (must be less than selling price).',
        bodyKey:     'variable_cost_per_unit',
        isInt:       false,
        allowZero:   true,
      },
    ],
    crossValidate(body, inputs) {
      if (body.variable_cost_per_unit >= body.average_selling_price) {
        inputs[1].classList.add('error');
        inputs[2].classList.add('error');
        return 'Variable cost per unit must be less than the selling price.';
      }
      return null;
    },
  },
  {
    id:     'ad-spend-forecast',
    abbr:   'ASF',
    name:   'Ad Spend Forecaster',
    icon:   '⟶',
    apiKey: 'adSpendForecast',
    isForecast: true,
    fields: [
      {
        id:          'initial_monthly_spend',
        label:       'Initial Monthly Ad Spend',
        placeholder: 'e.g. 50000',
        hint:        'Your starting monthly ad budget.',
        bodyKey:     'initial_monthly_spend',
        isInt:       false,
        allowZero:   false,
        min:         0,
      },
      {
        id:          'monthly_spend_growth_rate',
        label:       'Monthly Budget Growth Rate (%)',
        placeholder: 'e.g. 10',
        hint:        'Month-over-month increase in ad spend (0 = flat budget).',
        bodyKey:     'monthly_spend_growth_rate',
        isInt:       false,
        allowZero:   true,
        min:         0,
        max:         200,
      },
      {
        id:          'initial_roas',
        label:       'Starting ROAS',
        placeholder: 'e.g. 3.5',
        hint:        'Your current Return on Ad Spend (e.g. 3.5 = ₹3.50 per ₹1 spent).',
        bodyKey:     'initial_roas',
        isInt:       false,
        allowZero:   false,
        min:         0,
      },
      {
        id:          'roas_growth_rate',
        label:       'Monthly ROAS Change (%)',
        placeholder: 'e.g. -2',
        hint:        'Expected monthly ROAS change. Negative = diminishing returns at scale.',
        bodyKey:     'roas_growth_rate',
        isInt:       false,
        allowZero:   true,
        allowNegative: true,
        min:         -50,
        max:         100,
      },
      {
        id:          'gross_margin_percent',
        label:       'Gross Margin (%)',
        placeholder: 'e.g. 55',
        hint:        'Your gross margin percentage used to compute net profit.',
        bodyKey:     'gross_margin_percent',
        isInt:       false,
        allowZero:   false,
        min:         0,
        max:         100,
      },
      {
        id:          'forecast_months',
        label:       'Forecast Period (months)',
        placeholder: 'e.g. 12',
        hint:        'Number of months to project (1–24).',
        bodyKey:     'forecast_months',
        isInt:       true,
        allowZero:   false,
        min:         1,
        max:         24,
      },
      {
        id:          'fixed_costs_per_month',
        label:       'Monthly Fixed Costs (optional)',
        placeholder: 'e.g. 80000',
        hint:        'Monthly operating overhead subtracted from gross profit. Enter 0 to skip.',
        bodyKey:     'fixed_costs_per_month',
        isInt:       false,
        allowZero:   true,
        optional:    true,
        min:         0,
      },
    ],
  },
];

// ── Render cards ──────────────────────────────────────────────
function renderForecastingCards() {
  const grid = document.getElementById('forecastingGrid');
  if (!grid) return;

  grid.innerHTML = FORECASTING_CARDS.map((card, idx) => `
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
            <label for="${card.id}-${f.id}">
              ${f.label}${f.optional ? ' <span style="color:var(--text-3);font-weight:300">(optional)</span>' : ''}
            </label>
            <input
              id="${card.id}-${f.id}"
              type="number"
              placeholder="${f.placeholder}"
              min="${f.min ?? 0}"
              ${f.max !== undefined ? `max="${f.max}"` : ''}
              step="${f.isInt ? '1' : 'any'}"
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
        ${card.isForecast ? 'RUN FORECAST' : 'CALCULATE'}
      </button>
    </article>
  `).join('');

  FORECASTING_CARDS.forEach(card => attachForecastListeners(card));
}

// ── Attach listeners ──────────────────────────────────────────
function attachForecastListeners(card) {
  const btn    = document.getElementById(`btn-${card.id}`);
  const errEl  = document.getElementById(`err-${card.id}`);
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

  btn.addEventListener('click', () =>
    handleForecastCalculate(card, inputs, btn, errEl)
  );
}

// ── Validate and call API ─────────────────────────────────────
async function handleForecastCalculate(card, inputs, btn, errEl) {
  errEl.textContent = '';
  inputs.forEach(i => i.classList.remove('error'));

  let valid = true;
  const body = {};
  const errors = [];

  card.fields.forEach((f, idx) => {
    const raw = inputs[idx].value.trim();

    // Optional field with empty value — use default 0
    if (f.optional && raw === '') {
      body[f.bodyKey] = 0;
      return;
    }

    const val = parseFloat(raw);

    // Empty or non-numeric
    if (raw === '' || isNaN(val)) {
      inputs[idx].classList.add('error');
      errors.push(`"${f.label}" is required.`);
      valid = false;
      return;
    }

    // Negative check (only for fields that disallow negatives)
    if (!f.allowNegative && val < 0) {
      inputs[idx].classList.add('error');
      errors.push(`"${f.label}" cannot be negative.`);
      valid = false;
      return;
    }

    // Zero check
    if (!f.allowZero && val === 0) {
      inputs[idx].classList.add('error');
      errors.push(`"${f.label}" must be greater than zero.`);
      valid = false;
      return;
    }

    // Min constraint
    if (f.min !== undefined && !f.allowNegative && val < f.min) {
      inputs[idx].classList.add('error');
      errors.push(`"${f.label}" must be at least ${f.min}.`);
      valid = false;
      return;
    }

    // Max constraint
    if (f.max !== undefined && val > f.max) {
      inputs[idx].classList.add('error');
      errors.push(`"${f.label}" cannot exceed ${f.max}.`);
      valid = false;
      return;
    }

    body[f.bodyKey] = f.isInt ? Math.round(val) : val;
  });

  if (!valid) {
    errEl.textContent = errors[0];
    return;
  }

  // Cross-field validation
  if (typeof card.crossValidate === 'function') {
    const crossError = card.crossValidate(body, inputs);
    if (crossError) {
      errEl.textContent = crossError;
      return;
    }
  }

  // Loading state
  btn.classList.add('loading');
  btn.textContent = 'PROCESSING…';

  try {
    const result = await MCC_API.call(card.apiKey, body);

    // Forecast result uses the special modal with table
    if (card.isForecast) {
      MCC.openForecastModal(result);
      MCC.showToast('Forecast generated successfully', 'success');
    } else {
      MCC.openModal(result);
      MCC.showToast(`${card.abbr} calculated successfully`, 'success');
    }
  } catch (err) {
    const msg = err.message || 'Unexpected error. Please try again.';
    errEl.textContent = msg;
    MCC.showToast(`Error: ${msg}`, 'error');
    if (err.status === 422) inputs[0].classList.add('error');
  } finally {
    btn.classList.remove('loading');
    btn.textContent = card.isForecast ? 'RUN FORECAST' : 'CALCULATE';
  }
}

// ── Init ──────────────────────────────────────────────────────
renderForecastingCards();