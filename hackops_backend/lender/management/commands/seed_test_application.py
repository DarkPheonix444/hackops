"""
Management command: seed_test_application

Seeds a full test borrower application and runs the 4-layer evaluation pipeline:
  Layer 1  – Identity data seeded into DB (User + Borrower)
  Layer 2  – OCR Trust Engine  (calculate_layer2_trust_score)
  Layer 3  – Financial Capacity Scoring (calculate_layer3_financial_score)
  Layer 4  – Personalized Decision Engine (calculate_layer4_decision)

Usage:
    python manage.py seed_test_application
"""

import json
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction

from borrower.models import Borrower, BorrowerDocument
from lender.models import LoanApplication
from lender.scoring import (
    calculate_layer2_trust_score,
    calculate_layer3_financial_score,
    calculate_layer4_decision,
)

User = get_user_model()

# ---------------------------------------------------------------------------
# Test-data constants
# ---------------------------------------------------------------------------
TEST_EMAIL = "janedoe@test.com"
TEST_PASSWORD = "TestPass@2024!"
TEST_NAME = "janedoe_test"

BORROWER_DATA = {
    "name": "Jane Doe",
    "monthly_income": 120_000.00,
    "existing_monthly_obligations": 15_000.00,
    "amount_requested": 300_000.00,
    "requested_tenure_months": 12,
    "cibil_score": 790,
    "employment_type": "SALARIED",
    "pan_number": "ABCDE1234F",
    # Required unique fields – use placeholders so uniqueness is scoped to test
    "aadhaar_number": "999900001234",
    "phone_number": "9999000001",
}

DOCUMENTS = [
    {
        "document_type": "PAN",
        "verification_status": "VERIFIED",
        "extracted_name": "Jane Doe",
        "extracted_document_number": "ABCDE1234F",
        "extracted_income": 120_000.00,
    },
    {
        "document_type": "BANK_STATEMENT",
        "verification_status": "VERIFIED",
        "extracted_name": "Jane Doe",
        "extracted_document_number": "BANK987654",
        "extracted_income": 120_000.00,
    },
]


