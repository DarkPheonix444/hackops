import re
from datetime import datetime
from difflib import SequenceMatcher

from borrower.models import BorrowerVerification


def normalize_name(name):
    if not name:
        return ""
    value = re.sub(r"[^A-Za-z\s]", "", str(name).upper())
    value = re.sub(r"^(MR|MRS|MS|DR|SHREE|SHRI)\s+", "", value.strip())
    return re.sub(r"\s+", " ", value).strip()


def name_similarity(first_name, second_name):
    first = normalize_name(first_name)
    second = normalize_name(second_name)
    if not first or not second:
        return None
    if first == second:
        return 1.0
    if set(first.split()) == set(second.split()):
        return 0.95
    if set(first.split()).issubset(set(second.split())) or set(second.split()).issubset(set(first.split())):
        return 0.85
    return SequenceMatcher(None, first, second).ratio()


def compare_identity_names(borrower_name, pan_name, aadhaar_name):
    names = {
        "borrower": borrower_name,
        "pan": pan_name,
        "aadhaar": aadhaar_name,
    }
    available = {key: value for key, value in names.items() if normalize_name(value)}
    comparisons = {}
    for left_key, left_name in available.items():
        for right_key, right_name in available.items():
            if left_key >= right_key:
                continue
            score = name_similarity(left_name, right_name)
            comparisons[f"{left_key}_vs_{right_key}"] = {
                "match": score >= 0.90,
                "similarity": round(score, 4),
            }

    if len(available) < 2:
        result = "NOT_AVAILABLE"
        flag = None
    elif all(item["match"] for item in comparisons.values()):
        result = "MATCH"
        flag = None
    elif all(item["similarity"] >= 0.70 for item in comparisons.values()):
        result = "PARTIAL_MATCH"
        flag = {
            "type": "OCR_NAME_MINOR_MISMATCH",
            "severity": "MEDIUM",
            "message": "Names from OCR differ slightly across the borrower profile, PAN, and Aadhaar.",
        }
    else:
        result = "MISMATCH"
        flag = {
            "type": "OCR_NAME_MAJOR_MISMATCH",
            "severity": "HIGH",
            "message": "Names from OCR do not match across the borrower profile, PAN, and Aadhaar.",
        }

    return {
        "status": result,
        "names": names,
        "comparisons": comparisons,
        "flag": flag,
    }


def apply_identity_name_check(borrower, processing_records):
    extracted_names = {}
    extracted_dobs = {}
    for processing in processing_records:
        document_type = processing.document.document_type
        fields = processing.extracted_data.get("fields", {})
        if document_type == "PAN":
            extracted_names["pan"] = fields.get("name")
            extracted_dobs["pan"] = fields.get("date_of_birth")
        elif document_type == "AADHAAR":
            extracted_names["aadhaar"] = fields.get("name")
            extracted_dobs["aadhaar"] = fields.get("date_of_birth")

    result = compare_identity_names(
        borrower.name,
        extracted_names.get("pan"),
        extracted_names.get("aadhaar"),
    )
    dob_result = compare_identity_dobs(
        borrower.date_of_birth,
        extracted_dobs.get("pan"),
        extracted_dobs.get("aadhaar"),
    )

    for processing in processing_records:
        data = dict(processing.extracted_data or {})
        data["identity_name_check"] = result
        data["identity_dob_check"] = dob_result
        processing.extracted_data = data
        processing.save(update_fields=["extracted_data", "updated_at"])

    flags = [result["flag"]] if result["flag"] else []
    if dob_result["flag"]:
        flags.append(dob_result["flag"])

    if flags:
        verification = borrower.verifications.first()
        if verification is None:
            verification = BorrowerVerification.objects.create(
                borrower=borrower,
                verification_status=BorrowerVerification.VerificationStatus.NEEDS_REVIEW,
                identity_match=(
                    BorrowerVerification.IdentityMatchStatus.MISMATCH
                    if dob_result["status"] == "MISMATCH"
                    else result["status"]
                ),
                consistency_status=(
                    BorrowerVerification.ConsistencyStatus.MAJOR_MISMATCH
                    if result["status"] == "MISMATCH" or dob_result["status"] == "MISMATCH"
                    else BorrowerVerification.ConsistencyStatus.MINOR_MISMATCH
                ),
                flags=flags,
                explanation=[flag["message"] for flag in flags],
                details={
                    "identity_name_check": result,
                    "identity_dob_check": dob_result,
                },
            )
        else:
            flags = [
                flag for flag in verification.flags
                if not flag.get("type", "").startswith(("OCR_NAME_", "OCR_DOB_"))
            ] + flags
            verification.verification_status = BorrowerVerification.VerificationStatus.NEEDS_REVIEW
            verification.identity_match = (
                BorrowerVerification.IdentityMatchStatus.MISMATCH
                if dob_result["status"] == "MISMATCH"
                else result["status"]
            )
            verification.consistency_status = (
                BorrowerVerification.ConsistencyStatus.MAJOR_MISMATCH
                if result["status"] == "MISMATCH" or dob_result["status"] == "MISMATCH"
                else BorrowerVerification.ConsistencyStatus.MINOR_MISMATCH
            )
            verification.flags = flags
            verification.explanation = [flag["message"] for flag in flags]
            verification.details = {
                **(verification.details or {}),
                "identity_name_check": result,
                "identity_dob_check": dob_result,
            }
            verification.save(
                update_fields=[
                    "verification_status",
                    "identity_match",
                    "consistency_status",
                    "flags",
                    "explanation",
                    "details",
                    "updated_at",
                ]
            )

    return result


def _normalise_dob(value):
    if not value:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()

    value = str(value).strip()
    for date_format in ("%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, date_format).date().isoformat()
        except ValueError:
            continue
    return None


def compare_identity_dobs(borrower_dob, pan_dob, aadhaar_dob):
    dobs = {
        "borrower": _normalise_dob(borrower_dob),
        "pan": _normalise_dob(pan_dob),
        "aadhaar": _normalise_dob(aadhaar_dob),
    }
    available = {key: value for key, value in dobs.items() if value}
    comparisons = {}
    for left_key, left_dob in available.items():
        for right_key, right_dob in available.items():
            if left_key >= right_key:
                continue
            comparisons[f"{left_key}_vs_{right_key}"] = {
                "match": left_dob == right_dob,
            }

    if len(available) < 2:
        status = "NOT_AVAILABLE"
        flag = None
    elif all(item["match"] for item in comparisons.values()):
        status = "MATCH"
        flag = None
    else:
        status = "MISMATCH"
        flag = {
            "type": "OCR_DOB_MISMATCH",
            "severity": "HIGH",
            "message": "Dates of birth differ across the borrower profile, PAN, and Aadhaar.",
        }

    return {
        "status": status,
        "dates_of_birth": dobs,
        "comparisons": comparisons,
        "flag": flag,
    }
