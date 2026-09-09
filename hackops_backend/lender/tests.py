from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from borrower.models import Borrower, BorrowerDocument
from .models import LoanApplication
from .scoring import (
    calculate_layer2_trust_score,
    calculate_layer3_financial_score,
    calculate_layer4_decision,
)

User = get_user_model()


class Layer3ScoringUnitTests(TestCase):
    """Unit tests for calculate_layer3_financial_score."""

    def test_zero_or_negative_income(self):
        # monthly_income <= 0
        borrower_data = {
            "monthly_income": 0,
            "existing_monthly_obligations": 5000,
            "amount_requested": 50000,
            "requested_tenure_months": 12,
            "cibil_score": 800,
            "employment_type": "SALARIED",
        }
        score, risk_level, breakdown = calculate_layer3_financial_score(borrower_data)
        self.assertEqual(score, 0)
        self.assertEqual(risk_level, "HIGH")
        self.assertIn("error", breakdown)
        self.assertEqual(breakdown["dscr"], 0.0)

    def test_tenure_defaulting_to_12(self):
        # requested_tenure_months is null or 0 -> should default to 12
        borrower_data = {
            "monthly_income": 100000,
            "existing_monthly_obligations": 10000,
            "amount_requested": 120000,  # EMI will be 120000/12 = 10000
            "requested_tenure_months": 0,
            "cibil_score": 800,
            "employment_type": "SALARIED",
        }
        score, risk_level, breakdown = calculate_layer3_financial_score(borrower_data)
        self.assertEqual(breakdown["requested_tenure_months"], 12)
        self.assertEqual(breakdown["estimated_emi"], 10000.0)

    def test_dti_brackets(self):
        # Bracket 1: DTI <= 20% -> 40 pts
        b1 = {
            "monthly_income": 100000,
            "existing_monthly_obligations": 20000,  # 20%
            "amount_requested": 12000,
            "requested_tenure_months": 12,
        }
        _, _, bd1 = calculate_layer3_financial_score(b1)
        self.assertEqual(bd1["dti_points"], 40)

        # Bracket 2: 20% < DTI <= 40% -> 25 pts
        b2 = {
            "monthly_income": 100000,
            "existing_monthly_obligations": 30000,  # 30%
            "amount_requested": 12000,
            "requested_tenure_months": 12,
        }
        _, _, bd2 = calculate_layer3_financial_score(b2)
        self.assertEqual(bd2["dti_points"], 25)

        # Bracket 3: 40% < DTI <= 60% -> 10 pts
        b3 = {
            "monthly_income": 100000,
            "existing_monthly_obligations": 50000,  # 50%
            "amount_requested": 12000,
            "requested_tenure_months": 12,
        }
        _, _, bd3 = calculate_layer3_financial_score(b3)
        self.assertEqual(bd3["dti_points"], 10)

        # Bracket 4: DTI > 60% -> 0 pts
        b4 = {
            "monthly_income": 100000,
            "existing_monthly_obligations": 70000,  # 70%
            "amount_requested": 12000,
            "requested_tenure_months": 12,
        }
        _, _, bd4 = calculate_layer3_financial_score(b4)
        self.assertEqual(bd4["dti_points"], 0)

    def test_dscr_brackets(self):
        # Disposable income = 100000 - 20000 = 80000
        # DSCR >= 2.5 -> 30 pts (EMI <= 32000)
        b1 = {
            "monthly_income": 100000,
            "existing_monthly_obligations": 20000,
            "amount_requested": 240000,  # EMI = 20000, DSCR = 80000/20000 = 4.0 >= 2.5
            "requested_tenure_months": 12,
        }
        _, _, bd1 = calculate_layer3_financial_score(b1)
        self.assertEqual(bd1["dscr_points"], 30)

        # 1.5 <= DSCR < 2.5 -> 20 pts
        # EMI = 40000, DSCR = 80000/40000 = 2.0
        b2 = {
            "monthly_income": 100000,
            "existing_monthly_obligations": 20000,
            "amount_requested": 480000,
            "requested_tenure_months": 12,
        }
        _, _, bd2 = calculate_layer3_financial_score(b2)
        self.assertEqual(bd2["dscr_points"], 20)

        # 1.0 <= DSCR < 1.5 -> 10 pts
        # EMI = 60000, DSCR = 80000/60000 = 1.33
        b3 = {
            "monthly_income": 100000,
            "existing_monthly_obligations": 20000,
            "amount_requested": 720000,
            "requested_tenure_months": 12,
        }
        _, _, bd3 = calculate_layer3_financial_score(b3)
        self.assertEqual(bd3["dscr_points"], 10)

        # DSCR < 1.0 -> 0 pts
        # EMI = 100000, DSCR = 80000/100000 = 0.8
        b4 = {
            "monthly_income": 100000,
            "existing_monthly_obligations": 20000,
            "amount_requested": 1200000,
            "requested_tenure_months": 12,
        }
        _, _, bd4 = calculate_layer3_financial_score(b4)
        self.assertEqual(bd4["dscr_points"], 0)

    def test_credit_and_cibil_scores(self):
        # CIBIL >= 750 -> 20 pts
        b1 = {
            "monthly_income": 50000,
            "cibil_score": 760,
        }
        _, _, bd1 = calculate_layer3_financial_score(b1)
        self.assertEqual(bd1["credit_points"], 20)

        # 650 <= CIBIL < 750 -> 12 pts
        b2 = {
            "monthly_income": 50000,
            "cibil_score": 700,
        }
        _, _, bd2 = calculate_layer3_financial_score(b2)
        self.assertEqual(bd2["credit_points"], 12)

        # Fallback to credit_score when cibil is None
        b3 = {
            "monthly_income": 50000,
            "cibil_score": None,
            "credit_score": 780,
        }
        _, _, bd3 = calculate_layer3_financial_score(b3)
        self.assertEqual(bd3["credit_points"], 20)
        self.assertEqual(bd3["credit_score_source"], "credit_score")

        # Score < 650 or Null -> 0 pts
        b4 = {
            "monthly_income": 50000,
            "cibil_score": 620,
        }
        _, _, bd4 = calculate_layer3_financial_score(b4)
        self.assertEqual(bd4["credit_points"], 0)

    def test_employment_stability(self):
        # Salaried -> 10 pts
        _, _, bd1 = calculate_layer3_financial_score({"monthly_income": 50000, "employment_type": "SALARIED"})
        self.assertEqual(bd1["employment_points"], 10)

        # Business -> 10 pts
        _, _, bd2 = calculate_layer3_financial_score({"monthly_income": 50000, "employment_type": "BUSINESS"})
        self.assertEqual(bd2["employment_points"], 10)

        # Self Employed -> 6 pts
        _, _, bd3 = calculate_layer3_financial_score({"monthly_income": 50000, "employment_type": "SELF_EMPLOYED"})
        self.assertEqual(bd3["employment_points"], 6)

        # Student / Null / Other -> 0 pts
        _, _, bd4 = calculate_layer3_financial_score({"monthly_income": 50000, "employment_type": "STUDENT"})
        self.assertEqual(bd4["employment_points"], 0)

    def test_risk_categorization(self):
        # Perfect profile: 40 + 30 + 20 + 10 = 100 -> LOW
        low_risk = {
            "monthly_income": 100000,
            "existing_monthly_obligations": 10000,  # 10% -> 40 pts
            "amount_requested": 120000,             # EMI 10000, DSCR 90000/10000=9.0 -> 30 pts
            "requested_tenure_months": 12,
            "cibil_score": 780,                     # 20 pts
            "employment_type": "SALARIED",          # 10 pts
        }
        score, risk_level, _ = calculate_layer3_financial_score(low_risk)
        self.assertEqual(score, 100)
        self.assertEqual(risk_level, "LOW")

        # Medium risk profile: 25 + 20 + 12 + 6 = 63 -> MEDIUM
        medium_risk = {
            "monthly_income": 100000,
            "existing_monthly_obligations": 30000,  # 30% -> 25 pts
            "amount_requested": 420000,             # EMI 35000, DSCR 70000/35000=2.0 -> 20 pts
            "requested_tenure_months": 12,
            "cibil_score": 680,                     # 12 pts
            "employment_type": "SELF_EMPLOYED",     # 6 pts
        }
        score, risk_level, _ = calculate_layer3_financial_score(medium_risk)
        self.assertEqual(score, 63)
        self.assertEqual(risk_level, "MEDIUM")

        # High risk profile: 10 + 0 + 0 + 0 = 10 -> HIGH
        high_risk = {
            "monthly_income": 100000,
            "existing_monthly_obligations": 50000,  # 50% -> 10 pts
            "amount_requested": 1200000,            # EMI 100000, DSCR 50000/100000=0.5 -> 0 pts
            "requested_tenure_months": 12,
            "cibil_score": 600,                     # 0 pts
            "employment_type": "STUDENT",           # 0 pts
        }
        score, risk_level, _ = calculate_layer3_financial_score(high_risk)
        self.assertEqual(score, 10)
        self.assertEqual(risk_level, "HIGH")


