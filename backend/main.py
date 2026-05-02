"""
Marketing Command Center — FastAPI Backend
Entry point: registers all routers and configures CORS for the frontend.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import paid_media, customer_economics, conversion, forecasting

# ---------------------------------------------------------------------------
# App initialisation
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Marketing Command Center API",
    description=(
        "Calculation engine for Paid Media Metrics, Customer Economics, "
        "Conversion Optimisation, and Advanced Forecasting."
    ),
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS — allow the local frontend (file:// or dev server) to call the API
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://mcc-command-center.netlify.app", "http://localhost:5500", "http://127.0.0.1:5500", ],          # tighten to your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Router registration
# ---------------------------------------------------------------------------

app.include_router(
    paid_media.router,
    prefix="/api/paid-media",
    tags=["Paid Media Metrics"],
)

app.include_router(
    customer_economics.router,
    prefix="/api/customer-economics",
    tags=["Customer Economics"],
)

app.include_router(
    conversion.router,
    prefix="/api/conversion",
    tags=["Conversion Optimisation"],
)

app.include_router(
    forecasting.router,
    prefix="/api/forecasting",
    tags=["Advanced Forecasting"],
)

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
def root():
    """Liveness probe — confirms the API is running."""
    return {
        "status": "ok",
        "service": "Marketing Command Center API",
        "version": "1.0.0",
    }


@app.get("/health", tags=["Health"])
def health():
    """Readiness probe for deployment platforms."""
    return {"status": "healthy"}


# ---------------------------------------------------------------------------
# Dev entrypoint  (python main.py)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)