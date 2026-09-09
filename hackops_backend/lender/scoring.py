"""
Layer 3 Financial Capacity Scoring and Automated Decisioning.

Evaluates borrower financial capacity based on:
1. Debt-to-Income (DTI) Ratio (Max 40 pts)
2. Debt Service Coverage Ratio (DSCR) (Max 30 pts)
3. Credit / CIBIL Score (Max 20 pts)
4. Employment Stability (Max 10 pts)
"""
from typing import Any, Dict, Tuple


def _safe_float(val: Any, default: float = 0.0) -> float:
    """Convert value safely to float, returning default if null or invalid."""
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _get_field(obj: Any, field_name: str, default: Any = None) -> Any:
    """Safely get field from model instance or dict."""
    if isinstance(obj, dict):
        return obj.get(field_name, default)
    return getattr(obj, field_name, default)


def calculate_layer3_financial_score(borrower: Any) -> Tuple[int, str, Dict[str, Any]]:
    """
    Computes a score out of 100 based on Layer 3 Financial Capacity rules:
    - Debt-to-Income (DTI) Ratio (Max 40 pts)
    - Debt Service Coverage Ratio (DSCR) (Max 30 pts)
    - Credit / CIBIL Score (Max 20 pts)
    - Employment Stability (Max 10 pts)

    Returns:
        tuple: (total_score: int, risk_level: str, breakdown_dict: dict)
    """
    # Edge Case Safety: Convert fields to float safely, default to 0.0 if null
    monthly_income = _safe_float(_get_field(borrower, "monthly_income", 0.0))
    existing_monthly_obligations = _safe_float(_get_field(borrower, "existing_monthly_obligations", 0.0))
    amount_requested = _safe_float(_get_field(borrower, "amount_requested", 0.0))

    # requested_tenure_months defaults to 12 if null or 0
    raw_tenure = _get_field(borrower, "requested_tenure_months", None)
    if raw_tenure is None:
        requested_tenure_months = 12
    else:
        try:
            tenure_int = int(raw_tenure)
            requested_tenure_months = tenure_int if tenure_int > 0 else 12
        except (ValueError, TypeError):
            requested_tenure_months = 12

    # Credit / CIBIL retrieval for breakdown
    raw_cibil = _get_field(borrower, "cibil_score", None)
    raw_credit = _get_field(borrower, "credit_score", None)

    score_val = None
    score_source = None
    if raw_cibil is not None:
        try:
            score_val = int(raw_cibil)
            score_source = "cibil_score"
        except (ValueError, TypeError):
            score_val = None

    if score_val is None and raw_credit is not None:
        try:
            score_val = int(raw_credit)
            score_source = "credit_score"
        except (ValueError, TypeError):
            score_val = None

    raw_employment = _get_field(borrower, "employment_type", None)
    employment_type_str = str(raw_employment).strip().upper() if raw_employment else None

    # Edge Case: If monthly_income <= 0, return score = 0, risk_level = "HIGH",
    # and a breakdown explaining zero/unverified income.
    if monthly_income <= 0:
        breakdown = {
            "error": "Zero or unverified monthly income.",
            "explanation": "Borrower has zero or unverified monthly income, failing minimum financial threshold.",
            "monthly_income": monthly_income,
            "existing_monthly_obligations": existing_monthly_obligations,
            "amount_requested": amount_requested,
            "requested_tenure_months": requested_tenure_months,
            "dti": 0.0,
            "dti_ratio": 0.0,
            "dti_points": 0,
            "max_dti_points": 40,
            "estimated_emi": round(amount_requested / requested_tenure_months, 2) if requested_tenure_months else 0.0,
            "disposable_income": 0.0,
            "dscr": 0.0,
            "dscr_points": 0,
            "max_dscr_points": 30,
            "credit_score": score_val,
            "credit_score_source": score_source,
            "credit_points": 0,
            "max_credit_points": 20,
            "employment_type": employment_type_str,
            "employment_points": 0,
            "max_employment_points": 10,
            "total_score": 0,
            "risk_level": "HIGH",
        }
        return 0, "HIGH", breakdown

    # 1. Debt-to-Income (DTI) Ratio (Max 40 pts)
    # Formula: DTI = (existing_monthly_obligations / monthly_income) * 100
    dti = (existing_monthly_obligations / monthly_income) * 100.0

    if dti <= 20.0:
        dti_points = 40
    elif dti <= 40.0:
        dti_points = 25
    elif dti <= 60.0:
        dti_points = 10
    else:
        dti_points = 0

    # 2. Debt Service Coverage Ratio (DSCR) (Max 30 pts)
    # Formula: Estimated EMI = amount_requested / requested_tenure_months
    # Formula: Disposable Income = monthly_income - existing_monthly_obligations
    # Formula: DSCR = Disposable Income / Estimated EMI (handle division by zero if EMI is 0)
    estimated_emi = amount_requested / float(requested_tenure_months)
    disposable_income = monthly_income - existing_monthly_obligations

    if estimated_emi <= 0:
        # If no EMI is due, full disposable income covers any potential obligation
        dscr = 999.0 if disposable_income > 0 else 0.0
    else:
        dscr = disposable_income / estimated_emi

    if dscr >= 2.5:
        dscr_points = 30
    elif dscr >= 1.5:
        dscr_points = 20
    elif dscr >= 1.0:
        dscr_points = 10
    else:
        dscr_points = 0

    # 3. Credit / CIBIL Score (Max 20 pts)
    # Check cibil_score first; if null, fall back to credit_score.
    if score_val is not None and score_val >= 750:
        cibil_points = 20
    elif score_val is not None and score_val >= 650:
        cibil_points = 12
    else:
        cibil_points = 0

    # 4. Employment Stability (Max 10 pts)
    # SALARIED or BUSINESS -> 10 pts
    # SELF_EMPLOYED -> 6 pts
    # STUDENT, RETIRED, OTHER or Null -> 0 pts
    if employment_type_str in ("SALARIED", "BUSINESS"):
        employment_points = 10
    elif employment_type_str == "SELF_EMPLOYED":
        employment_points = 6
    else:
        employment_points = 0

    # Risk Categorization:
    # Total Score = DTI Pts + DSCR Pts + CIBIL Pts + Employment Pts
    total_score = dti_points + dscr_points + cibil_points + employment_points

    if total_score >= 75:
        risk_level = "LOW"
    elif total_score >= 50:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    breakdown = {
        "monthly_income": monthly_income,
        "existing_monthly_obligations": existing_monthly_obligations,
        "amount_requested": amount_requested,
        "requested_tenure_months": requested_tenure_months,
        "dti": round(dti, 2),
        "dti_ratio": round(dti, 2),
        "dti_points": dti_points,
        "max_dti_points": 40,
        "estimated_emi": round(estimated_emi, 2),
        "disposable_income": round(disposable_income, 2),
        "dscr": round(dscr, 2),
        "dscr_points": dscr_points,
        "max_dscr_points": 30,
        "credit_score": score_val,
        "credit_score_source": score_source,
        "credit_points": cibil_points,
        "max_credit_points": 20,
        "employment_type": employment_type_str,
        "employment_points": employment_points,
        "max_employment_points": 10,
        "total_score": total_score,
        "risk_level": risk_level,
    }

    return total_score, risk_level, breakdown
