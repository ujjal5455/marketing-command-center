/* ============================================================
   Marketing Command Center — paid_media.js
   Renders and handles all four Paid Media calculator cards:
   ROAS, CPC, CPM, CTR
   ============================================================ */

'use strict';

// ── Card definitions ──────────────────────────────────────────
const PAID_MEDIA_CARDS = [
  {
    id:     'roas',
    abbr:   'ROAS',
    name:   'Return on Ad Spend',
    icon:   '₹',
    apiKey: 'roas',
    fields: [
      {
        id:          'revenue',
        label:       'Total Revenue from Ads',
        placeholder: 'e.g. 150000',
        hint:        'Total revenue directly attributed to your ad campaigns.',
        type:        'number',
        bodyKey:     'revenue',
      },
      {
        id:          'ad_spend',
        label:       'Total Ad Spend',
        placeholder: 'e.g. 50000',
        hint:        'Total amount spent on ads in the same period.',
        type:        'number',
        bodyKey:     'ad_spend',
      },
    ],
  },
  {
    id:     'cpc',
    abbr:   'CPC',
    name:   'Cost Per Click',
    icon:   '↗',
    apiKey: 'cpc',
    fields: [
      {
        id:          'total_cost',
        label:       'Total Ad Cost',
        placeholder: 'e.g. 20000',
        hint:        'Total amount spent to generate the clicks.',
        type:        'number',
        bodyKey:     'total_cost',
      },
      {
        id:          'total_clicks',
        label:       'Total Clicks',
        placeholder: 'e.g. 4000',
        hint:        'Total number of clicks your ads received.',
        type:        'number',
        bodyKey:     'total_clicks',
      },
    ],
  },
  {
    id:     'cpm',
    abbr:   'CPM',
    name:   'Cost Per 1,000 Impressions',
    icon:   '◎',
    apiKey: 'cpm',
    fields: [
      {
        id:          'total_cost',
        label:       'Total Ad Cost',
        placeholder: 'e.g. 10000',
        hint:        'Total amount spent on the campaign.',
        type:        'number',
        bodyKey:     'total_cost',
      },
      {
        id:          'total_impressions',
        label:       'Total Impressions',
        placeholder: 'e.g. 500000',
        hint:        'Total number of times your ads were displayed.',
        type:        'number',
        bodyKey:     'total_impressions',
      },
    ],
  },
  {
    id:     'ctr',
    abbr:   'CTR',
    name:   'Click-Through Rate',
    icon:   '%',
    apiKey: 'ctr',
    fields: [
      {
        id:          'total_clicks',
        label:       'Total Clicks',
        placeholder: 'e.g. 3500',
        hint:        'Total number of clicks your ads received.',
        type:        'number',
        bodyKey:     'total_clicks',
      },
      {
        id:          'total_impressions',
        label:       'Total Impressions',
        placeholder: 'e.g. 200000',
        hint:        'Total number of times your ads were displayed.',
        type:        'number',
        bodyKey:     'total_impressions',
      },
    ],
  },
];

// ── Render cards into the grid ────────────────────────────────
function renderPaidMediaCards() {
  const grid = document.getElementById('paidMediaGrid');
  if (!grid) return;

  grid.innerHTML = PAID_MEDIA_CARDS.map((card, idx) => `
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
              type="${f.type}"
              placeholder="${f.placeholder}"
              min="0"
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

  // Attach event listeners after render
  PAID_MEDIA_CARDS.forEach(card => attachCardListeners(card));
}

// ── Attach listeners to a single card ────────────────────────
function attachCardListeners(card) {
  const btn    = document.getElementById(`btn-${card.id}`);
  const errEl  = document.getElementById(`err-${card.id}`);
  const inputs = card.fields.map(f =>
    document.getElementById(`${card.id}-${f.id}`)
  );

  // Allow Enter key on any input to trigger calculation
  inputs.forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') btn.click();
    });
    // Clear error styling on input
    input.addEventListener('input', () => {
      input.classList.remove('error');
      errEl.textContent = '';
    });
  });

  btn.addEventListener('click', () => handleCalculate(card, inputs, btn, errEl));
}

// ── Handle calculate button click ────────────────────────────
async function handleCalculate(card, inputs, btn, errEl) {
  // Clear previous errors
  errEl.textContent = '';
  inputs.forEach(i => i.classList.remove('error'));

  // Validate: all fields must be filled with positive numbers
  let valid = true;
  const body = {};

  card.fields.forEach((f, idx) => {
    const raw = inputs[idx].value.trim();
    const val = parseFloat(raw);

    if (raw === '' || isNaN(val) || val <= 0) {
      inputs[idx].classList.add('error');
      valid = false;
    } else {
      // total_clicks and total_impressions must be integers
      body[f.bodyKey] = f.bodyKey.includes('clicks') || f.bodyKey.includes('impressions')
        ? Math.round(val)
        : val;
    }
  });

  if (!valid) {
    errEl.textContent = 'Please fill in all fields with values greater than zero.';
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
    // Highlight first input as likely culprit for validation errors
    if (err.status === 422) inputs[0].classList.add('error');
  } finally {
    btn.classList.remove('loading');
    btn.textContent = 'CALCULATE';
  }
}

// ── Init ──────────────────────────────────────────────────────
renderPaidMediaCards();