class Layer2TrustScoringUnitTests(TestCase):
    """Unit tests for calculate_layer2_trust_score."""

    def test_name_match_in_extracted_name(self):
        borrower = {
            "name": "Jane Doe",
            "pan_number": "ABCDE1234F",
            "monthly_income": 50000,
            "documents": [
                {
                    "extracted_name": "JANE DOE",
                    "verification_notes": "",
                    "extracted_document_number": "",
                    "extracted_income": 0,
                    "document_type": "PAN",
                    "verification_status": "PENDING",
                }
            ]
        }
        trust_score, breakdown = calculate_layer2_trust_score(borrower)
        self.assertEqual(breakdown["name_points"], 30)
        self.assertTrue(breakdown["name_match"])
        self.assertEqual(trust_score, 30)

    def test_name_match_in_verification_notes(self):
        borrower = {
            "name": "Jane Doe",
            "documents": [
                {
                    "extracted_name": "Unknown",
                    "verification_notes": "Verified name Jane Doe successfully via Aadhaar QR",
                    "extracted_document_number": "",
                    "extracted_income": 0,
                    "document_type": "AADHAAR",
                    "verification_status": "PENDING",
                }
            ]
        }
        trust_score, breakdown = calculate_layer2_trust_score(borrower)
        self.assertEqual(breakdown["name_points"], 30)
        self.assertTrue(breakdown["name_match"])

    def test_id_match_pan_number(self):
        borrower = {
            "pan_number": "ABCDE1234F",
            "documents": [
                {
                    "extracted_name": "",
                    "extracted_document_number": "ABCDE1234F",
                    "document_type": "PAN",
                    "verification_status": "PENDING",
                }
            ]
        }
        trust_score, breakdown = calculate_layer2_trust_score(borrower)
        self.assertEqual(breakdown["id_points"], 25)
        self.assertTrue(breakdown["id_match"])
        self.assertEqual(trust_score, 25)

    def test_income_match_threshold(self):
        # monthly_income = 100000, 90% threshold = 90000
        # Doc 1: extracted_income = 95000 >= 90000 -> Match
        borrower = {
            "monthly_income": 100000,
            "documents": [
                {
                    "extracted_income": 95000,
                    "document_type": "BANK_STATEMENT",
                    "verification_status": "PENDING",
                }
            ]
        }
        trust_score, breakdown = calculate_layer2_trust_score(borrower)
        self.assertEqual(breakdown["income_points"], 25)
        self.assertTrue(breakdown["income_match"])
        self.assertEqual(trust_score, 25)

    def test_income_mismatch_below_threshold(self):
        # monthly_income = 100000, 90% threshold = 90000
        # Doc 1: extracted_income = 85000 < 90000 -> No match
        borrower = {
            "monthly_income": 100000,
            "documents": [
                {
                    "extracted_income": 85000,
                    "document_type": "BANK_STATEMENT",
                    "verification_status": "PENDING",
                }
            ]
        }
        trust_score, breakdown = calculate_layer2_trust_score(borrower)
        self.assertEqual(breakdown["income_points"], 0)
        self.assertFalse(breakdown["income_match"])

    def test_document_presence_verified_two_docs(self):
        # At least 2 documents among (PAN, AADHAAR, BANK_STATEMENT) with verification_status == 'VERIFIED'
        borrower = {
            "documents": [
                {"document_type": "PAN", "verification_status": "VERIFIED"},
                {"document_type": "AADHAAR", "verification_status": "VERIFIED"},
                {"document_type": "OTHER", "verification_status": "VERIFIED"},
            ]
        }
        trust_score, breakdown = calculate_layer2_trust_score(borrower)
        self.assertEqual(breakdown["doc_presence_points"], 20)
        self.assertTrue(breakdown["doc_presence_match"])
        self.assertEqual(breakdown["doc_presence_count"], 2)
        self.assertEqual(trust_score, 20)

    def test_document_presence_less_than_two_verified(self):
        borrower = {
            "documents": [
                {"document_type": "PAN", "verification_status": "VERIFIED"},
                {"document_type": "AADHAAR", "verification_status": "PENDING"},
            ]
        }
        trust_score, breakdown = calculate_layer2_trust_score(borrower)
        self.assertEqual(breakdown["doc_presence_points"], 0)
        self.assertFalse(breakdown["doc_presence_match"])

    def test_perfect_layer2_score(self):
        borrower = {
            "name": "Jane Doe",
            "pan_number": "ABCDE1234F",
            "monthly_income": 100000,
            "documents": [
                {
                    "extracted_name": "Jane Doe",
                    "extracted_document_number": "ABCDE1234F",
                    "document_type": "PAN",
                    "verification_status": "VERIFIED",
                },
                {
                    "extracted_name": "Jane Doe",
                    "extracted_income": 100000,
                    "document_type": "BANK_STATEMENT",
                    "verification_status": "VERIFIED",
                }
            ]
        }
        trust_score, breakdown = calculate_layer2_trust_score(borrower)
        self.assertEqual(trust_score, 100)
        self.assertEqual(breakdown["name_points"], 30)
        self.assertEqual(breakdown["id_points"], 25)
        self.assertEqual(breakdown["income_points"], 25)
        self.assertEqual(breakdown["doc_presence_points"], 20)


