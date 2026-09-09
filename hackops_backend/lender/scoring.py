"""
Layer 2 (OCR Trust Engine), Layer 3 (Financial Capacity Scoring),
and Layer 4 (Personalized Decision Engine).
"""
from typing import Any, Dict, List, Optional, Tuple


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


def calculate_layer2_trust_score(borrower: Any) -> Tuple[int, Dict[str, Any]]:
    """
    Layer 2: OCR Trust Engine.
    Evaluates document verification trust based on:
    1. Name Match (+30 pts): Check if borrower.name.lower() is in any
       document's extracted_name.lower() or verification notes.
    2. ID Match (+25 pts): Check if borrower.pan_number matches any
       document's extracted_document_number.
    3. Income Match (+25 pts): Check if any document's extracted_income is >= borrower.monthly_income * 0.9.
    4. Document Presence (+20 pts): Grant points if at least 2 documents
       (PAN, AADHAAR, or BANK_STATEMENT) exist with verification_status == 'VERIFIED'.

    Returns:
        tuple: (trust_score: int, trust_breakdown_dict: dict)
    """
    # Fetch all related BorrowerDocument records
    docs: List[Any] = []
    if hasattr(borrower, "documents"):
        try:
            docs = list(borrower.documents.all())
        except Exception:
            docs = []
    elif isinstance(borrower, dict) and "documents" in borrower:
        docs = borrower.get("documents", []) or []
    else:
        borrower_id = _get_field(borrower, "id") or _get_field(borrower, "pk")
        if borrower_id:
            try:
                from borrower.models import BorrowerDocument
                docs = list(BorrowerDocument.objects.filter(borrower_id=borrower_id))
            except Exception:
                docs = []

    borrower_name = str(_get_field(borrower, "name", "") or "").strip().lower()
    borrower_pan = str(_get_field(borrower, "pan_number", "") or "").strip().upper()
    monthly_income = _safe_float(_get_field(borrower, "monthly_income", 0.0))

    # 1. Name Match (+30 pts)
    name_match = False
    if borrower_name:
        for doc in docs:
            extracted_name = str(_get_field(doc, "extracted_name", "") or "").strip().lower()
            verification_notes = str(_get_field(doc, "verification_notes", "") or "").strip().lower()
            if (extracted_name and borrower_name in extracted_name) or (verification_notes and borrower_name in verification_notes):
                name_match = True
                break
    name_points = 30 if name_match else 0

    # 2. ID Match (+25 pts)
    id_match = False
    if borrower_pan:
        for doc in docs:
            extracted_doc_num = str(_get_field(doc, "extracted_document_number", "") or "").strip().upper()
            if extracted_doc_num and extracted_doc_num == borrower_pan:
                id_match = True
                break
    id_points = 25 if id_match else 0

    # 3. Income Match (+25 pts)
    income_match = False
    if monthly_income > 0:
        income_threshold = monthly_income * 0.9
        for doc in docs:
            raw_doc_inc = _get_field(doc, "extracted_income", None)
            if raw_doc_inc is not None:
                doc_inc = _safe_float(raw_doc_inc, -1.0)
                if doc_inc >= income_threshold:
                    income_match = True
                    break
    income_points = 25 if income_match else 0

    # 4. Document Presence (+20 pts)
    verified_valid_docs = []
    for doc in docs:
        doc_type = str(_get_field(doc, "document_type", "") or "").strip().upper()
        v_status = str(_get_field(doc, "verification_status", "") or "").strip().upper()
        if doc_type in {"PAN", "AADHAAR", "BANK_STATEMENT"} and v_status == "VERIFIED":
            verified_valid_docs.append(doc)

    doc_presence_match = len(verified_valid_docs) >= 2
    doc_presence_points = 20 if doc_presence_match else 0

    trust_score = name_points + id_points + income_points + doc_presence_points

    trust_breakdown_dict = {
        "name_match": name_match,
        "name_points": name_points,
        "max_name_points": 30,
        "id_match": id_match,
        "id_points": id_points,
        "max_id_points": 25,
        "income_match": income_match,
        "income_points": income_points,
        "max_income_points": 25,
        "doc_presence_match": doc_presence_match,
        "doc_presence_count": len(verified_valid_docs),
        "doc_presence_points": doc_presence_points,
        "max_doc_presence_points": 20,
        "documents_analyzed": len(docs),
        "trust_score": trust_score,
        "max_trust_score": 100,
    }

    return trust_score, trust_breakdown_dict


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


def calculate_layer4_decision(
    trust_score: float,
    financial_score: float,
    amount_requested: float = 0.0,
) -> Tuple[float, str, Dict[str, Any]]:
    """
    Layer 4: Personalized Decision Engine.
    Computes:
    Composite Score = (Trust Score * 0.3) + (Financial Score * 0.7)

    Personalized recommendations (ai_recommended_terms JSON):
    - If Composite >= 80: Status = 'APPROVED', Approved Amount = 100%, Rate = 10.5%
    - If 60 <= Composite < 80: Status = 'READY_FOR_LENDER', Approved Amount = 80%, Rate = 13.0%
    - If 40 <= Composite < 60: Status = 'READY_FOR_LENDER', Approved Amount = 50%, Rate = 15.5%
    - If Composite < 40: Status = 'REJECTED', Approved Amount = 0, Rate = N/A

    Returns:
        tuple: (composite_score: float, status: str, ai_recommended_terms: dict)
    """
    t_score = _safe_float(trust_score, 0.0)
    f_score = _safe_float(financial_score, 0.0)
    req_amount = _safe_float(amount_requested, 0.0)

    composite_score = round((t_score * 0.3) + (f_score * 0.7), 2)

    if composite_score >= 80.0:
        decision_status = "APPROVED"
        approved_pct = 100
        approved_amount = round(req_amount * 1.0, 2)
        rate = "10.5%"
    elif composite_score >= 60.0:
        decision_status = "READY_FOR_LENDER"
        approved_pct = 80
        approved_amount = round(req_amount * 0.8, 2)
        rate = "13.0%"
    elif composite_score >= 40.0:
        decision_status = "READY_FOR_LENDER"
        approved_pct = 50
        approved_amount = round(req_amount * 0.5, 2)
        rate = "15.5%"
    else:
        decision_status = "REJECTED"
        approved_pct = 0
        approved_amount = 0.0
        rate = "N/A"

    ai_recommended_terms = {
        "status": decision_status,
        "composite_score": composite_score,
        "trust_score": t_score,
        "financial_score": f_score,
        "approved_amount": approved_amount,
        "approved_percentage": approved_pct,
        "approved_amount_percentage": f"{approved_pct}%",
        "interest_rate": rate,
        "rate": rate,
    }

    return composite_score, decision_status, ai_recommended_terms


calculate_layer4_composite_decision = calculate_layer4_decision
