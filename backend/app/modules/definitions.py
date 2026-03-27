"""
Brikell DD Module Definitions
All 20 due-diligence modules: schemas, prompts, and dependency graph.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Base model — every module output inherits these fields
# ---------------------------------------------------------------------------

class DDModuleBase(BaseModel):
    executive_summary: str = Field(
        ..., description="2-3 sentence summary of this module's findings"
    )
    key_metrics: dict = Field(
        default_factory=dict,
        description="Most important numbers, e.g. {'gba_sqm': 3200}",
    )
    risk_flags: list[str] = Field(
        default_factory=list, description="Risk descriptions; empty if none"
    )
    confidence_score: float = Field(
        ..., ge=0.0, le=1.0, description="Overall confidence in this analysis"
    )
    notes: str = Field(
        default="", description="Caveats, data gaps, analyst notes"
    )


# ---------------------------------------------------------------------------
# Module config dataclass
# ---------------------------------------------------------------------------

@dataclass
class ModuleConfig:
    key: str
    number: int
    name: str
    system_prompt: str
    schema: type
    dependencies: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Shared prompt fragments
# ---------------------------------------------------------------------------

_PROMPT_FOOTER = (
    "\n\nIMPORTANT RULES:\n"
    "- This is Danish commercial real estate due diligence.\n"
    "- Use ONLY the data provided. Set fields to null when data is missing.\n"
    "- All monetary values in DKK thousands (DKK '000).\n"
    "- All areas in square metres (sqm).\n"
    "- Be conservative in estimates and cite data sources where possible.\n"
)


def _prompt(body: str) -> str:
    return body.strip() + _PROMPT_FOOTER


# ---------------------------------------------------------------------------
# Module 01 — Building Overview
# ---------------------------------------------------------------------------

class Module01BuildingOverview(DDModuleBase):
    year_built: Optional[int] = None
    construction_type: Optional[str] = None
    floor_count: Optional[int] = None
    total_gba_sqm: Optional[float] = None
    total_nla_sqm: Optional[float] = None
    use_category: Optional[str] = None
    heating_source: Optional[str] = None
    energy_label: Optional[str] = None
    anomalies: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Module 02 — Building Count
# ---------------------------------------------------------------------------

class Module02BuildingCount(DDModuleBase):
    building_count: Optional[int] = None
    buildings: list[dict] = Field(default_factory=list)
    cadastral_discrepancies: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Module 03 — Lokalplan / Kommuneplan
# ---------------------------------------------------------------------------

class Module03LokalplanKommuneplan(DDModuleBase):
    lokalplan_ref: Optional[str] = None
    formaal: Optional[str] = None
    bebyggelsesprocent_permitted: Optional[float] = None
    max_etager: Optional[int] = None
    anvendelsesbestemmelser: list[str] = Field(default_factory=list)
    bbr_notes: list[str] = Field(default_factory=list)
    discrepancies: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Module 04 — Regulatory Risk
# ---------------------------------------------------------------------------

class Module04RegulatoryRisk(DDModuleBase):
    use_compliance: Literal["LOW", "MEDIUM", "HIGH", "UNKNOWN"] = "UNKNOWN"
    v1_v2_status: Literal["LOW", "MEDIUM", "HIGH", "UNKNOWN"] = "UNKNOWN"
    listed_preservation_status: Literal["LOW", "MEDIUM", "HIGH", "UNKNOWN"] = "UNKNOWN"
    flood_risk: Literal["LOW", "MEDIUM", "HIGH", "UNKNOWN"] = "UNKNOWN"
    noise_exposure: Literal["LOW", "MEDIUM", "HIGH", "UNKNOWN"] = "UNKNOWN"
    open_building_cases: Literal["LOW", "MEDIUM", "HIGH", "UNKNOWN"] = "UNKNOWN"
    overall_regulatory_risk: Literal["LOW", "MEDIUM", "HIGH", "UNKNOWN"] = "UNKNOWN"
    risk_details: dict = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Module 05 — Occupation Permits
# ---------------------------------------------------------------------------

class Module05OccupationPermits(DDModuleBase):
    permit_status: Literal["present", "absent", "conditional", "unknown"] = "unknown"
    buildings_without_permits: list[str] = Field(default_factory=list)
    municipality: Optional[str] = None
    action_required: bool = False


# ---------------------------------------------------------------------------
# Module 06 — Feasibility Analysis
# ---------------------------------------------------------------------------

class Module06FeasibilityAnalysis(DDModuleBase):
    current_bebyggelsesprocent: Optional[float] = None
    permitted_bebyggelsesprocent: Optional[float] = None
    remaining_build_rights_sqm: Optional[float] = None
    rooftop_conversion_possible: bool = False
    rooftop_potential_sqm: Optional[float] = None
    use_conversion_feasible: bool = False
    estimated_gba_uplift_sqm: Optional[float] = None


# ---------------------------------------------------------------------------
# Module 07 — Reversionary Potential
# ---------------------------------------------------------------------------

class Module07ReversionaryPotential(DDModuleBase):
    passing_rent_total: Optional[float] = None
    erv_total: Optional[float] = None
    reversionary_gap_total: Optional[float] = None
    reversionary_gap_pct: Optional[float] = None
    wale_years: Optional[float] = None
    reversionary_yield: Optional[float] = None
    passing_yield: Optional[float] = None
    capitalised_reversion_value: Optional[float] = None


# ---------------------------------------------------------------------------
# Module 08 — ERV Estimation
# ---------------------------------------------------------------------------

class Module08ERVEstimation(DDModuleBase):
    erv_residential_per_sqm: Optional[float] = None
    erv_commercial_per_sqm: Optional[float] = None
    erv_storage_per_sqm: Optional[float] = None
    erv_parking_per_unit: Optional[float] = None
    erv_confidence: Literal["LOW", "MEDIUM", "HIGH"] = "LOW"
    comparable_count: int = 0
    methodology: str = ""


# ---------------------------------------------------------------------------
# Module 09 — Revenue by Type
# ---------------------------------------------------------------------------

class Module09RevenueByType(DDModuleBase):
    residential_gpi: Optional[float] = None
    commercial_gpi: Optional[float] = None
    parking_gpi: Optional[float] = None
    storage_gpi: Optional[float] = None
    total_gpi: Optional[float] = None
    vacancy_deduction: Optional[float] = None
    effective_gross_income: Optional[float] = None
    missing_revenue_streams: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Module 10 — OPEX Estimation
# ---------------------------------------------------------------------------

class Module10OPEXEstimation(DDModuleBase):
    grundskyld: Optional[float] = None
    forsikring: Optional[float] = None
    ejendomsadministration: Optional[float] = None
    vedligeholdelse: Optional[float] = None
    faellesudgifter: Optional[float] = None
    renoveringsreserve: Optional[float] = None
    total_opex: Optional[float] = None
    opex_per_sqm: Optional[float] = None
    opex_low: Optional[float] = None
    opex_mid: Optional[float] = None
    opex_high: Optional[float] = None


# ---------------------------------------------------------------------------
# Module 11 — Asset Characteristics
# ---------------------------------------------------------------------------

class Module11AssetCharacteristics(DDModuleBase):
    tenure_type: Optional[str] = None
    use_mix_pct: dict = Field(default_factory=dict)
    construction_era: Optional[str] = None
    listed_status: bool = False
    lejelov_classification: Optional[str] = None
    strategic_category: Optional[str] = None
    strategic_rationale: Optional[str] = None
    fund_eligibility_flags: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Module 12 — Sqm Reconciliation
# ---------------------------------------------------------------------------

class Module12SqmReconciliation(DDModuleBase):
    total_bbr_sqm: Optional[float] = None
    total_rent_roll_sqm: Optional[float] = None
    discrepancy_sqm: Optional[float] = None
    discrepancy_pct: Optional[float] = None
    financial_impact_dkk: Optional[float] = None
    rent_roll_available: bool = False


# ---------------------------------------------------------------------------
# Module 13 — Market Research
# ---------------------------------------------------------------------------

class Module13MarketResearch(DDModuleBase):
    location_score: Optional[float] = None
    population_trend: Optional[str] = None
    employment_base: Optional[str] = None
    transaction_yield_range: dict = Field(default_factory=dict)
    demand_drivers: list[str] = Field(default_factory=list)
    risk_factors: list[str] = Field(default_factory=list)
    oversupply_risk: Literal["LOW", "MEDIUM", "HIGH", "UNKNOWN"] = "UNKNOWN"


# ---------------------------------------------------------------------------
# Module 14 — Nearby Areas
# ---------------------------------------------------------------------------

class Module14NearbyAreas(DDModuleBase):
    transit_score: Optional[float] = None
    retail_score: Optional[float] = None
    schools_score: Optional[float] = None
    green_space_score: Optional[float] = None
    overall_amenity_score: Optional[float] = None
    noise_rating: Literal["LOW", "MEDIUM", "HIGH", "UNKNOWN"] = "UNKNOWN"
    flood_zone: bool = False
    nearest_metro_minutes: Optional[int] = None
    key_employers_nearby: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Module 15 — Upcoming Supply
# ---------------------------------------------------------------------------

class Module15UpcomingSupply(DDModuleBase):
    pipeline_projects: list[dict] = Field(default_factory=list)
    total_pipeline_sqm: Optional[float] = None
    supply_risk: Literal["LOW", "MEDIUM", "HIGH", "UNKNOWN"] = "UNKNOWN"
    impact_on_erv: Optional[str] = None


# ---------------------------------------------------------------------------
# Module 16 — Rent Type & Lease Structure
# ---------------------------------------------------------------------------

class Module16RentTypeLeaseStructure(DDModuleBase):
    regulated_units: Optional[int] = None
    liberalised_units: Optional[int] = None
    regulated_pct: Optional[float] = None
    avg_regulated_rent_per_sqm: Optional[float] = None
    avg_liberalised_rent_per_sqm: Optional[float] = None
    liberalisation_eligible_units: list[str] = Field(default_factory=list)
    valuation_methodology_notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Module 17 — DGNB & ESG
# ---------------------------------------------------------------------------

class Module17DGNBAndESG(DDModuleBase):
    current_dgnb_status: Optional[str] = None
    energy_label: Optional[str] = None
    green_loan_eligible: bool = False
    dgnb_gap_to_bronze: Optional[str] = None
    estimated_capex_for_certification_dkk: Optional[float] = None
    epbd_obsolescence_risk: Literal["LOW", "MEDIUM", "HIGH", "UNKNOWN"] = "UNKNOWN"
    fjernvarme_connected: bool = False
    esg_flags: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Module 18 — NPV / DCF Analysis
# ---------------------------------------------------------------------------

class Module18NPVDCFAnalysis(DDModuleBase):
    acquisition_price: Optional[float] = None
    equity_invested: Optional[float] = None
    annual_cashflows: list[dict] = Field(default_factory=list)
    terminal_value: Optional[float] = None
    npv: Optional[float] = None
    irr_pct: Optional[float] = None
    equity_multiple: Optional[float] = None
    cash_on_cash_return_pct: Optional[float] = None
    sensitivity_table: list[list[float]] = Field(default_factory=list)
    sensitivity_row_labels: list[str] = Field(default_factory=list)
    sensitivity_col_labels: list[str] = Field(default_factory=list)
    key_assumptions: dict = Field(default_factory=dict)
    methodology: str = ""


# ---------------------------------------------------------------------------
# Module 19 — WHT & Transfer Pricing
# ---------------------------------------------------------------------------

class Module19WHTTransferPricing(DDModuleBase):
    ownership_structure: Optional[str] = None
    cross_border_structure_detected: bool = False
    applicable_wht_rate_pct: Optional[float] = None
    eu_parent_subsidiary_applicable: bool = False
    tp_risks: list[str] = Field(default_factory=list)
    tax_counsel_recommended: bool = False
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "UNKNOWN"] = "UNKNOWN"


# ---------------------------------------------------------------------------
# Module 20 — Executive Summary
# ---------------------------------------------------------------------------

class Module20ExecutiveSummary(DDModuleBase):
    asset_description: str = ""
    price_per_sqm: Optional[float] = None
    erv_yield: Optional[float] = None
    reversionary_yield: Optional[float] = None
    npv: Optional[float] = None
    irr_pct: Optional[float] = None
    equity_multiple: Optional[float] = None
    top_upside_drivers: list[str] = Field(default_factory=list)
    top_risk_factors: list[str] = Field(default_factory=list)
    regulatory_status_summary: str = ""
    recommendation: Literal[
        "PROCEED", "PROCEED_WITH_CONDITIONS", "DO_NOT_PROCEED"
    ] = "PROCEED_WITH_CONDITIONS"
    recommendation_rationale: str = ""


# ---------------------------------------------------------------------------
# Module configs list
# ---------------------------------------------------------------------------

MODULE_CONFIGS: list[ModuleConfig] = [
    # ------ 01 Building Overview ------
    ModuleConfig(
        key="01_building_overview",
        number=1,
        name="Building Overview",
        schema=Module01BuildingOverview,
        dependencies=[],
        system_prompt=_prompt(
            "You are Module 01 — Building Overview.\n"
            "Purpose: Extract and summarise the core physical characteristics of "
            "the subject property from BBR data, floor plans, and uploaded documents.\n"
            "Output year built, construction type, floor count, GBA/NLA, use category, "
            "heating source, energy label, and any data anomalies."
        ),
    ),
    # ------ 02 Building Count ------
    ModuleConfig(
        key="02_building_count",
        number=2,
        name="Building Count",
        schema=Module02BuildingCount,
        dependencies=[],
        system_prompt=_prompt(
            "You are Module 02 — Building Count.\n"
            "Purpose: Determine the number of buildings on the property and reconcile "
            "against cadastral records. List each building with its BBR number, area, "
            "and use. Flag any discrepancies between cadastral data and physical records."
        ),
    ),
    # ------ 03 Lokalplan / Kommuneplan ------
    ModuleConfig(
        key="03_lokalplan_kommuneplan",
        number=3,
        name="Lokalplan / Kommuneplan",
        schema=Module03LokalplanKommuneplan,
        dependencies=[],
        system_prompt=_prompt(
            "You are Module 03 — Lokalplan / Kommuneplan.\n"
            "Purpose: Extract the applicable local plan (lokalplan) and municipal plan "
            "(kommuneplan) parameters for the property. Identify permitted use, "
            "bebyggelsesprocent, max floor count, and any BBR notes or discrepancies "
            "between plan requirements and current use."
        ),
    ),
    # ------ 04 Regulatory Risk ------
    ModuleConfig(
        key="04_regulatory_risk",
        number=4,
        name="Regulatory Risk",
        schema=Module04RegulatoryRisk,
        dependencies=[],
        system_prompt=_prompt(
            "You are Module 04 — Regulatory Risk.\n"
            "Purpose: Assess regulatory risk across six dimensions: use compliance, "
            "V1/V2 contamination status, listed/preservation status, flood risk, "
            "noise exposure, and open building cases. Rate each LOW/MEDIUM/HIGH/UNKNOWN "
            "and provide an overall regulatory risk rating with supporting details."
        ),
    ),
    # ------ 05 Occupation Permits ------
    ModuleConfig(
        key="05_occupation_permits",
        number=5,
        name="Occupation Permits",
        schema=Module05OccupationPermits,
        dependencies=[],
        system_prompt=_prompt(
            "You are Module 05 — Occupation Permits.\n"
            "Purpose: Verify the occupation permit (ibrugtagningstilladelse) status "
            "for each building on the property. Identify buildings without permits, "
            "the responsible municipality, and whether action is required."
        ),
    ),
    # ------ 06 Feasibility Analysis ------
    ModuleConfig(
        key="06_feasibility_analysis",
        number=6,
        name="Feasibility Analysis",
        schema=Module06FeasibilityAnalysis,
        dependencies=[
            "01_building_overview",
            "03_lokalplan_kommuneplan",
            "04_regulatory_risk",
        ],
        system_prompt=_prompt(
            "You are Module 06 — Feasibility Analysis.\n"
            "Purpose: Evaluate the physical and regulatory feasibility of expanding "
            "the property. Compare current bebyggelsesprocent against permitted limits, "
            "calculate remaining build rights, assess rooftop conversion and use "
            "conversion potential, and estimate GBA uplift."
        ),
    ),
    # ------ 07 Reversionary Potential ------
    ModuleConfig(
        key="07_reversionary_potential",
        number=7,
        name="Reversionary Potential",
        schema=Module07ReversionaryPotential,
        dependencies=[
            "06_feasibility_analysis",
            "08_erv_estimation",
        ],
        system_prompt=_prompt(
            "You are Module 07 — Reversionary Potential.\n"
            "Purpose: Quantify the gap between passing rent and estimated rental "
            "value (ERV). Calculate total reversionary gap, gap percentage, WALE, "
            "reversionary yield, passing yield, and the capitalised value of the "
            "reversion. This informs upside potential from lease roll-overs."
        ),
    ),
    # ------ 08 ERV Estimation ------
    ModuleConfig(
        key="08_erv_estimation",
        number=8,
        name="ERV Estimation",
        schema=Module08ERVEstimation,
        dependencies=[
            "01_building_overview",
            "11_asset_characteristics",
            "13_market_research",
        ],
        system_prompt=_prompt(
            "You are Module 08 — ERV Estimation.\n"
            "Purpose: Estimate the Estimated Rental Value (ERV) per sqm for each "
            "use type (residential, commercial, storage, parking). State the number "
            "of comparables used, confidence level, and methodology. ERV should "
            "reflect achievable market rent at the valuation date."
        ),
    ),
    # ------ 09 Revenue by Type ------
    ModuleConfig(
        key="09_revenue_by_type",
        number=9,
        name="Revenue by Type",
        schema=Module09RevenueByType,
        dependencies=[
            "08_erv_estimation",
            "16_rent_type_lease_structure",
        ],
        system_prompt=_prompt(
            "You are Module 09 — Revenue by Type.\n"
            "Purpose: Break down Gross Potential Income (GPI) by use type: "
            "residential, commercial, parking, and storage. Apply vacancy "
            "deductions to arrive at Effective Gross Income (EGI). Flag any "
            "missing revenue streams that should be investigated."
        ),
    ),
    # ------ 10 OPEX Estimation ------
    ModuleConfig(
        key="10_opex_estimation",
        number=10,
        name="OPEX Estimation",
        schema=Module10OPEXEstimation,
        dependencies=[
            "01_building_overview",
            "11_asset_characteristics",
        ],
        system_prompt=_prompt(
            "You are Module 10 — OPEX Estimation.\n"
            "Purpose: Estimate operating expenses for the property including "
            "grundskyld, forsikring, ejendomsadministration, vedligeholdelse, "
            "fællesudgifter, and renoveringsreserve. Provide total OPEX, OPEX "
            "per sqm, and low/mid/high scenarios."
        ),
    ),
    # ------ 11 Asset Characteristics ------
    ModuleConfig(
        key="11_asset_characteristics",
        number=11,
        name="Asset Characteristics",
        schema=Module11AssetCharacteristics,
        dependencies=[
            "01_building_overview",
            "03_lokalplan_kommuneplan",
            "04_regulatory_risk",
        ],
        system_prompt=_prompt(
            "You are Module 11 — Asset Characteristics.\n"
            "Purpose: Classify the asset by tenure type, use mix, construction era, "
            "listed status, and lejelov classification. Determine strategic category "
            "(core/value-add/opportunistic) with rationale and assess fund eligibility."
        ),
    ),
    # ------ 12 Sqm Reconciliation ------
    ModuleConfig(
        key="12_sqm_reconciliation",
        number=12,
        name="Sqm Reconciliation",
        schema=Module12SqmReconciliation,
        dependencies=[
            "01_building_overview",
            "02_building_count",
            "11_asset_characteristics",
        ],
        system_prompt=_prompt(
            "You are Module 12 — Sqm Reconciliation.\n"
            "Purpose: Reconcile total area from BBR records against the rent roll. "
            "Calculate the discrepancy in sqm and percentage, estimate the financial "
            "impact in DKK, and flag whether a rent roll was available for comparison."
        ),
    ),
    # ------ 13 Market Research ------
    ModuleConfig(
        key="13_market_research",
        number=13,
        name="Market Research",
        schema=Module13MarketResearch,
        dependencies=[
            "01_building_overview",
            "14_nearby_areas",
        ],
        system_prompt=_prompt(
            "You are Module 13 — Market Research.\n"
            "Purpose: Analyse the local market for the subject property. Score the "
            "location, assess population trends, employment base, and transaction "
            "yield ranges. Identify demand drivers, risk factors, and oversupply risk."
        ),
    ),
    # ------ 14 Nearby Areas ------
    ModuleConfig(
        key="14_nearby_areas",
        number=14,
        name="Nearby Areas",
        schema=Module14NearbyAreas,
        dependencies=[],
        system_prompt=_prompt(
            "You are Module 14 — Nearby Areas.\n"
            "Purpose: Evaluate the immediate surroundings of the property. Score "
            "transit, retail, schools, and green space amenities. Assess noise "
            "rating, flood zone status, nearest metro distance, and identify "
            "key employers nearby."
        ),
    ),
    # ------ 15 Upcoming Supply ------
    ModuleConfig(
        key="15_upcoming_supply",
        number=15,
        name="Upcoming Supply",
        schema=Module15UpcomingSupply,
        dependencies=[
            "13_market_research",
            "14_nearby_areas",
        ],
        system_prompt=_prompt(
            "You are Module 15 — Upcoming Supply.\n"
            "Purpose: Identify development pipeline projects in the area that could "
            "affect the subject property. List projects with sqm, expected completion, "
            "and use type. Assess overall supply risk and potential impact on ERV."
        ),
    ),
    # ------ 16 Rent Type & Lease Structure ------
    ModuleConfig(
        key="16_rent_type_lease_structure",
        number=16,
        name="Rent Type & Lease Structure",
        schema=Module16RentTypeLeaseStructure,
        dependencies=[
            "01_building_overview",
            "11_asset_characteristics",
        ],
        system_prompt=_prompt(
            "You are Module 16 — Rent Type & Lease Structure.\n"
            "Purpose: Classify units by rent regulation type (regulated vs. "
            "liberalised). Calculate the share of regulated units, average rents "
            "per sqm for each type, identify units eligible for liberalisation, "
            "and note valuation methodology implications."
        ),
    ),
    # ------ 17 DGNB & ESG ------
    ModuleConfig(
        key="17_dgnb_and_esg",
        number=17,
        name="DGNB & ESG",
        schema=Module17DGNBAndESG,
        dependencies=[
            "01_building_overview",
            "11_asset_characteristics",
        ],
        system_prompt=_prompt(
            "You are Module 17 — DGNB & ESG.\n"
            "Purpose: Assess the property's sustainability profile. Determine "
            "current DGNB status, energy label, green loan eligibility, gap to "
            "DGNB Bronze, estimated capex for certification, EPBD obsolescence "
            "risk, fjernvarme connection, and any ESG flags."
        ),
    ),
    # ------ 18 NPV / DCF Analysis ------
    ModuleConfig(
        key="18_npv_dcf_analysis",
        number=18,
        name="NPV / DCF Analysis",
        schema=Module18NPVDCFAnalysis,
        dependencies=[
            "07_reversionary_potential",
            "08_erv_estimation",
            "09_revenue_by_type",
            "10_opex_estimation",
        ],
        system_prompt=_prompt(
            "You are Module 18 — NPV / DCF Analysis.\n"
            "Purpose: Build a discounted cash-flow model for the property. "
            "Project annual cash flows over the hold period, calculate terminal "
            "value, NPV, IRR, equity multiple, and cash-on-cash return. Provide "
            "a sensitivity table varying discount rate and exit yield. State all "
            "key assumptions and methodology."
        ),
    ),
    # ------ 19 WHT & Transfer Pricing ------
    ModuleConfig(
        key="19_wht_transfer_pricing",
        number=19,
        name="WHT & Transfer Pricing",
        schema=Module19WHTTransferPricing,
        dependencies=[
            "18_npv_dcf_analysis",
        ],
        system_prompt=_prompt(
            "You are Module 19 — WHT & Transfer Pricing.\n"
            "Purpose: Analyse withholding tax and transfer pricing risks for the "
            "acquisition structure. Identify ownership structure, cross-border "
            "elements, applicable WHT rates, EU Parent-Subsidiary Directive "
            "applicability, TP risks, and whether external tax counsel is recommended."
        ),
    ),
    # ------ 20 Executive Summary ------
    ModuleConfig(
        key="20_executive_summary",
        number=20,
        name="Executive Summary",
        schema=Module20ExecutiveSummary,
        dependencies=[
            "01_building_overview",
            "02_building_count",
            "03_lokalplan_kommuneplan",
            "04_regulatory_risk",
            "05_occupation_permits",
            "06_feasibility_analysis",
            "07_reversionary_potential",
            "08_erv_estimation",
            "09_revenue_by_type",
            "10_opex_estimation",
            "11_asset_characteristics",
            "12_sqm_reconciliation",
            "13_market_research",
            "14_nearby_areas",
            "15_upcoming_supply",
            "16_rent_type_lease_structure",
            "17_dgnb_and_esg",
            "18_npv_dcf_analysis",
            "19_wht_transfer_pricing",
        ],
        system_prompt=_prompt(
            "You are Module 20 — Executive Summary.\n"
            "Purpose: Synthesise findings from all 19 prior modules into a final "
            "investment recommendation. Summarise the asset, key financial metrics "
            "(price/sqm, ERV yield, reversionary yield, NPV, IRR, equity multiple), "
            "top upside drivers, top risk factors, regulatory status, and provide a "
            "recommendation of PROCEED, PROCEED_WITH_CONDITIONS, or DO_NOT_PROCEED "
            "with supporting rationale. Use only the executive_summary output from "
            "each prior module as input."
        ),
    ),
]


# ---------------------------------------------------------------------------
# Context dependency graph — quick lookup dict
# ---------------------------------------------------------------------------

CONTEXT_DEPENDENCIES: dict[str, list[str]] = {
    cfg.key: cfg.dependencies for cfg in MODULE_CONFIGS
}
