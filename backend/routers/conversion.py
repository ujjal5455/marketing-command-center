"""
Module 3 — Conversion Optimisation
Endpoints: Conversion Rate (CR), Cart Abandonment Rate
All inputs are validated by Pydantic; all outputs include the result,
the formula used, and a plain-English interpretation.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field, model_validator

router = APIRouter()


# ---------------------------------------------------------------------------
# Shared response envelope
# ---------------------------------------------------------------------------

class MetricResult(BaseModel):
    metric: str
    result: float
    unit: str
    formula: str
    interpretation: str


# ---------------------------------------------------------------------------
# 1. Conversion Rate (CR)
# ---------------------------------------------------------------------------

class ConversionRateInput(BaseModel):
    total_conversions: int = Field(
        ..., ge=0,
        description="Number of desired actions completed (purchases, sign-ups, etc.)"
    )
    total_visitors: int = Field(
        ..., gt=0,
        description="Total number of unique visitors or sessions"
    )

    @model_validator(mode="after")
    def conversions_cannot_exceed_visitors(self):
        if self.total_conversions > self.total_visitors:
            raise ValueError("Conversions cannot exceed total visitors.")
        return self


@router.post("/conversion-rate", response_model=MetricResult, summary="Calculate Conversion Rate")
def calculate_conversion_rate(data: ConversionRateInput):
    cr = round((data.total_conversions / data.total_visitors) * 100, 4)

    if cr < 1:
        interpretation = (
            f"Conversion rate of {cr:.2f}% is below the 1% baseline. "
            "Audit your landing page UX, page load speed, value proposition clarity, "
            "and call-to-action prominence. Even small CRO wins will have outsized revenue impact."
        )
    elif cr < 2:
        interpretation = (
            f"Conversion rate of {cr:.2f}% is at the lower end of average (1–3% for e-commerce). "
            "Focus on trust signals (reviews, guarantees), reducing form friction, "
            "and improving mobile experience."
        )
    elif cr < 5:
        interpretation = (
            f"Good conversion rate of {cr:.2f}%. You are performing above the industry average. "
            "Run A/B tests on checkout flow and product pages to push toward 5%+."
        )
    elif cr < 10:
        interpretation = (
            f"Strong conversion rate of {cr:.2f}%. Your funnel is well-optimised. "
            "Focus on increasing traffic quality and average order value "
            "rather than further CRO investment."
        )
    else:
        interpretation = (
            f"Exceptional conversion rate of {cr:.2f}%. This is top-decile performance. "
            "Verify tracking accuracy, then document and protect what is working "
            "before making major site changes."
        )

    return MetricResult(
        metric="Conversion Rate",
        result=cr,
        unit="% (percentage)",
        formula="CR = (Total Conversions ÷ Total Visitors) × 100",
        interpretation=interpretation,
    )


# ---------------------------------------------------------------------------
# 2. Cart Abandonment Rate
# ---------------------------------------------------------------------------

class CartAbandonmentInput(BaseModel):
    carts_created: int = Field(
        ..., gt=0,
        description="Total number of shopping carts created / checkout initiated"
    )
    completed_purchases: int = Field(
        ..., ge=0,
        description="Number of carts that resulted in a completed purchase"
    )

    @model_validator(mode="after")
    def purchases_cannot_exceed_carts(self):
        if self.completed_purchases > self.carts_created:
            raise ValueError("Completed purchases cannot exceed carts created.")
        return self


@router.post("/cart-abandonment", response_model=MetricResult, summary="Calculate Cart Abandonment Rate")
def calculate_cart_abandonment(data: CartAbandonmentInput):
    abandonment_rate = round(
        ((data.carts_created - data.completed_purchases) / data.carts_created) * 100, 4
    )
    # Recovery opportunity: revenue left on the table as a % proxy
    recovered_rate = round(100 - abandonment_rate, 2)

    if abandonment_rate < 50:
        interpretation = (
            f"Cart abandonment rate of {abandonment_rate:.2f}% is excellent — "
            f"well below the global average of ~70%. "
            f"Your checkout experience is highly optimised. "
            f"{recovered_rate:.2f}% of carts are converting — protect this with regular UX audits."
        )
    elif abandonment_rate < 70:
        interpretation = (
            f"Cart abandonment rate of {abandonment_rate:.2f}% is near the global benchmark (~70%). "
            "Introduce exit-intent popups, abandoned cart email sequences (3-email flow), "
            "and ensure shipping costs are visible early in the funnel."
        )
    elif abandonment_rate < 85:
        interpretation = (
            f"High cart abandonment rate of {abandonment_rate:.2f}%. "
            "Key fixes: show total cost (inc. shipping/taxes) before checkout, "
            "offer guest checkout, add progress indicators, and display trust badges. "
            f"Recovering just 10% of abandoned carts would lift conversions by "
            f"~{round((data.carts_created * 0.1) / max(data.completed_purchases, 1) * 100, 1)}%."
        )
    else:
        interpretation = (
            f"Critical cart abandonment rate of {abandonment_rate:.2f}%. "
            "Fewer than {recovered_rate:.1f}% of carts convert — this signals serious "
            "friction in your checkout. Conduct user session recordings (Hotjar/FullStory), "
            "audit payment options, and consider a full checkout redesign."
        )

    return MetricResult(
        metric="Cart Abandonment Rate",
        result=abandonment_rate,
        unit="% (percentage)",
        formula="Cart Abandonment Rate = ((Carts Created − Completed Purchases) ÷ Carts Created) × 100",
        interpretation=interpretation,
    )