class Layer4DecisionUnitTests(TestCase):
    """Unit tests for calculate_layer4_decision."""

    def test_composite_approved_gte_80(self):
        # Trust = 80, Financial = 80 -> Composite = 80.0 -> APPROVED, 100%, 10.5%
        composite, status_val, terms = calculate_layer4_decision(
            trust_score=80, financial_score=80, amount_requested=200000
        )
        self.assertEqual(composite, 80.0)
        self.assertEqual(status_val, "APPROVED")
        self.assertEqual(terms["approved_percentage"], 100)
        self.assertEqual(terms["approved_amount"], 200000.0)
        self.assertEqual(terms["rate"], "10.5%")

    def test_composite_ready_for_lender_60_to_80(self):
        # Trust = 60, Financial = 70 -> Composite = 18 + 49 = 67.0 -> READY_FOR_LENDER, 80%, 13.0%
        composite, status_val, terms = calculate_layer4_decision(
            trust_score=60, financial_score=70, amount_requested=100000
        )
        self.assertEqual(composite, 67.0)
        self.assertEqual(status_val, "READY_FOR_LENDER")
        self.assertEqual(terms["approved_percentage"], 80)
        self.assertEqual(terms["approved_amount"], 80000.0)
        self.assertEqual(terms["rate"], "13.0%")

    def test_composite_ready_for_lender_40_to_60(self):
        # Trust = 30, Financial = 50 -> Composite = 9 + 35 = 44.0 -> READY_FOR_LENDER, 50%, 15.5%
        composite, status_val, terms = calculate_layer4_decision(
            trust_score=30, financial_score=50, amount_requested=100000
        )
        self.assertEqual(composite, 44.0)
        self.assertEqual(status_val, "READY_FOR_LENDER")
        self.assertEqual(terms["approved_percentage"], 50)
        self.assertEqual(terms["approved_amount"], 50000.0)
        self.assertEqual(terms["rate"], "15.5%")

    def test_composite_rejected_lt_40(self):
        # Trust = 20, Financial = 30 -> Composite = 6 + 21 = 27.0 -> REJECTED, 0%, N/A
        composite, status_val, terms = calculate_layer4_decision(
            trust_score=20, financial_score=30, amount_requested=100000
        )
        self.assertEqual(composite, 27.0)
        self.assertEqual(status_val, "REJECTED")
        self.assertEqual(terms["approved_percentage"], 0)
        self.assertEqual(terms["approved_amount"], 0.0)
        self.assertEqual(terms["rate"], "N/A")


