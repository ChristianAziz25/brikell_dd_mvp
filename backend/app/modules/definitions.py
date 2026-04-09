"""
Due-diligence module definitions for Danish commercial real estate.

Contains 20 module schemas, their configs, and dependency graph.
Modules are listed in topological execution order so that every module
runs only after its dependencies have completed.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Shared footer appended to every system prompt
# ---------------------------------------------------------------------------

_RULES_FOOTER = """
IMPORTANT RULES:
- All monetary values in DKK thousands unless specified otherwise
- All areas in sqm
- Use ONLY data provided in the context; if data is missing, state null and explain in notes
- Be conservative in estimates
- Danish commercial real estate context applies throughout
""".strip()


def _prompt(body: str) -> str:
    """Combine a module-specific prompt body with the shared rules footer."""
    return f"{body.strip()}\n\n{_RULES_FOOTER}"


# ═══════════════════════════════════════════════════════════════════════════
# Base schema
# ═══════════════════════════════════════════════════════════════════════════

class DDModuleBase(BaseModel):
    """Fields shared by every due-diligence module."""

    executive_summary: str = Field(
        ..., description="Concise narrative summary of findings"
    )
    key_metrics: dict = Field(
        default_factory=dict, description="Headline KPIs for this module"
    )
    risk_flags: list[str] = Field(
        default_factory=list, description="Material risks identified"
    )
    confidence_score: float = Field(
        ..., ge=0.0, le=1.0,
        description="0-1 confidence in the analysis quality"
    )
    notes: Optional[str] = Field(
        None, description="Additional analyst notes or caveats"
    )


# ═══════════════════════════════════════════════════════════════════════════
# Module-specific schemas
# ═══════════════════════════════════════════════════════════════════════════

# --- Layer 0 ---------------------------------------------------------------

class Mod01BuildingOverview(DDModuleBase):
    """Module 01 - Building Overview."""

    year_built: Optional[int] = None
    construction_type: Optional[str] = None
    floor_count: Optional[int] = None
    gba_sqm: Optional[float] = None
    nla_sqm: Optional[float] = None
    use_category: Optional[str] = None
    heating_source: Optional[str] = None
    energy_label: Optional[str] = None


class Mod02BuildingCount(DDModuleBase):
    """Module 02 - Building Count."""

    building_count: Optional[int] = None
    cadastral_numbers: Optional[list[str]] = None
    reconciliation_notes: Optional[str] = None


class Mod03Lokalplan(DDModuleBase):
    """Module 03 - Lokalplan / Kommuneplan."""

    lokalplan_ref: Optional[str] = None
    kommuneplan_ref: Optional[str] = None
    permitted_bebyggelsesprocent: Optional[float] = None
    max_floors: Optional[int] = None
    use_determinations: Optional[list[str]] = None


class Mod04RegulatoryRisk(DDModuleBase):
    """Module 04 - Regulatory Risk."""

    use_compliance: Optional[str] = None
    v1_v2_status: Optional[str] = None
    listed_status: Optional[str] = None
    preservation_status: Optional[str] = None
    flood_risk: Optional[str] = None
    noise_zone: Optional[str] = None
    open_building_cases: Optional[list[str]] = None


class Mod05OccupationPermits(DDModuleBase):
    """Module 05 - Occupation Permits."""

    permit_status: Optional[str] = None
    permit_date: Optional[str] = None
    permit_notes: Optional[str] = None


class Mod14NearbyAreas(DDModuleBase):
    """Module 14 - Nearby Areas."""

    transit_score: Optional[float] = None
    retail_score: Optional[float] = None
    school_score: Optional[float] = None
    green_space_score: Optional[float] = None
    noise_level: Optional[str] = None
    flood_zone: Optional[str] = None
    nearest_metro_km: Optional[float] = None
    nearby_employers: Optional[list[str]] = None


# --- Layer 1 ---------------------------------------------------------------

class Mod11AssetCharacteristics(DDModuleBase):
    """Module 11 - Asset Characteristics."""

    tenure_type: Optional[str] = None
    use_mix_pct: Optional[dict] = None
    construction_era: Optional[str] = None
    lejelov_classification: Optional[str] = None
    strategic_category: Optional[str] = None  # core / value-add / opportunistic
    fund_eligibility: Optional[list[str]] = None


class Mod06Feasibility(DDModuleBase):
    """Module 06 - Feasibility Analysis."""

    build_rights_sqm: Optional[float] = None
    rooftop_conversion_feasible: Optional[bool] = None
    use_conversion_feasible: Optional[bool] = None
    gba_uplift_estimate_sqm: Optional[float] = None
    feasibility_notes: Optional[str] = None


class Mod08ERV(DDModuleBase):
    """Module 08 - ERV Estimation."""

    residential_erv_per_sqm: Optional[float] = None
    commercial_erv_per_sqm: Optional[float] = None
    storage_erv_per_sqm: Optional[float] = None
    parking_erv_per_unit: Optional[float] = None
    confidence_level: Optional[str] = None
    comparable_count: Optional[int] = None


class Mod13MarketResearch(DDModuleBase):
    """Module 13 - Market Research."""

    location_score: Optional[float] = None
    population_trend: Optional[str] = None
    employment_base: Optional[str] = None
    transaction_yield_range: Optional[str] = None
    demand_drivers: Optional[list[str]] = None


class Mod16RentType(DDModuleBase):
    """Module 16 - Rent Type & Lease Structure."""

    regulated_units: Optional[int] = None
    liberalised_units: Optional[int] = None
    avg_rent_regulated: Optional[float] = None
    avg_rent_liberalised: Optional[float] = None
    liberalisation_eligibility_pct: Optional[float] = None
    wale_years: Optional[float] = None


class Mod17DGNBESG(DDModuleBase):
    """Module 17 - DGNB & ESG."""

    dgnb_status: Optional[str] = None
    energy_label: Optional[str] = None
    green_loan_eligible: Optional[bool] = None
    gap_to_bronze: Optional[list[str]] = None
    capex_for_certification_dkk: Optional[float] = None
    epbd_risk: Optional[str] = None
    fjernvarme_connected: Optional[bool] = None


class Mod12SqmReconciliation(DDModuleBase):
    """Module 12 - Sqm Reconciliation."""

    bbr_gba_sqm: Optional[float] = None
    rent_roll_gba_sqm: Optional[float] = None
    variance_sqm: Optional[float] = None
    variance_pct: Optional[float] = None
    financial_impact_dkk: Optional[float] = None


# --- Layer 2 ---------------------------------------------------------------

class Mod07Reversionary(DDModuleBase):
    """Module 07 - Reversionary Potential."""

    passing_rent_total: Optional[float] = None
    erv_total: Optional[float] = None
    reversion_gap_pct: Optional[float] = None
    reversionary_yield: Optional[float] = None
    wale_years: Optional[float] = None
    capitalised_reversion_dkk: Optional[float] = None


class Mod09Revenue(DDModuleBase):
    """Module 09 - Revenue by Type."""

    residential_gpi: Optional[float] = None
    commercial_gpi: Optional[float] = None
    parking_gpi: Optional[float] = None
    storage_gpi: Optional[float] = None
    total_gpi: Optional[float] = None
    vacancy_deduction: Optional[float] = None
    egi: Optional[float] = None


class Mod15UpcomingSupply(DDModuleBase):
    """Module 15 - Upcoming Supply."""

    pipeline_projects: Optional[list[dict]] = None
    total_pipeline_sqm: Optional[float] = None
    supply_risk_level: Optional[str] = None  # low / medium / high
    erv_impact_pct: Optional[float] = None


# --- Layer 3 ---------------------------------------------------------------

class Mod10OPEX(DDModuleBase):
    """Module 10 - OPEX Estimation."""

    grundskyld: Optional[float] = None
    forsikring: Optional[float] = None
    ejendomsadministration: Optional[float] = None
    vedligeholdelse: Optional[float] = None
    faellesudgifter: Optional[float] = None
    renoveringsreserve: Optional[float] = None
    total_opex_low: Optional[float] = None
    total_opex_mid: Optional[float] = None
    total_opex_high: Optional[float] = None


class Mod18DCF(DDModuleBase):
    """Module 18 - NPV / DCF Analysis."""

    year_1_noi: Optional[float] = None
    terminal_value: Optional[float] = None
    npv: Optional[float] = None
    irr_pct: Optional[float] = None
    equity_multiple: Optional[float] = None
    cash_on_cash_pct: Optional[float] = None
    sensitivity_table: Optional[dict] = None


# --- Layer 4 ---------------------------------------------------------------

class Mod19WHT(DDModuleBase):
    """Module 19 - WHT & Transfer Pricing."""

    ownership_structure: Optional[str] = None
    cross_border_elements: Optional[list[str]] = None
    wht_rate_pct: Optional[float] = None
    eu_parent_subsidiary_applicable: Optional[bool] = None
    tp_risks: Optional[list[str]] = None
    tax_counsel_recommendation: Optional[str] = None


class Mod20ExecutiveSummary(DDModuleBase):
    """Module 20 - Executive Summary."""

    asset_description: Optional[str] = None
    price_per_sqm: Optional[float] = None
    erv_yield_pct: Optional[float] = None
    reversionary_yield_pct: Optional[float] = None
    npv_dkk: Optional[float] = None
    irr_pct: Optional[float] = None
    equity_multiple: Optional[float] = None
    upside_drivers: Optional[list[str]] = None
    risk_factors: Optional[list[str]] = None
    regulatory_status: Optional[str] = None
    recommendation: Optional[str] = None  # PROCEED / PROCEED_WITH_CONDITIONS / DO_NOT_PROCEED


# ═══════════════════════════════════════════════════════════════════════════
# Module configuration
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class ModuleConfig:
    """Runtime configuration for a single due-diligence module."""

    key: str
    number: int
    name: str
    system_prompt: str
    schema: type
    dependencies: list[str] = field(default_factory=list)
    required_document_types: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# System prompts
# ---------------------------------------------------------------------------

_PROMPT_01 = _prompt(
    "You are Module 01 - Building Overview. Your task is to extract and "
    "summarise the core physical characteristics of the subject property "
    "from BBR extracts, floor plans, and the energy certificate. Determine "
    "year of construction, construction type (concrete, brick, etc.), total "
    "number of floors including basement, gross building area (GBA) in sqm, "
    "net lettable area (NLA) in sqm, primary use category (residential, "
    "office, mixed), heating source (fjernvarme, gas, etc.), and current "
    "energy label. Flag any discrepancies between sources."
)

_PROMPT_02 = _prompt(
    "You are Module 02 - Building Count. Determine the exact number of "
    "separate buildings on the property from the cadastral map and BBR "
    "extract. List all cadastral (matrikel) numbers associated with the "
    "asset. Note any reconciliation issues between cadastral records and "
    "physical inspection data. This module forms the foundation for "
    "area-based calculations across all downstream modules."
)

_PROMPT_03 = _prompt(
    "You are Module 03 - Lokalplan / Kommuneplan. Analyse the applicable "
    "lokalplan and kommuneplan to extract zoning parameters for the subject "
    "property. Identify the lokalplan reference number, kommuneplan "
    "reference, permitted bebyggelsesprocent (plot ratio), maximum allowed "
    "floors, and all use determinations (permitted property uses). Assess "
    "whether current use complies with the plan and highlight any "
    "restrictions that could affect future development or conversion."
)

_PROMPT_04 = _prompt(
    "You are Module 04 - Regulatory Risk. Identify all regulatory risks "
    "that could materially affect the property. Assess current use "
    "compliance status, V1/V2 contamination classification, listed building "
    "(fredet) or preservation (bevaringsvaerdig) status, flood risk zone, "
    "noise zone designation, and any open building cases with the "
    "municipality. Each risk should be clearly categorised by severity and "
    "potential financial impact."
)

_PROMPT_05 = _prompt(
    "You are Module 05 - Occupation Permits. Verify that all required "
    "occupation permits (ibrugtagningstilladelse) and building permits "
    "(byggetilladelse) are in place for the subject property. Record the "
    "permit status, date of issue, and any conditions or caveats attached. "
    "Missing or conditional permits represent a material risk to the "
    "transaction and must be clearly flagged."
)

_PROMPT_14 = _prompt(
    "You are Module 14 - Nearby Areas. Evaluate the micro-location quality "
    "of the subject property by scoring access to public transit, retail "
    "amenities, schools, and green spaces. Record noise levels, flood zone "
    "classification, distance to nearest metro station in km, and a list of "
    "significant nearby employers. This location context is essential for "
    "estimating market rents and long-term demand in later modules."
)

_PROMPT_11 = _prompt(
    "You are Module 11 - Asset Characteristics. Classify the asset by "
    "tenure type (freehold / leasehold), use mix percentages (residential, "
    "commercial, storage, parking), construction era, and lejelov "
    "classification (small-property / large-property / paragraph-5). "
    "Determine the strategic category (core, value-add, or opportunistic) "
    "and list eligible fund strategies. This classification drives "
    "downstream rent regulation analysis and valuation approach."
)

_PROMPT_06 = _prompt(
    "You are Module 06 - Feasibility Analysis. Based on building overview, "
    "lokalplan parameters, and regulatory constraints, assess development "
    "upside. Calculate remaining build rights in sqm under current zoning. "
    "Evaluate whether rooftop conversion is physically and legally feasible, "
    "and whether a change-of-use conversion is possible. Estimate the GBA "
    "uplift potential and provide detailed feasibility notes including cost "
    "order-of-magnitude and timeline assumptions."
)

_PROMPT_08 = _prompt(
    "You are Module 08 - ERV Estimation. Estimate the Estimated Rental "
    "Value (ERV) for each use type at the property: residential per sqm per "
    "year, commercial per sqm per year, storage per sqm per year, and "
    "parking per unit per month. Base estimates on comparable transactions, "
    "market research, and the asset characteristics. State the confidence "
    "level (high / medium / low) and the number of comparables used. ERV "
    "forms the basis for reversionary analysis and DCF projections."
)

_PROMPT_13 = _prompt(
    "You are Module 13 - Market Research. Analyse the local real estate "
    "market surrounding the subject property. Provide a location quality "
    "score, population trend assessment, employment base strength, and "
    "observed transaction yield range for comparable assets. List the "
    "primary demand drivers (e.g., university proximity, infrastructure "
    "projects, corporate relocations). This module feeds the supply analysis "
    "and supports ERV assumptions."
)

_PROMPT_16 = _prompt(
    "You are Module 16 - Rent Type & Lease Structure. Categorise every unit "
    "by rent regulation status under Lejeloven: regulated (omkostningsbestemt) "
    "vs. liberalised (markedsleje). Calculate average rents for each "
    "category, the percentage of units eligible for liberalisation upon "
    "vacancy, and the weighted average lease expiry (WALE) in years. This "
    "analysis is critical for reversionary income projections and accurate "
    "valuation."
)

_PROMPT_17 = _prompt(
    "You are Module 17 - DGNB & ESG. Assess the property against DGNB "
    "certification criteria and broader ESG requirements. Record current "
    "DGNB status, energy label, green-loan eligibility, gap items to "
    "achieve Bronze certification, estimated capex for certification, EPBD "
    "compliance risk, and whether the property is connected to fjernvarme "
    "(district heating). ESG factors increasingly affect financing terms "
    "and exit pricing in Danish CRE."
)

_PROMPT_12 = _prompt(
    "You are Module 12 - Sqm Reconciliation. Reconcile the gross building "
    "area reported in BBR with the area implied by the rent roll. Calculate "
    "the absolute variance in sqm and as a percentage. Estimate the "
    "financial impact of any area discrepancy in DKK based on current "
    "passing rent. Area mismatches above 3% should be flagged as a material "
    "risk requiring surveyor verification."
)

_PROMPT_07 = _prompt(
    "You are Module 07 - Reversionary Potential. Compare the current "
    "passing rent to the ERV to quantify the reversion gap. Calculate "
    "passing rent total, ERV total, reversion gap percentage, reversionary "
    "yield, WALE in years, and the capitalised value of the reversion. "
    "This module captures the upside from under-rented units reverting to "
    "market rent upon lease expiry or tenant turnover."
)

_PROMPT_09 = _prompt(
    "You are Module 09 - Revenue by Type. Build a detailed gross potential "
    "income (GPI) schedule broken down by use type: residential, "
    "commercial, parking, and storage. Apply appropriate vacancy and "
    "collection-loss deductions to arrive at Effective Gross Income (EGI). "
    "Ensure consistency with the ERV estimates and lease structure analysis "
    "from upstream modules."
)

_PROMPT_15 = _prompt(
    "You are Module 15 - Upcoming Supply. Identify all pipeline "
    "development projects within the competitive set of the subject "
    "property. List each project with expected completion date, size in "
    "sqm, and use type. Quantify total pipeline sqm, assign an overall "
    "supply risk level (low / medium / high), and estimate the potential "
    "impact on achievable ERVs as a percentage change."
)

_PROMPT_10 = _prompt(
    "You are Module 10 - OPEX Estimation. Build an operating expenditure "
    "budget covering grundskyld (land tax), forsikring (insurance), "
    "ejendomsadministration (property management), vedligeholdelse "
    "(maintenance), faellesudgifter (common expenses), and "
    "renoveringsreserve (capex reserve). Provide low, mid, and high "
    "scenarios for total OPEX. Use Danish benchmarks and actual invoices "
    "where available."
)

_PROMPT_18 = _prompt(
    "You are Module 18 - NPV / DCF Analysis. Construct a discounted cash "
    "flow model using the revenue, OPEX, and reversionary inputs from "
    "upstream modules. Calculate Year 1 NOI, terminal value, net present "
    "value (NPV), internal rate of return (IRR), equity multiple, and "
    "cash-on-cash return. Provide a sensitivity table varying discount rate "
    "and exit yield. Use a 10-year hold period unless otherwise instructed."
)

_PROMPT_19 = _prompt(
    "You are Module 19 - WHT & Transfer Pricing. Analyse the ownership "
    "structure for withholding-tax exposure and transfer-pricing risks. "
    "Identify all cross-border elements, applicable WHT rate, whether the "
    "EU Parent-Subsidiary Directive applies, and any transfer-pricing risks "
    "in management fees or intra-group financing. Provide a clear "
    "recommendation on whether external tax counsel is needed."
)

_PROMPT_20 = _prompt(
    "You are Module 20 - Executive Summary. Synthesise the outputs of all "
    "19 preceding modules into a concise investment recommendation. Present "
    "the asset description, price per sqm, ERV yield, reversionary yield, "
    "NPV, IRR, equity multiple, upside drivers, risk factors, and "
    "regulatory status. Conclude with a clear recommendation: PROCEED, "
    "PROCEED_WITH_CONDITIONS, or DO_NOT_PROCEED, with supporting rationale. "
    "This is the single deliverable presented to the investment committee."
)


# ═══════════════════════════════════════════════════════════════════════════
# MODULE_CONFIGS - topological execution order
# ═══════════════════════════════════════════════════════════════════════════

MODULE_CONFIGS: list[ModuleConfig] = [
    # --- Layer 0 (no dependencies) -----------------------------------------
    ModuleConfig(
        key="mod_01_building_overview",
        number=1,
        name="Building Overview",
        system_prompt=_PROMPT_01,
        schema=Mod01BuildingOverview,
        dependencies=[],
        required_document_types=["bbr_extract", "floor_plans", "energy_certificate"],
    ),
    ModuleConfig(
        key="mod_02_building_count",
        number=2,
        name="Building Count",
        system_prompt=_PROMPT_02,
        schema=Mod02BuildingCount,
        dependencies=[],
        required_document_types=["cadastral_map", "bbr_extract"],
    ),
    ModuleConfig(
        key="mod_03_lokalplan",
        number=3,
        name="Lokalplan / Kommuneplan",
        system_prompt=_PROMPT_03,
        schema=Mod03Lokalplan,
        dependencies=[],
        required_document_types=["lokalplan", "kommuneplan"],
    ),
    ModuleConfig(
        key="mod_04_regulatory_risk",
        number=4,
        name="Regulatory Risk",
        system_prompt=_PROMPT_04,
        schema=Mod04RegulatoryRisk,
        dependencies=[],
        required_document_types=["environmental_report"],
    ),
    ModuleConfig(
        key="mod_05_occupation_permits",
        number=5,
        name="Occupation Permits",
        system_prompt=_PROMPT_05,
        schema=Mod05OccupationPermits,
        dependencies=[],
        required_document_types=["occupation_permit", "building_permit"],
    ),
    ModuleConfig(
        key="mod_14_nearby_areas",
        number=14,
        name="Nearby Areas",
        system_prompt=_PROMPT_14,
        schema=Mod14NearbyAreas,
        dependencies=[],
        required_document_types=["market_report"],
    ),

    # --- Layer 1 (depend on layer 0) ---------------------------------------
    ModuleConfig(
        key="mod_11_asset_characteristics",
        number=11,
        name="Asset Characteristics",
        system_prompt=_PROMPT_11,
        schema=Mod11AssetCharacteristics,
        dependencies=[
            "mod_01_building_overview",
            "mod_03_lokalplan",
            "mod_04_regulatory_risk",
        ],
        required_document_types=["bbr_extract", "lease_agreements"],
    ),
    ModuleConfig(
        key="mod_06_feasibility",
        number=6,
        name="Feasibility Analysis",
        system_prompt=_PROMPT_06,
        schema=Mod06Feasibility,
        dependencies=[
            "mod_01_building_overview",
            "mod_03_lokalplan",
            "mod_04_regulatory_risk",
        ],
        required_document_types=["floor_plans", "lokalplan"],
    ),
    ModuleConfig(
        key="mod_08_erv",
        number=8,
        name="ERV Estimation",
        system_prompt=_PROMPT_08,
        schema=Mod08ERV,
        dependencies=[
            "mod_01_building_overview",
            "mod_11_asset_characteristics",
            "mod_13_market_research",
        ],
        required_document_types=["rent_roll", "market_report"],
    ),
    ModuleConfig(
        key="mod_13_market_research",
        number=13,
        name="Market Research",
        system_prompt=_PROMPT_13,
        schema=Mod13MarketResearch,
        dependencies=[
            "mod_01_building_overview",
            "mod_14_nearby_areas",
        ],
        required_document_types=["market_report"],
    ),
    ModuleConfig(
        key="mod_16_rent_type",
        number=16,
        name="Rent Type & Lease Structure",
        system_prompt=_PROMPT_16,
        schema=Mod16RentType,
        dependencies=[
            "mod_01_building_overview",
            "mod_11_asset_characteristics",
        ],
        required_document_types=["rent_roll", "lease_agreements"],
    ),
    ModuleConfig(
        key="mod_17_dgnb_esg",
        number=17,
        name="DGNB & ESG",
        system_prompt=_PROMPT_17,
        schema=Mod17DGNBESG,
        dependencies=[
            "mod_01_building_overview",
            "mod_11_asset_characteristics",
        ],
        required_document_types=["energy_certificate", "dgnb_certificate"],
    ),
    ModuleConfig(
        key="mod_12_sqm_reconciliation",
        number=12,
        name="Sqm Reconciliation",
        system_prompt=_PROMPT_12,
        schema=Mod12SqmReconciliation,
        dependencies=[
            "mod_01_building_overview",
            "mod_02_building_count",
            "mod_11_asset_characteristics",
        ],
        required_document_types=["bbr_extract", "rent_roll"],
    ),

    # --- Layer 2 ------------------------------------------------------------
    ModuleConfig(
        key="mod_07_reversionary",
        number=7,
        name="Reversionary Potential",
        system_prompt=_PROMPT_07,
        schema=Mod07Reversionary,
        dependencies=[
            "mod_06_feasibility",
            "mod_08_erv",
        ],
        required_document_types=["rent_roll", "valuation_report"],
    ),
    ModuleConfig(
        key="mod_09_revenue",
        number=9,
        name="Revenue by Type",
        system_prompt=_PROMPT_09,
        schema=Mod09Revenue,
        dependencies=[
            "mod_08_erv",
            "mod_16_rent_type",
        ],
        required_document_types=["rent_roll"],
    ),
    ModuleConfig(
        key="mod_15_upcoming_supply",
        number=15,
        name="Upcoming Supply",
        system_prompt=_PROMPT_15,
        schema=Mod15UpcomingSupply,
        dependencies=[
            "mod_13_market_research",
            "mod_14_nearby_areas",
        ],
        required_document_types=["market_report"],
    ),

    # --- Layer 3 ------------------------------------------------------------
    ModuleConfig(
        key="mod_10_opex",
        number=10,
        name="OPEX Estimation",
        system_prompt=_PROMPT_10,
        schema=Mod10OPEX,
        dependencies=[
            "mod_01_building_overview",
            "mod_11_asset_characteristics",
        ],
        required_document_types=[
            "financial_model",
            "tax_assessment",
            "insurance_policy",
        ],
    ),
    ModuleConfig(
        key="mod_18_dcf",
        number=18,
        name="NPV / DCF Analysis",
        system_prompt=_PROMPT_18,
        schema=Mod18DCF,
        dependencies=[
            "mod_07_reversionary",
            "mod_08_erv",
            "mod_09_revenue",
            "mod_10_opex",
        ],
        required_document_types=["financial_model", "valuation_report"],
    ),

    # --- Layer 4 ------------------------------------------------------------
    ModuleConfig(
        key="mod_19_wht",
        number=19,
        name="WHT & Transfer Pricing",
        system_prompt=_PROMPT_19,
        schema=Mod19WHT,
        dependencies=["mod_18_dcf"],
        required_document_types=["ownership_structure", "tax_assessment"],
    ),
    ModuleConfig(
        key="mod_20_executive_summary",
        number=20,
        name="Executive Summary",
        system_prompt=_PROMPT_20,
        schema=Mod20ExecutiveSummary,
        dependencies=[
            "mod_01_building_overview",
            "mod_02_building_count",
            "mod_03_lokalplan",
            "mod_04_regulatory_risk",
            "mod_05_occupation_permits",
            "mod_06_feasibility",
            "mod_07_reversionary",
            "mod_08_erv",
            "mod_09_revenue",
            "mod_10_opex",
            "mod_11_asset_characteristics",
            "mod_12_sqm_reconciliation",
            "mod_13_market_research",
            "mod_14_nearby_areas",
            "mod_15_upcoming_supply",
            "mod_16_rent_type",
            "mod_17_dgnb_esg",
            "mod_18_dcf",
            "mod_19_wht",
        ],
        required_document_types=[],
    ),
]


# ═══════════════════════════════════════════════════════════════════════════
# CONTEXT_DEPENDENCIES - quick lookup: module_key -> [dependency keys]
# ═══════════════════════════════════════════════════════════════════════════

CONTEXT_DEPENDENCIES: dict[str, list[str]] = {
    cfg.key: cfg.dependencies for cfg in MODULE_CONFIGS
}
