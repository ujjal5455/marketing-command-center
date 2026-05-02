# ⌘ Marketing Command Center

A comprehensive suite of calculation tools for digital marketers — built with FastAPI and vanilla JavaScript.

![Status](https://img.shields.io/badge/status-live-brightgreen)
![Python](https://img.shields.io/badge/python-3.11-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-teal)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## 🌐 Live Demo

| Layer | URL |
|---|---|
| **Frontend** | https://your-name.netlify.app |
| **API Docs** | https://your-api.onrender.com/docs |

---

## 📸 Overview

Marketing Command Center gives marketers an instant, clean interface to calculate and interpret the metrics that matter most — without spreadsheets.

---

## 🧮 Modules

### 1. Paid Media Metrics
| Metric | Description |
|---|---|
| **ROAS** | Return on Ad Spend — revenue earned per ₹1 spent |
| **CPC** | Cost Per Click — average cost to earn one click |
| **CPM** | Cost Per 1,000 Impressions — reach efficiency |
| **CTR** | Click-Through Rate — ad engagement percentage |

### 2. Customer Economics
| Metric | Description |
|---|---|
| **CAC** | Customer Acquisition Cost — total cost to acquire one customer |
| **LTV** | Customer Lifetime Value — margin-adjusted revenue per customer |
| **LTV:CAC** | Ratio — health check for unit economics |

### 3. Conversion Optimisation
| Metric | Description |
|---|---|
| **CR** | Conversion Rate — visitors who complete a desired action |
| **CAR** | Cart Abandonment Rate — checkouts that never complete |

### 4. Advanced Forecasting
| Tool | Description |
|---|---|
| **Break-Even Point** | Units and revenue needed to cover all fixed costs |
| **Ad Spend Forecaster** | Month-by-month revenue and profit projection with ROAS trajectory |

---

## 🏗️ Tech Stack

Frontend          Backend           Hosting
─────────         ─────────         ─────────
HTML5             Python 3.11       Netlify (frontend)
CSS3              FastAPI           Render  (backend)
Vanilla JS        Pydantic v2
NumPy
Uvicorn

---

## 📁 Project Structure

marketing-command-center/
│
├── backend/
│   ├── main.py                   # FastAPI app + router registration
│   ├── requirements.txt          # Python dependencies
│   ├── Procfile                  # Render start command
│   ├── runtime.txt               # Python version pin
│   └── routers/
│       ├── paid_media.py         # ROAS, CPC, CPM, CTR
│       ├── customer_economics.py # CAC, LTV, LTV:CAC
│       ├── conversion.py         # CR, Cart Abandonment
│       └── forecasting.py        # Break-Even, Ad Spend Forecast
│
└── frontend/
├── index.html                # App shell + sidebar
├── css/
│   └── style.css             # Full design system
└── js/
├── app.js                # Router, modal, toast
├── api.js                # Fetch wrapper + endpoint map
├── paid_media.js         # Module 1 UI
├── customer_economics.js # Module 2 UI
├── conversion.js         # Module 3 UI
└── forecasting.js        # Module 4 UI

---

## 🚀 Run Locally

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
# API runs at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### Frontend
```bash
# Option 1 — just open the file
open frontend/index.html

# Option 2 — serve with Python
cd frontend
python -m http.server 5500
# Open http://localhost:5500
```

---

## 🔌 API Reference

All endpoints accept `POST` requests with a JSON body and return:

```json
{
  "metric": "ROAS",
  "result": 3.0,
  "unit": "x (ratio)",
  "formula": "ROAS = Revenue ÷ Ad Spend",
  "interpretation": "Healthy ROAS of 3.00x..."
}
```

### Endpoints

POST /api/paid-media/roas
POST /api/paid-media/cpc
POST /api/paid-media/cpm
POST /api/paid-media/ctr
POST /api/customer-economics/cac
POST /api/customer-economics/ltv
POST /api/customer-economics/ltv-cac-ratio
POST /api/conversion/conversion-rate
POST /api/conversion/cart-abandonment
POST /api/forecasting/break-even
POST /api/forecasting/ad-spend-forecast

Full interactive docs available at `/docs` on the live API.

---

## 🛠️ Deployment

| Service | Platform | Free Tier |
|---|---|---|
| Frontend | Netlify | ✅ Yes |
| Backend | Render | ✅ Yes |

See the [deployment guide](#) for step-by-step instructions.

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 🙋 Author

Built with ⌘ by **Ujjwal**

