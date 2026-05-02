/* ============================================================
   Marketing Command Center — conversion.js
   Renders and handles both Conversion Optimisation calculators:
   Conversion Rate (CR) and Cart Abandonment Rate
   ============================================================ */

'use strict';

// ── Card definitions ──────────────────────────────────────────
const CONVERSION_CARDS = [
  {
    id:     'conversion-rate',
    abbr:   'CR',
    name:   'Conversion Rate',
    icon:   '⇡',
    apiKey: 'conversionRate',
    fields: [
      {
        id:          'total_conversions',
        label:       'Total Conversions',
        placeholder: 'e.g. 340',
        hint:        'Number of desired actions completed (purchases, sign-ups, leads, etc.).',
        bodyKey:     'total_conversions',
        isInt:       true,
        allowZero:   true,
      },
      {
        id:          'total_visitors',
        label:       'Total Visitors / Sessions',
        placeholder: 'e.g. 12000',
        hint:        'Total unique visitors or sessions in the same period.',
        bodyKey:     'total_visitors',
        isInt:       true,
        allowZero:   false,
      },
    ],
    // Cross-field validation rule
    crossValidate(body, inputs) {
      if (body.total_conversions > body.total_visitors) {
        inputs[0].classList.add('error');
        inputs[1].classList.add('error');
        return 'Conversions cannot exceed total visitors.';
      }
      return null;
    },
  },
  {
    id:     'cart-abandonment',
    abbr:   'CAR',
    name:   'Cart Abandonment Rate',
    icon:   '⊘',
    apiKey: 'cartAbandonment',
    fields: [
      {
        id:          'carts_created',
        label:       'Carts Created / Checkouts Initiated',
        placeholder: 'e.g. 5000',
        hint:        'Total number of shopping carts created or checkout flows started.',
        bodyKey:     'carts_created',
        isInt:       true,
        allowZero:   false,
      },
      {
        id:          'completed_purchases',
        label:       'Completed Purchases',
        placeholder: 'e.g. 1500',
        hint:        'Number of carts that resulted in a completed order.',
        bodyKey:     'completed_purchases',
        isInt:       true,
        allowZero:   true,
      },
    ],
    // Cross-field validation rule
    crossValidate(body, inputs) {
      if (body.completed_purchases > body.carts_created) {
        inputs[0].classList.add('error');
        inputs[1].classList.add('error');
        return 'Completed purchases cannot exceed carts created.';
      }
      return null;
    },
  },
];

// ── Render cards into the grid ────────────────────────────────
function renderConversionCards() {
  const grid = document.getElementById('conversionGrid');
  if (!grid) return;

  grid.innerHTML = CONVERSION_CARDS.map((card, idx) => `
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
              step="1"
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

  // Attach listeners after DOM is ready
  CONVERSION_CARDS.forEach(card => attachConversionListeners(card));
}

// ── Attach listeners ──────────────────────────────────────────
function attachConversionListeners(card) {
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
    handleConversionCalculate(card, inputs, btn, errEl)
  );
}

// ── Validate and call API ─────────────────────────────────────
async function handleConversionCalculate(card, inputs, btn, errEl) {
  errEl.textContent = '';
  inputs.forEach(i => i.classList.remove('error'));

  let valid = true;
  const body = {};
  const errors = [];

  card.fields.forEach((f, idx) => {
    const raw = inputs[idx].value.trim();
    const val = parseFloat(raw);

    // Empty or non-numeric check
    if (raw === '' || isNaN(val)) {
      inputs[idx].classList.add('error');
      errors.push(`"${f.label}" is required.`);
      valid = false;
      return;
    }

    // Negative values never valid
    if (val < 0) {
      inputs[idx].classList.add('error');
      errors.push(`"${f.label}" cannot be negative.`);
      valid = false;
      return;
    }

    // Fields that must be strictly > 0
    if (!f.allowZero && val === 0) {
      inputs[idx].classList.add('error');
      errors.push(`"${f.label}" must be greater than zero.`);
      valid = false;
      return;
    }

    body[f.bodyKey] = f.isInt ? Math.round(val) : val;
  });

  if (!valid) {
    errEl.textContent = errors[0];
    return;
  }

  // Cross-field validation (e.g. conversions ≤ visitors)
  if (typeof card.crossValidate === 'function') {
    const crossError = card.crossValidate(body, inputs);
    if (crossError) {
      errEl.textContent = crossError;
      return;
    }
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
renderConversionCards();