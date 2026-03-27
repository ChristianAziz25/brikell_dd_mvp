from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    address: str | None = None
    acquisition_price: float | None = None
    hold_period_years: int | None = None
    return_target_pct: float | None = None
    gba_sqm: float | None = None
    unit_count: int | None = None
    build_year: int | None = None
    energy_label: str | None = None
    heating_source: str | None = None
    lokalplan_ref: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    acquisition_price: float | None = None
    hold_period_years: int | None = None
    return_target_pct: float | None = None
    gba_sqm: float | None = None
    unit_count: int | None = None
    build_year: int | None = None
    energy_label: str | None = None
    heating_source: str | None = None
    lokalplan_ref: str | None = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    address: str | None = None
    acquisition_price: float | None = None
    hold_period_years: int | None = None
    return_target_pct: float | None = None
    gba_sqm: float | None = None
    unit_count: int | None = None
    build_year: int | None = None
    energy_label: str | None = None
    heating_source: str | None = None
    lokalplan_ref: str | None = None
    status: str
    created_at: str
    updated_at: str
