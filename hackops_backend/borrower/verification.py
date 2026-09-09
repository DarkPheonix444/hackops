import re
import difflib
from datetime import datetime
from .models import Borrower, BorrowerDocument, BorrowerVerification
from .providers import MockVerificationProvider, DigiLockerProvider


class TrustLensVerificationEngine:
    """
    Deterministic, explainable verification engine for informal lending.
    Validates identity, document completeness, and data consistency.
    Clearly distinct from Trust Score or Risk Scoring.
    """

    REQUIRED_DOCUMENT_TYPES = {
        BorrowerDocument.DocumentType.AADHAAR,
        BorrowerDocument.DocumentType.PAN,
    }

    FINANCIAL_DOCUMENT_TYPES = {
        BorrowerDocument.DocumentType.BANK_STATEMENT,
        BorrowerDocument.DocumentType.ITR,
        BorrowerDocument.DocumentType.SALARY_SLIP,
        BorrowerDocument.DocumentType.INCOME_COMPUTATION,
    }

    def __init__(self, provider=None):
        self.provider = provider or MockVerificationProvider()
        self.digilocker_provider = DigiLockerProvider()

    def normalize_name(self, name: str) -> str:
        if not name:
            return ""
        # Remove multiple spaces, titles, punctuation
        cleaned = re.sub(r"[^a-zA-Z\s]", "", name.upper())
        # Remove common honorifics
        cleaned = re.sub(r"^(MR|MRS|MS|DR|SHREE|SHRI)\s+", "", cleaned.strip())
        return re.sub(r"\s+", " ", cleaned).strip()

    def check_name_similarity(self, name_a: str, name_b: str) -> float:
        norm_a = self.normalize_name(name_a)
        norm_b = self.normalize_name(name_b)

        if not norm_a or not norm_b:
            return 0.0

        if norm_a == norm_b:
            return 1.0

        # Token set comparison (handles "Sharma Rahul" vs "Rahul Sharma")
        tokens_a = set(norm_a.split())
        tokens_b = set(norm_b.split())
        if tokens_a == tokens_b:
            return 0.95

        if tokens_a.issubset(tokens_b) or tokens_b.issubset(tokens_a):
            return 0.85

        # Sequence matcher ratio for typos
        return difflib.SequenceMatcher(None, norm_a, norm_b).ratio()

    def evaluate(self, borrower: Borrower, payload: dict = None) -> BorrowerVerification:
        payload = payload or {}
        flags = []
        explanation = []
        details = {}

        # -------------------------------------------------------------
        # 1. Identity Information Completeness
        # -------------------------------------------------------------
        identity_score = 0
        pan_number = payload.get("pan_number") or borrower.pan_number or ""
        aadhaar_number = payload.get("aadhaar_number") or borrower.aadhaar_number or ""
        name_as_per_pan = payload.get("name_as_per_pan") or borrower.name_as_per_pan or ""
        name_as_per_aadhaar = payload.get("name_as_per_aadhaar") or borrower.name_as_per_aadhaar or ""
        dob = borrower.date_of_birth or payload.get("date_of_birth")

        if borrower.name and len(borrower.name.strip()) >= 2:
            identity_score += 10
            explanation.append("Borrower full name is declared.")
        else:
            flags.append({
                "type": "MISSING_NAME",
                "severity": "HIGH",
                "message": "Borrower name is missing or too short."
            })

        if dob:
            identity_score += 5
            explanation.append("Date of birth is recorded.")
        else:
            flags.append({
                "type": "MISSING_DOB",
                "severity": "LOW",
                "message": "Date of birth was not specified."
            })

        # Check PAN with Provider
        pan_result = self.provider.verify_pan(pan_number, declared_name=borrower.name)
        details["pan_verification"] = {
            "status": pan_result["status"],
            "provider": pan_result["provider"],
            "reference": pan_result["provider_reference"],
        }

        if pan_result["valid"]:
            identity_score += 10
            explanation.append("PAN format and structure successfully verified.")
        else:
            flags.append({
                "type": "PAN_INVALID",
                "severity": "HIGH",
                "message": pan_result.get("error", "PAN format is invalid.")
            })

        # Check Aadhaar with Provider
        aadhaar_result = self.provider.verify_aadhaar(aadhaar_number, declared_name=borrower.name)
        details["aadhaar_verification"] = {
            "status": aadhaar_result["status"],
            "provider": aadhaar_result["provider"],
            "reference": aadhaar_result["provider_reference"],
        }

        if aadhaar_result["valid"]:
            identity_score += 10
            explanation.append("Aadhaar structure verified (12 digits, non-synthetic).")
        else:
            flags.append({
                "type": "AADHAAR_INVALID",
                "severity": "HIGH",
                "message": aadhaar_result.get("error", "Aadhaar format is invalid.")
            })

        # -------------------------------------------------------------
        # 2. Identity Consistency Across Records
        # -------------------------------------------------------------
        consistency_score = 0
        identity_match_status = BorrowerVerification.IdentityMatchStatus.NOT_AVAILABLE
        consistency_status = BorrowerVerification.ConsistencyStatus.PENDING

        names_to_compare = []
        if name_as_per_pan:
            names_to_compare.append(("PAN", name_as_per_pan))
        if name_as_per_aadhaar:
            names_to_compare.append(("Aadhaar", name_as_per_aadhaar))

        if not names_to_compare:
            identity_match_status = BorrowerVerification.IdentityMatchStatus.NOT_AVAILABLE
            consistency_status = BorrowerVerification.ConsistencyStatus.PENDING
            consistency_score += 10
            explanation.append("Secondary identity documents (PAN/Aadhaar names) pending cross-comparison.")
        else:
            ratios = [
                (source, self.check_name_similarity(borrower.name, target_name))
                for source, target_name in names_to_compare
            ]
            min_ratio = min(r for _, r in ratios)

            if min_ratio >= 0.90:
                identity_match_status = BorrowerVerification.IdentityMatchStatus.MATCH
                consistency_status = BorrowerVerification.ConsistencyStatus.CONSISTENT
                consistency_score += 30
                explanation.append("Declared name matches consistently across identity records.")
            elif min_ratio >= 0.70:
                identity_match_status = BorrowerVerification.IdentityMatchStatus.PARTIAL_MATCH
                consistency_status = BorrowerVerification.ConsistencyStatus.MINOR_MISMATCH
                consistency_score += 15
                explanation.append("Minor name variation detected between profile and identity documents.")
                flags.append({
                    "type": "NAME_MINOR_MISMATCH",
                    "severity": "MEDIUM",
                    "message": "Name differs slightly between profile and PAN/Aadhaar (e.g., initial or spelling variation)."
                })
            else:
                identity_match_status = BorrowerVerification.IdentityMatchStatus.MISMATCH
                consistency_status = BorrowerVerification.ConsistencyStatus.MAJOR_MISMATCH
                consistency_score = 0
                explanation.append("Significant discrepancy between borrower name and government records.")
                flags.append({
                    "type": "NAME_MAJOR_MISMATCH",
                    "severity": "HIGH",
                    "message": "Declared name does not match name on submitted PAN/Aadhaar."
                })

        # -------------------------------------------------------------
        # 3. Document Completeness & Validity
        # -------------------------------------------------------------
        documents = borrower.documents.all()
        uploaded_types = set(documents.values_list("document_type", flat=True))

        doc_score = 0
        missing_mandatory = self.REQUIRED_DOCUMENT_TYPES - uploaded_types
        has_financial_doc = bool(uploaded_types & self.FINANCIAL_DOCUMENT_TYPES)

        if not missing_mandatory and has_financial_doc:
            document_status = BorrowerVerification.DocumentStatus.COMPLETE
            doc_score += 25
            explanation.append("All mandatory identity and financial documents have been submitted.")
        elif not missing_mandatory:
            document_status = BorrowerVerification.DocumentStatus.PARTIALLY_COMPLETE
            doc_score += 18
            explanation.append("Mandatory identity proofs (Aadhaar & PAN) are submitted; financial proof recommended.")
            flags.append({
                "type": "FINANCIAL_DOC_PENDING",
                "severity": "LOW",
                "message": "Bank statement or income proof is recommended for complete verification."
            })
        elif len(uploaded_types) > 0:
            document_status = BorrowerVerification.DocumentStatus.PARTIALLY_COMPLETE
            doc_score += 10
            explanation.append(f"Missing mandatory documents: {', '.join(missing_mandatory)}.")
            flags.append({
                "type": "MANDATORY_DOCS_MISSING",
                "severity": "HIGH",
                "message": f"Required documents not found: {', '.join(missing_mandatory)}."
            })
        else:
            document_status = BorrowerVerification.DocumentStatus.MISSING
            doc_score = 0
            explanation.append("No verification documents uploaded yet.")
            flags.append({
                "type": "NO_DOCUMENTS",
                "severity": "HIGH",
                "message": "No identity or financial documents have been uploaded."
            })

        # -------------------------------------------------------------
        # 4. Method / Provider Bonus
        # -------------------------------------------------------------
        method_score = 0
        method = payload.get("method", BorrowerVerification.VerificationMethod.HYBRID)
        if method == BorrowerVerification.VerificationMethod.DIGILOCKER or payload.get("digilocker_consent"):
            dl_res = self.digilocker_provider.simulate_consent_flow(borrower.id, consent=True)
            details["digilocker_consent"] = dl_res
            method_score = 10
            explanation.append("Identity verified via DigiLocker consent flow (Demo).")
        else:
            method_score = 5

        # -------------------------------------------------------------
        # 5. Composite Confidence Score & Overall Status
        # -------------------------------------------------------------
        raw_confidence = identity_score + consistency_score + doc_score + method_score

        # Apply specific deductions for high-severity flags
        high_flags_count = sum(1 for f in flags if f.get("severity") == "HIGH")
        if high_flags_count > 0:
            raw_confidence -= (high_flags_count * 15)

        confidence_score = max(0, min(100, raw_confidence))

        # Determine Final Status
        if confidence_score >= 75 and consistency_status != BorrowerVerification.ConsistencyStatus.MAJOR_MISMATCH:
            verification_status = BorrowerVerification.VerificationStatus.VERIFIED
        elif confidence_score >= 45 and consistency_status != BorrowerVerification.ConsistencyStatus.MAJOR_MISMATCH:
            verification_status = BorrowerVerification.VerificationStatus.NEEDS_REVIEW
        else:
            verification_status = BorrowerVerification.VerificationStatus.FAILED

        # Masked Identity for privacy
        masked_aadhaar = f"XXXX-XXXX-{aadhaar_number[-4:]}" if len(aadhaar_number) >= 4 else "XXXX-XXXX-XXXX"
        masked_pan = f"{pan_number[:2]}XXXXX{pan_number[-2:]}" if len(pan_number) == 10 else "XXXXXXXXXX"

        details["masked_identity"] = {
            "aadhaar": masked_aadhaar,
            "pan": masked_pan,
        }
        details["evaluation_timestamp"] = datetime.utcnow().isoformat()
        details["environment"] = "DEMO"

        # Create or update BorrowerVerification record
        verification = BorrowerVerification.objects.create(
            borrower=borrower,
            identity_method=method,
            verification_status=verification_status,
            identity_match=identity_match_status,
            document_status=document_status,
            consistency_status=consistency_status,
            confidence_score=confidence_score,
            flags=flags,
            explanation=explanation,
            provider="MOCK",
            provider_reference=pan_result.get("provider_reference", ""),
            details=details,
        )

        return verification
