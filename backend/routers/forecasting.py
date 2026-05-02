"""
Module 4 — Advanced Forecasting
Endpoints: Break-Even Point, Ad Spend Forecaster
Uses numpy for projection arrays. All inputs validated by Pydantic.
All outputs include the result, formula, and plain-English interpretation.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field, model_validator
from typing import List
import numpy as np

router = APIRouter()


# ---------------------------------------------------------------------------
# Shared models
# ---------------------------------------------------------------------------

class MetricResult(BaseModel):
    metric: str
    result: float
    unit: str
    formula: str
    interpretation: str


class ForecastPoint(BaseModel):
    month: int
    ad_spend: float
    projected_revenue: float
    projected_roas: float
    projected_profit: float
    cumulative_spend: float
    cumulative_revenue: float


class ForecastResult(BaseModel):
    metric: str
    formula: str
    interpretation: str
    monthly_projections: List[ForecastPoint]
    break_even_month: int | None   # None if break-even not reached in window
    total_spend: float
    total_revenue: float
    overall_roas: float


# ---------------------------------------------------------------------------
# 1. Break-Even Point
# ---------------------------------------------------------------------------

class BreakEvenInput(BaseModel):
    fixed_costs: float = Field(
        ..., gt=0,
        description="Total fixed costs for the period (rent, salaries, software, etc.)"
    )
    average_selling_price: float = Field(
        ..., gt=0,
        description="Average revenue per unit sold"
    )
    variable_cost_per_unit: float = Field(
        ..., ge=0,
        description="Variable cost to produce / deliver one unit"
    )

    @model_validator(mode="after")
    def price_must_exceed_variable_cost(self):
        if self.variable_cost_per_unit >= self.average_selling_price:
            raise ValueError(
                "Variable cost per unit must be less than the selling price, "
                "otherwise contribution margin is zero or negative."
            )
        return self


@router.post("/break-even", response_model=MetricResult, summary="Calculate Break-Even Point")
def calculate_break_even(data: BreakEvenInput):
    contribution_margin = data.average_selling_price - data.variable_cost_per_unit
    break_even_units = data.fixed_costs / contribution_margin
    break_even_revenue = break_even_units * data.average_selling_price

    break_even_units_rounded = round(break_even_units, 2)
    break_even_revenue_rounded = round(break_even_revenue, 2)
    cm_percent = round((contribution_margin / data.average_selling_price) * 100, 2)

    if break_even_units < 50:
        interpretation = (
            f"You need to sell {break_even_units_rounded:.0f} units (₹{break_even_revenue_rounded:,.2f}) "
            f"to cover all fixed costs. "
            f"With a contribution margin of {cm_percent}%, this is a low break-even threshold — "
            f"strong unit economics. Every sale beyond this point generates pure profit."
        )
    elif break_even_units < 500:
        interpretation = (
            f"Break-even at {break_even_units_rounded:.0f} units / ₹{break_even_revenue_rounded:,.2f} revenue. "
            f"Contribution margin is {cm_percent}%. "
            f"Assess whether your current sales velocity can reliably hit this volume. "
            f"Consider reducing fixed costs or increasing price to lower the threshold."
        )
    elif break_even_units < 5000:
        interpretation = (
            f"High break-even of {break_even_units_rounded:.0f} units / ₹{break_even_revenue_rounded:,.2f}. "
            f"You need significant volume to cover costs. "
            f"With a {cm_percent}% contribution margin, focus on scaling sales channels "
            f"and automating fulfilment to handle the required volume profitably."
        )
    else:
        interpretation = (
            f"Very high break-even of {break_even_units_rounded:.0f} units / ₹{break_even_revenue_rounded:,.2f}. "
            f"Re-examine your fixed cost structure — can any costs be made variable? "
            f"A {cm_percent}% margin at this volume requires a substantial, reliable sales pipeline."
        )

    return MetricResult(
        metric="Break-Even Point",
        result=break_even_units_rounded,
        unit="units (see interpretation for revenue equivalent)",
        formula=(
            "Contribution Margin = Selling Price − Variable Cost per Unit | "
            "Break-Even Units = Fixed Costs ÷ Contribution Margin"
        ),
        interpretation=interpretation,
    )


# ---------------------------------------------------------------------------
# 2. Ad Spend Forecaster
# ---------------------------------------------------------------------------

class AdSpendForecastInput(BaseModel):
    initial_monthly_spend: float = Field(
        ..., gt=0,
        description="Starting monthly ad budget"
    )
    monthly_spend_growth_rate: float = Field(
        ..., ge=0, le=200,
        description="Month-over-month budget growth rate as a percentage (e.g. 10 for 10%)"
    )
    initial_roas: float = Field(
        ..., gt=0,
        description="Starting ROAS (e.g. 3.5 means ₹3.50 revenue per ₹1 spent)"
    )
    roas_growth_rate: float = Field(
        ..., ge=-50, le=100,
        description=(
            "Expected monthly change in ROAS as a percentage. "
            "Positive = improving efficiency; negative = diminishing returns at scale."
        )
    )
    gross_margin_percent: float = Field(
        ..., gt=0, le=100,
        description="Gross margin percentage used to calculate profit from revenue"
    )
    forecast_months: int = Field(
        ..., ge=1, le=24,
        description="Number of months to forecast (1–24)"
    )
    fixed_costs_per_month: float = Field(
        default=0.0, ge=0,
        description="Monthly fixed operating costs to subtract from gross profit"
    )


@router.post("/ad-spend-forecast", response_model=ForecastResult, summary="Forecast Ad Spend & Revenue")
def forecast_ad_spend(data: AdSpendForecastInput):
    months = np.arange(1, data.forecast_months + 1)

    # Compound spend and ROAS month-over-month
    spend_growth = (1 + data.monthly_spend_growth_rate / 100) ** (months - 1)
    roas_growth  = (1 + data.roas_growth_rate / 100) ** (months - 1)

    monthly_spends   = data.initial_monthly_spend * spend_growth
    monthly_roas     = np.clip(data.initial_roas * roas_growth, 0.1, None)  # floor ROAS at 0.1
    monthly_revenues = monthly_spends * monthly_roas
    gross_profits    = monthly_revenues * (data.gross_margin_percent / 100)
    net_profits      = gross_profits - monthly_spends - data.fixed_costs_per_month

    cumulative_spend   = np.cumsum(monthly_spends)
    cumulative_revenue = np.cumsum(monthly_revenues)

    # Find break-even month (first month net profit is positive)
    break_even_month = None
    for i, profit in enumerate(net_profits):
        if profit >= 0:
            break_even_month = int(months[i])
            break

    projections = [
        ForecastPoint(
            month=int(months[i]),
            ad_spend=round(float(monthly_spends[i]), 2),
            projected_revenue=round(float(monthly_revenues[i]), 2),
            projected_roas=round(float(monthly_roas[i]), 4),
            projected_profit=round(float(net_profits[i]), 2),
            cumulative_spend=round(float(cumulative_spend[i]), 2),
            cumulative_revenue=round(float(cumulative_revenue[i]), 2),
        )
        for i in range(len(months))
    ]

    total_spend   = round(float(cumulative_spend[-1]), 2)
    total_revenue = round(float(cumulative_revenue[-1]), 2)
    overall_roas  = round(total_revenue / total_spend, 4) if total_spend > 0 else 0

    # Build interpretation
    profitable_months = int(np.sum(net_profits > 0))
    peak_roas  = round(float(np.max(monthly_roas)), 2)
    trough_roas = round(float(np.min(monthly_roas)), 2)

    if break_even_month:
        bep_text = f"Net profitability is first reached in Month {break_even_month}."
    else:
        bep_text = (
            f"Net profitability is NOT reached within the {data.forecast_months}-month window. "
            "Consider reducing fixed costs, improving ROAS, or extending the forecast horizon."
        )

    interpretation = (
        f"Over {data.forecast_months} months, total ad spend of ₹{total_spend:,.2f} is projected "
        f"to generate ₹{total_revenue:,.2f} in revenue (overall ROAS: {overall_roas}×). "
        f"{bep_text} "
        f"ROAS ranges from {trough_roas}× to {peak_roas}× across the period. "
        f"{profitable_months} of {data.forecast_months} months are net-profitable after "
        f"ad spend and fixed costs."
    )

    return ForecastResult(
        metric="Ad Spend Forecast",
        formula=(
            "Monthly Revenue = Ad Spend × ROAS | "
            "Net Profit = (Revenue × Gross Margin%) − Ad Spend − Fixed Costs"
        ),
        interpretation=interpretation,
        monthly_projections=projections,
        break_even_month=break_even_month,
        total_spend=total_spend,
        total_revenue=total_revenue,
        overall_roas=overall_roas,
    )