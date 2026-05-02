"""
Module 2 — Customer Economics
Endpoints: CAC, LTV, LTV:CAC Ratio
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
# 1. CAC — Customer Acquisition Cost
# ---------------------------------------------------------------------------

class CACInput(BaseModel):
    total_sales_marketing_spend: float = Field(
        ..., gt=0,
        description="Total sales + marketing spend for the period"
    )
    new_customers_acquired: int = Field(
        ..., gt=0,
        description="Number of new customers acquired in the same period"
    )


@router.post("/cac", response_model=MetricResult, summary="Calculate CAC")
def calculate_cac(data: CACInput):
    cac = round(data.total_sales_marketing_spend / data.new_customers_acquired, 4)

    if cac < 500:
        interpretation = (
            f"Low CAC of ₹{cac:.2f}. You are acquiring customers very efficiently. "
            "Ensure product quality retains them so LTV stays high."
        )
    elif cac < 2000:
        interpretation = (
            f"Moderate CAC of ₹{cac:.2f}. Sustainable for most B2C businesses "
            "provided LTV is at least 3× this figure."
        )
    elif cac < 10000:
        interpretation = (
            f"High CAC of ₹{cac:.2f}. Common in B2B or premium segments. "
            "Validate with LTV:CAC ratio — you need LTV ≥ ₹{cac * 3:,.0f} to break even long-term."
        )
    else:
        interpretation = (
            f"Very high CAC of ₹{cac:.2f}. Review your sales funnel, channel mix, "
            "and sales-team efficiency. This level requires a very high LTV to be viable."
        )

    return MetricResult(
        metric="CAC",
        result=cac,
        unit="currency per customer",
        formula="CAC = Total Sales & Marketing Spend ÷ New Customers Acquired",
        interpretation=interpretation,
    )


# ---------------------------------------------------------------------------
# 2. LTV — Customer Lifetime Value
# ---------------------------------------------------------------------------

class LTVInput(BaseModel):
    average_order_value: float = Field(
        ..., gt=0,
        description="Average revenue per transaction / order"
    )
    purchase_frequency: float = Field(
        ..., gt=0,
        description="Average number of purchases per customer per year"
    )
    average_customer_lifespan_years: float = Field(
        ..., gt=0,
        description="Average number of years a customer stays active"
    )
    gross_margin_percent: float = Field(
        ..., gt=0, le=100,
        description="Gross margin as a percentage (e.g. 60 for 60%)"
    )


@router.post("/ltv", response_model=MetricResult, summary="Calculate LTV")
def calculate_ltv(data: LTVInput):
    # Annual customer value × lifespan × margin
    annual_value = data.average_order_value * data.purchase_frequency
    gross_ltv = annual_value * data.average_customer_lifespan_years
    ltv = round(gross_ltv * (data.gross_margin_percent / 100), 4)

    if ltv < 1000:
        interpretation = (
            f"LTV of ₹{ltv:.2f} is relatively low. Focus on increasing purchase "
            "frequency, average order value, or customer retention to grow this figure."
        )
    elif ltv < 10000:
        interpretation = (
            f"Solid LTV of ₹{ltv:.2f}. Ensure CAC stays well below ₹{ltv / 3:,.0f} "
            "(⅓ of LTV) to maintain a healthy unit economy."
        )
    elif ltv < 50000:
        interpretation = (
            f"Strong LTV of ₹{ltv:.2f}. You have room to invest aggressively in "
            "acquisition. Keep churn low to protect this figure."
        )
    else:
        interpretation = (
            f"Exceptional LTV of ₹{ltv:.2f}. This is a high-value customer base — "
            "invest heavily in retention, upsells, and referral programs."
        )

    return MetricResult(
        metric="LTV",
        result=ltv,
        unit="currency per customer (lifetime)",
        formula="LTV = Average Order Value × Purchase Frequency × Customer Lifespan × Gross Margin %",
        interpretation=interpretation,
    )


# ---------------------------------------------------------------------------
# 3. LTV:CAC Ratio
# ---------------------------------------------------------------------------

class LTVCACInput(BaseModel):
    ltv: float = Field(..., gt=0, description="Customer Lifetime Value")
    cac: float = Field(..., gt=0, description="Customer Acquisition Cost")


@router.post("/ltv-cac-ratio", response_model=MetricResult, summary="Calculate LTV:CAC Ratio")
def calculate_ltv_cac_ratio(data: LTVCACInput):
    ratio = round(data.ltv / data.cac, 4)

    if ratio < 1:
        interpretation = (
            f"LTV:CAC ratio of {ratio:.2f} means you are spending more to acquire a customer "
            "than they will ever return. The business model is not viable at current economics. "
            "Reduce CAC or increase LTV urgently."
        )
    elif ratio < 3:
        interpretation = (
            f"LTV:CAC ratio of {ratio:.2f} is below the healthy 3:1 benchmark. "
            "You are recovering acquisition costs but with thin headroom for operations. "
            "Prioritise either cutting CAC or boosting retention."
        )
    elif ratio <= 5:
        interpretation = (
            f"Healthy LTV:CAC ratio of {ratio:.2f}. The 3–5× range is the sweet spot — "
            "you recoup acquisition costs well and have margin to invest in growth."
        )
    else:
        interpretation = (
            f"LTV:CAC ratio of {ratio:.2f} is excellent. You may actually be "
            "under-investing in acquisition. Consider increasing ad spend or "
            "expanding to new channels to accelerate growth."
        )

    return MetricResult(
        metric="LTV:CAC Ratio",
        result=ratio,
        unit="x (ratio)",
        formula="LTV:CAC Ratio = LTV ÷ CAC",
        interpretation=interpretation,
    )