class LenderEvaluationAPITests(TestCase):
    """Unit and Integration tests for /api/lender/evaluate/<application_id>/ endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="applicant.test@example.com",
            name="John Applicant",
            password="password123"
        )
        self.borrower = Borrower.objects.create(
            user=self.user,
            name="John Applicant",
            aadhaar_number="987654321098",
            pan_number="ABCDE9999F",
            phone_number="9988776655",
            monthly_income=Decimal("100000.00"),
            existing_monthly_obligations=Decimal("10000.00"),
            amount_requested=Decimal("120000.00"),
            requested_tenure_months=12,
            cibil_score=780,
            employment_type="SALARIED",
        )
        # Create verified documents for borrower so Trust Score = 100
        BorrowerDocument.objects.create(
            borrower=self.borrower,
            document_type="PAN",
            verification_status="VERIFIED",
            extracted_name="John Applicant",
            extracted_document_number="ABCDE9999F",
            extracted_income=Decimal("100000.00"),
        )
        BorrowerDocument.objects.create(
            borrower=self.borrower,
            document_type="AADHAAR",
            verification_status="VERIFIED",
            extracted_name="John Applicant",
        )
        self.application = LoanApplication.objects.create(
            borrower=self.user,
            amount_requested=Decimal("120000.00"),
            purpose="Home Renovation",
            status="READY_FOR_LENDER"
        )

    def test_evaluate_endpoint_low_risk_approved(self):
        url = f"/api/lender/evaluate/{self.application.id}/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["status"], "APPROVED")
        self.assertEqual(data["ai_risk_level"], "LOW")
        self.assertEqual(data["ai_trust_score"], 100)
        self.assertEqual(data["composite_score"], 100.0)
        self.assertEqual(data["ai_recommended_terms"]["approved_percentage"], 100)
        self.assertEqual(data["ai_recommended_terms"]["rate"], "10.5%")
        self.assertIn("APPROVED", data["decision_notes"])

        # Check DB state
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, "APPROVED")
        self.assertEqual(self.application.ai_trust_score, 100)
        self.assertEqual(self.application.ai_risk_level, "LOW")
        self.assertEqual(self.application.ai_recommended_terms["approved_percentage"], 100)
        self.assertIn("composite_score", self.application.ai_risk_breakdown)
        self.assertIsNotNone(self.application.decided_at)

    def test_evaluate_endpoint_ready_for_lender_80_percent(self):
        # Modify borrower to have composite score in [60, 80)
        # E.g. Remove one document so trust = 80 (name=30, id=25, income=25, presence=0)
        BorrowerDocument.objects.filter(borrower=self.borrower, document_type="AADHAAR").delete()
        # Financial capacity: DTI=30% -> 25pts, DSCR=2.0 -> 20pts, cibil=680 -> 12pts, self_employed -> 6pts = 63pts
        self.borrower.existing_monthly_obligations = Decimal("30000.00")
        self.borrower.amount_requested = Decimal("420000.00")
        self.borrower.cibil_score = 680
        self.borrower.employment_type = "SELF_EMPLOYED"
        self.borrower.save()

        self.application.amount_requested = Decimal("420000.00")
        self.application.save()

        # Trust = 80, Financial = 63 -> Composite = 80*0.3 + 63*0.7 = 24 + 44.1 = 68.1 (in 60..80)
        url = f"/api/lender/evaluate/{self.application.id}/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["status"], "READY_FOR_LENDER")
        self.assertEqual(data["ai_risk_level"], "MEDIUM")
        self.assertEqual(data["ai_trust_score"], 80)
        self.assertEqual(data["composite_score"], 68.1)
        self.assertEqual(data["ai_recommended_terms"]["approved_percentage"], 80)
        self.assertEqual(data["ai_recommended_terms"]["rate"], "13.0%")

    def test_evaluate_endpoint_ready_for_lender_50_percent(self):
        # Remove documents so Trust = 0
        BorrowerDocument.objects.filter(borrower=self.borrower).delete()
        # Financial = 73 (low obligations, good cibil, salaried) -> Composite = 0*0.3 + 73*0.7 = 51.1 (in 40..60)
        # Let's set financial to 70: DTI 20% (40), DSCR 1.2 (10), cibil 680 (12), salaried (10) -> 72
        # 72 * 0.7 = 50.4
        self.borrower.existing_monthly_obligations = Decimal("20000.00")
        self.borrower.amount_requested = Decimal("720000.00")  # EMI 60000, DSCR 80000/60000=1.33 -> 10 pts
        self.borrower.cibil_score = 680  # 12 pts
        self.borrower.employment_type = "SALARIED"  # 10 pts
        self.borrower.save()

        url = f"/api/lender/evaluate/{self.application.id}/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["status"], "READY_FOR_LENDER")
        self.assertEqual(data["ai_recommended_terms"]["approved_percentage"], 50)
        self.assertEqual(data["ai_recommended_terms"]["rate"], "15.5%")

    def test_evaluate_endpoint_rejected_below_40(self):
        # Remove all documents: Trust = 0
        BorrowerDocument.objects.filter(borrower=self.borrower).delete()
        # High obligations -> Financial = 10 -> Composite = 0*0.3 + 10*0.7 = 7.0 < 40
        self.borrower.existing_monthly_obligations = Decimal("60000.00")
        self.borrower.amount_requested = Decimal("1200000.00")
        self.borrower.cibil_score = 600
        self.borrower.employment_type = "STUDENT"
        self.borrower.save()

        url = f"/api/lender/evaluate/{self.application.id}/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["status"], "REJECTED")
        self.assertEqual(data["ai_risk_level"], "HIGH")
        self.assertEqual(data["ai_recommended_terms"]["approved_percentage"], 0)
        self.assertEqual(data["ai_recommended_terms"]["rate"], "N/A")
        self.assertIn("REJECTED", data["decision_notes"])

    def test_evaluate_endpoint_get_method_supported(self):
        url = f"/api/lender/evaluate/{self.application.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["status"], "APPROVED")

    def test_evaluate_endpoint_not_found(self):
        url = "/api/lender/evaluate/999999/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