class Command(BaseCommand):
    help = "Seed a full test application and verify the 4-layer evaluation pipeline."

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING(
            "\n=== Hackops - 4-Layer Evaluation Pipeline Seed ===\n"
        ))

        with transaction.atomic():
            # ------------------------------------------------------------------
            # LAYER 1 - Identity: User + Borrower + Documents
            # ------------------------------------------------------------------
            self.stdout.write("[*] Layer 1 - Seeding identity data...")

            # 1a. User  (custom model: email=unique key, no username field)
            user, user_created = User.objects.get_or_create(
                email=TEST_EMAIL,
                defaults={
                    "name": TEST_NAME,
                },
            )
            if user_created:
                user.set_password(TEST_PASSWORD)
                user.save()
                self.stdout.write(f"    [+] Created user  : {user.email} (name={user.name})")
            else:
                self.stdout.write(f"    [=] Found user    : {user.email} (name={user.name})")

            # 1b. Borrower
            # Try to find an existing borrower for this user; if not found, try
            # by pan_number (handles leftover rows from earlier partial runs).
            borrower_created = False
            borrower = Borrower.objects.filter(user=user).first()
            if borrower is None:
                # Try to adopt an existing Borrower row by PAN and re-link it.
                borrower = Borrower.objects.filter(
                    pan_number=BORROWER_DATA["pan_number"]
                ).first()
                if borrower is not None:
                    # Re-link to our test user
                    borrower.user = user
                else:
                    borrower = Borrower(user=user)
                    borrower_created = True

            # Always apply the canonical test values
            for field in [
                "name", "monthly_income", "existing_monthly_obligations",
                "amount_requested", "requested_tenure_months",
                "cibil_score", "employment_type", "pan_number",
            ]:
                setattr(borrower, field, BORROWER_DATA[field])
            # Only set unique fields on new rows to avoid unnecessary conflicts
            if borrower_created:
                borrower.aadhaar_number = BORROWER_DATA["aadhaar_number"]
                borrower.phone_number = BORROWER_DATA["phone_number"]
            borrower.save()

            action = "[+] Created" if borrower_created else "[=] Updated"
            self.stdout.write(f"    {action} borrower: {borrower.name} (id={borrower.pk})")

            # 1c. BorrowerDocuments  (skip if already exist for this borrower+type)
            for doc_data in DOCUMENTS:
                doc_qs = BorrowerDocument.objects.filter(
                    borrower=borrower,
                    document_type=doc_data["document_type"],
                )
                if doc_qs.exists():
                    doc = doc_qs.first()
                    # Update extracted fields
                    doc.verification_status = doc_data["verification_status"]
                    doc.extracted_name = doc_data["extracted_name"]
                    doc.extracted_document_number = doc_data["extracted_document_number"]
                    doc.extracted_income = doc_data["extracted_income"]
                    doc.save()
                    self.stdout.write(
                        f"    [=] Updated document : {doc_data['document_type']}"
                    )
                else:
                    # BorrowerDocument.document is a FileField - supply a dummy file
                    dummy_content = ContentFile(
                        b"DUMMY_SEED_FILE", name=f"{doc_data['document_type'].lower()}_seed.txt"
                    )
                    doc = BorrowerDocument(
                        borrower=borrower,
                        document_type=doc_data["document_type"],
                        verification_status=doc_data["verification_status"],
                        extracted_name=doc_data["extracted_name"],
                        extracted_document_number=doc_data["extracted_document_number"],
                        extracted_income=doc_data["extracted_income"],
                    )
                    doc.document.save(
                        f"{doc_data['document_type'].lower()}_seed.txt",
                        dummy_content,
                        save=False,
                    )
                    doc.save()
                    self.stdout.write(
                        f"    [+] Created document : {doc_data['document_type']}"
                    )

            # 1d. LoanApplication  (linked to auth user as borrower FK)
            loan_app, loan_created = LoanApplication.objects.get_or_create(
                borrower=user,
                defaults={
                    "amount_requested": BORROWER_DATA["amount_requested"],
                    "purpose": "Personal Loan – Seed Test",
                    "status": "READY_FOR_LENDER",
                },
            )
            if not loan_created:
                loan_app.amount_requested = BORROWER_DATA["amount_requested"]
                loan_app.save()
                self.stdout.write(f"    [=] Updated loan app : #{loan_app.id}")
            else:
                self.stdout.write(f"    [+] Created loan app : #{loan_app.id}")

            self.stdout.write(self.style.SUCCESS("   Layer 1 [DONE] Identity seeded.\n"))

            # ------------------------------------------------------------------
            # LAYER 2 - OCR Trust Engine
            # ------------------------------------------------------------------
            self.stdout.write("[*] Layer 2 - OCR Trust Engine...")
            trust_score, trust_breakdown = calculate_layer2_trust_score(borrower)
            self.stdout.write(self.style.SUCCESS(
                f"   Layer 2 [DONE] Trust Score = {trust_score}/100\n"
            ))

            # ------------------------------------------------------------------
            # LAYER 3 – Financial Capacity Scoring
            # ------------------------------------------------------------------
            self.stdout.write("[*] Layer 3 - Financial Capacity Scoring...")
            financial_score, risk_level, financial_breakdown = calculate_layer3_financial_score(borrower)
            self.stdout.write(self.style.SUCCESS(
                f"   Layer 3 [DONE] Financial Score = {financial_score}/100  |  Risk = {risk_level}\n"
            ))

            # ------------------------------------------------------------------
            # LAYER 4 – Personalized Decision Engine
            # ------------------------------------------------------------------
            self.stdout.write("[*] Layer 4 - Personalized Decision Engine...")
            composite_score, decision_status, ai_recommended_terms = calculate_layer4_decision(
                trust_score=trust_score,
                financial_score=financial_score,
                amount_requested=float(loan_app.amount_requested),
            )
            self.stdout.write(self.style.SUCCESS(
                f"   Layer 4 [DONE] Composite Score = {composite_score}  |  Decision = {decision_status}\n"
            ))

            # ------------------------------------------------------------------
            # Persist Layer 2-4 results back to LoanApplication
            # ------------------------------------------------------------------
            loan_app.ai_trust_score = trust_score
            loan_app.ai_risk_level = risk_level
            loan_app.ai_risk_breakdown = {
                "layer2_trust": trust_breakdown,
                "layer3_financial": financial_breakdown,
            }
            loan_app.ai_recommended_terms = ai_recommended_terms
            loan_app.status = decision_status
            loan_app.save()
            self.stdout.write(
                f"   [DB] LoanApplication #{loan_app.id} updated in PostgreSQL.\n"
            )

        # ------------------------------------------------------------------
        # Final JSON output
        # ------------------------------------------------------------------
        result = {
            "layer1_identity": {
                "user": {
                    "id": user.id,
                    "name": user.name,
                    "email": user.email,
                },
                "borrower": {
                    "id": borrower.id,
                    "name": borrower.name,
                    "pan_number": borrower.pan_number,
                    "monthly_income": str(borrower.monthly_income),
                    "existing_monthly_obligations": str(borrower.existing_monthly_obligations),
                    "amount_requested": str(borrower.amount_requested),
                    "requested_tenure_months": borrower.requested_tenure_months,
                    "cibil_score": borrower.cibil_score,
                    "employment_type": borrower.employment_type,
                },
                "loan_application_id": loan_app.id,
                "documents_seeded": [d["document_type"] for d in DOCUMENTS],
            },
            "layer2_trust": {
                "trust_score": trust_score,
                "max_trust_score": 100,
                "breakdown": trust_breakdown,
            },
            "layer3_financial": {
                "financial_score": financial_score,
                "risk_level": risk_level,
                "breakdown": financial_breakdown,
            },
            "layer4_decision": {
                "composite_score": composite_score,
                "decision_status": decision_status,
                "ai_recommended_terms": ai_recommended_terms,
            },
        }

        self.stdout.write(self.style.MIGRATE_HEADING("=== FINAL PIPELINE RESULT (JSON) ===\n"))
        self.stdout.write(json.dumps(result, indent=2, default=str))
        self.stdout.write(self.style.MIGRATE_HEADING("\n======================================\n"))
