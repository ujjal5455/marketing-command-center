"""
Module 1 — Paid Media Metrics
Endpoints: ROAS, CPC, CPM, CTR
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
# 1. ROAS — Return on Ad Spend
# ---------------------------------------------------------------------------

class ROASInput(BaseModel):
    revenue: float = Field(..., gt=0, description="Total revenue generated from ads (₹ or $)")
    ad_spend: float = Field(..., gt=0, description="Total amount spent on ads")


@router.post("/roas", response_model=MetricResult, summary="Calculate ROAS")
def calculate_roas(data: ROASInput):
    roas = round(data.revenue / data.ad_spend, 4)

    if roas < 1:
        interpretation = (
            f"You are losing money — every ₹1 spent on ads returns only ₹{roas:.2f}. "
            "Review targeting, creatives, or landing page conversion rate immediately."
        )
    elif roas < 3:
        interpretation = (
            f"ROAS of {roas:.2f}x is below the typical 3x benchmark. "
            "Profitability depends on your margins; optimisation is recommended."
        )
    elif roas < 5:
        interpretation = (
            f"Healthy ROAS of {roas:.2f}x. You are generating ₹{roas:.2f} for every ₹1 spent. "
            "Maintain current strategy and test incremental improvements."
        )
    else:
        interpretation = (
            f"Excellent ROAS of {roas:.2f}x. Your campaigns are highly efficient. "
            "Consider scaling ad spend to capture more market share."
        )

    return MetricResult(
        metric="ROAS",
        result=roas,
        unit="x (ratio)",
        formula="ROAS = Revenue ÷ Ad Spend",
        interpretation=interpretation,
    )


# ---------------------------------------------------------------------------
# 2. CPC — Cost Per Click
# ---------------------------------------------------------------------------

class CPCInput(BaseModel):
    total_cost: float = Field(..., gt=0, description="Total ad spend")
    total_clicks: int = Field(..., gt=0, description="Total number of clicks received")


@router.post("/cpc", response_model=MetricResult, summary="Calculate CPC")
def calculate_cpc(data: CPCInput):
    cpc = round(data.total_cost / data.total_clicks, 4)

    if cpc < 10:
        interpretation = (
            f"Very low CPC of ₹{cpc:.2f}. Traffic is cheap — ensure click quality "
            "and conversion rate justify the channel."
        )
    elif cpc < 50:
        interpretation = (
            f"Moderate CPC of ₹{cpc:.2f}. Compare against your conversion value "
            "to confirm positive ROI."
        )
    elif cpc < 200:
        interpretation = (
            f"High CPC of ₹{cpc:.2f}. Typical for competitive B2B or finance niches. "
            "Ensure LTV justifies this acquisition cost."
        )
    else:
        interpretation = (
            f"Very high CPC of ₹{cpc:.2f}. Audit keyword targeting, Quality Score, "
            "and audience segments to bring costs down."
        )

    return MetricResult(
        metric="CPC",
        result=cpc,
        unit="currency per click",
        formula="CPC = Total Cost ÷ Total Clicks",
        interpretation=interpretation,
    )


# ---------------------------------------------------------------------------
# 3. CPM — Cost Per Thousand Impressions
# ---------------------------------------------------------------------------

class CPMInput(BaseModel):
    total_cost: float = Field(..., gt=0, description="Total ad spend")
    total_impressions: int = Field(..., gt=0, description="Total number of impressions")


@router.post("/cpm", response_model=MetricResult, summary="Calculate CPM")
def calculate_cpm(data: CPMInput):
    cpm = round((data.total_cost / data.total_impressions) * 1000, 4)

    if cpm < 50:
        interpretation = (
            f"Low CPM of ₹{cpm:.2f}. Cost-efficient reach — great for brand awareness campaigns."
        )
    elif cpm < 200:
        interpretation = (
            f"Average CPM of ₹{cpm:.2f}. Typical for social and display networks. "
            "Monitor frequency to avoid ad fatigue."
        )
    else:
        interpretation = (
            f"High CPM of ₹{cpm:.2f}. You are paying a premium for reach — likely "
            "a competitive or highly targeted audience. Validate with conversion data."
        )

    return MetricResult(
        metric="CPM",
        result=cpm,
        unit="currency per 1,000 impressions",
        formula="CPM = (Total Cost ÷ Total Impressions) × 1,000",
        interpretation=interpretation,
    )


# ---------------------------------------------------------------------------
# 4. CTR — Click-Through Rate
# ---------------------------------------------------------------------------

class CTRInput(BaseModel):
    total_clicks: int = Field(..., gt=0, description="Total number of clicks")
    total_impressions: int = Field(..., gt=0, description="Total number of impressions")

    @model_validator(mode="after")
    def clicks_cannot_exceed_impressions(self):
        if self.total_clicks > self.total_impressions:
            raise ValueError("Clicks cannot exceed impressions.")
        return self


@router.post("/ctr", response_model=MetricResult, summary="Calculate CTR")
def calculate_ctr(data: CTRInput):
    ctr = round((data.total_clicks / data.total_impressions) * 100, 4)

    if ctr < 0.5:
        interpretation = (
            f"Low CTR of {ctr:.2f}%. Your ad creative or targeting needs work. "
            "A/B test headlines, visuals, and audience segments."
        )
    elif ctr < 2:
        interpretation = (
            f"Average CTR of {ctr:.2f}%. Meets industry benchmarks for display. "
            "Test new creatives to push above 2%."
        )
    elif ctr < 5:
        interpretation = (
            f"Good CTR of {ctr:.2f}%. Your messaging resonates with the audience. "
            "Ensure the landing page matches ad intent to maximise conversions."
        )
    else:
        interpretation = (
            f"Excellent CTR of {ctr:.2f}%. Your ad is highly compelling. "
            "Scale confidently and protect creative freshness to sustain performance."
        )

    return MetricResult(
        metric="CTR",
        result=ctr,
        unit="% (percentage)",
        formula="CTR = (Total Clicks ÷ Total Impressions) × 100",
        interpretation=interpretation,
    )