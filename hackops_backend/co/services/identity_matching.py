import re
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
    for processing in processing_records:
        document_type = processing.document.document_type
        fields = processing.extracted_data.get("fields", {})
        if document_type == "PAN":
            extracted_names["pan"] = fields.get("name")
        elif document_type == "AADHAAR":
            extracted_names["aadhaar"] = fields.get("name")

    result = compare_identity_names(
        borrower.name,
        extracted_names.get("pan"),
        extracted_names.get("aadhaar"),
    )

    for processing in processing_records:
        data = dict(processing.extracted_data or {})
        data["identity_name_check"] = result
        processing.extracted_data = data
        processing.save(update_fields=["extracted_data", "updated_at"])

    if result["flag"]:
        verification = borrower.verifications.first()
        if verification is None:
            verification = BorrowerVerification.objects.create(
                borrower=borrower,
                verification_status=BorrowerVerification.VerificationStatus.NEEDS_REVIEW,
                identity_match=result["status"],
                consistency_status=(
                    BorrowerVerification.ConsistencyStatus.MAJOR_MISMATCH
                    if result["status"] == "MISMATCH"
                    else BorrowerVerification.ConsistencyStatus.MINOR_MISMATCH
                ),
                flags=[result["flag"]],
                explanation=[result["flag"]["message"]],
                details={"identity_name_check": result},
            )
        else:
            flags = [flag for flag in verification.flags if not flag.get("type", "").startswith("OCR_NAME_")]
            flags.append(result["flag"])
            verification.verification_status = BorrowerVerification.VerificationStatus.NEEDS_REVIEW
            verification.identity_match = result["status"]
            verification.consistency_status = (
                BorrowerVerification.ConsistencyStatus.MAJOR_MISMATCH
                if result["status"] == "MISMATCH"
                else BorrowerVerification.ConsistencyStatus.MINOR_MISMATCH
            )
            verification.flags = flags
            verification.details = {
                **(verification.details or {}),
                "identity_name_check": result,
            }
            verification.save(
                update_fields=[
                    "verification_status",
                    "identity_match",
                    "consistency_status",
                    "flags",
                    "details",
                    "updated_at",
                ]
            )

    return result
