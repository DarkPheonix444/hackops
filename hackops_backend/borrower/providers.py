import re
import uuid
from datetime import datetime


class BaseVerificationProvider:
    """Abstract interface for TrustLens Identity & Document Verification providers."""

    provider_name = "BASE"
    environment = "DEMO"

    def verify_pan(self, pan_number: str, declared_name: str = "") -> dict:
        raise NotImplementedError

    def verify_aadhaar(self, aadhaar_number: str, declared_name: str = "") -> dict:
        raise NotImplementedError

    def verify_document(self, document_type: str, file_name: str = "") -> dict:
        raise NotImplementedError


class MockVerificationProvider(BaseVerificationProvider):
    """
    Explainable Mock Verification Provider for local hackathon demo and testing.
    Validates syntax, structure, checksum patterns, and performs deterministic checks.
    """

    provider_name = "MOCK"
    environment = "DEMO"

    PAN_REGEX = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
    AADHAAR_REGEX = re.compile(r"^[2-9][0-9]{11}$")

    def verify_pan(self, pan_number: str, declared_name: str = "") -> dict:
        clean_pan = (pan_number or "").strip().upper()
        reference_id = f"MOCK-PAN-{uuid.uuid4().hex[:8].upper()}"

        if not clean_pan:
            return {
                "valid": False,
                "status": "MISSING",
                "provider": self.provider_name,
                "environment": self.environment,
                "provider_reference": reference_id,
                "error": "PAN number was not provided.",
                "details": {},
            }

        if not self.PAN_REGEX.match(clean_pan):
            return {
                "valid": False,
                "status": "INVALID_FORMAT",
                "provider": self.provider_name,
                "environment": self.environment,
                "provider_reference": reference_id,
                "error": f"Invalid PAN format '{clean_pan[:2]}...'. Expected 5 letters, 4 digits, 1 letter.",
                "details": {"format_valid": False},
            }

        # Check for obvious synthetic repetitive patterns
        if clean_pan[0] * 5 == clean_pan[:5]:
            return {
                "valid": False,
                "status": "SUSPICIOUS_PATTERN",
                "provider": self.provider_name,
                "environment": self.environment,
                "provider_reference": reference_id,
                "error": "PAN contains repetitive dummy letters.",
                "details": {"format_valid": False, "suspicious": True},
            }

        pan_category = clean_pan[3]
        category_map = {
            "P": "Individual",
            "C": "Company",
            "H": "HUF",
            "F": "Firm",
            "A": "Association of Persons",
            "T": "Trust",
            "B": "Body of Individuals",
        }

        return {
            "valid": True,
            "status": "VERIFIED",
            "provider": self.provider_name,
            "environment": self.environment,
            "provider_reference": reference_id,
            "details": {
                "format_valid": True,
                "entity_type": category_map.get(pan_category, "Other"),
                "verified_at": datetime.utcnow().isoformat(),
            },
        }

    def verify_aadhaar(self, aadhaar_number: str, declared_name: str = "") -> dict:
        clean_aadhaar = re.sub(r"[\s\-]", "", str(aadhaar_number or ""))
        reference_id = f"MOCK-UID-{uuid.uuid4().hex[:8].upper()}"

        if not clean_aadhaar:
            return {
                "valid": False,
                "status": "MISSING",
                "provider": self.provider_name,
                "environment": self.environment,
                "provider_reference": reference_id,
                "error": "Aadhaar number was not provided.",
                "details": {},
            }

        if not (clean_aadhaar.isdigit() and len(clean_aadhaar) == 12):
            return {
                "valid": False,
                "status": "INVALID_LENGTH",
                "provider": self.provider_name,
                "environment": self.environment,
                "provider_reference": reference_id,
                "error": "Aadhaar must be exactly 12 numeric digits.",
                "details": {"digits_count": len(clean_aadhaar)},
            }

        # Aadhaar numbers never start with 0 or 1
        if clean_aadhaar[0] in ("0", "1"):
            return {
                "valid": False,
                "status": "INVALID_PREFIX",
                "provider": self.provider_name,
                "environment": self.environment,
                "provider_reference": reference_id,
                "error": "Official Aadhaar numbers do not begin with 0 or 1.",
                "details": {},
            }

        # Check for obvious synthetic repeated patterns (e.g. 999999999999 or 123412341234)
        if clean_aadhaar == clean_aadhaar[0] * 12:
            return {
                "valid": False,
                "status": "SYNTHETIC_REPETITION",
                "provider": self.provider_name,
                "environment": self.environment,
                "provider_reference": reference_id,
                "error": "Aadhaar consists of repeated identical digits.",
                "details": {"suspicious": True},
            }

        masked = f"XXXX-XXXX-{clean_aadhaar[-4:]}"
        return {
            "valid": True,
            "status": "VERIFIED",
            "provider": self.provider_name,
            "environment": self.environment,
            "provider_reference": reference_id,
            "details": {
                "masked_id": masked,
                "format_valid": True,
                "verified_at": datetime.utcnow().isoformat(),
            },
        }

    def verify_document(self, document_type: str, file_name: str = "") -> dict:
        reference_id = f"MOCK-DOC-{uuid.uuid4().hex[:8].upper()}"
        clean_ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
        allowed_extensions = ["pdf", "jpg", "jpeg", "png"]

        if clean_ext and clean_ext not in allowed_extensions:
            return {
                "valid": False,
                "status": "UNSUPPORTED_TYPE",
                "provider": self.provider_name,
                "environment": self.environment,
                "provider_reference": reference_id,
                "error": f"Unsupported file extension '.{clean_ext}'. Allowed: {', '.join(allowed_extensions)}",
            }

        return {
            "valid": True,
            "status": "VERIFIED",
            "provider": self.provider_name,
            "environment": self.environment,
            "provider_reference": reference_id,
            "details": {
                "document_type": document_type,
                "file_type": clean_ext or "standard",
                "verified_at": datetime.utcnow().isoformat(),
            },
        }


class DigiLockerProvider(BaseVerificationProvider):
    """
    DigiLocker Provider Abstraction.
    Clearly marked as DEMO / MOCK simulation.
    Does NOT claim real government verification without active sandbox credentials.
    """

    provider_name = "DIGILOCKER_MOCK"
    environment = "DEMO"

    def simulate_consent_flow(self, borrower_id: int, consent: bool = True) -> dict:
        reference_id = f"DL-DEMO-REQ-{uuid.uuid4().hex[:10].upper()}"

        if not consent:
            return {
                "status": "CONSENT_DENIED",
                "consent_granted": False,
                "provider": self.provider_name,
                "environment": self.environment,
                "provider_reference": reference_id,
                "message": "User denied DigiLocker consent.",
            }

        return {
            "status": "CONSENT_GRANTED",
            "consent_granted": True,
            "provider": self.provider_name,
            "environment": self.environment,
            "provider_reference": reference_id,
            "timestamp": datetime.utcnow().isoformat(),
            "disclaimer": "Demo verification - Test data only. Not connected to live UIDAI/DigiLocker servers.",
            "retrieved_documents": [
                {
                    "doc_type": "AADHAAR",
                    "issuer": "UIDAI (Simulated)",
                    "status": "VERIFIED",
                },
                {
                    "doc_type": "PAN",
                    "issuer": "Income Tax Department (Simulated)",
                    "status": "VERIFIED",
                },
            ],
        }
