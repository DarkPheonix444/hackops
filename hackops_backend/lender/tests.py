from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from borrower.models import Borrower
from .models import LoanApplication
from .scoring import calculate_layer3_financial_score

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
        self.assertIn("APPROVED", data["decision_notes"])

        # Check DB state
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, "APPROVED")
        self.assertEqual(self.application.ai_trust_score, 100)
        self.assertEqual(self.application.ai_risk_level, "LOW")
        self.assertIsNotNone(self.application.decided_at)

    def test_evaluate_endpoint_medium_risk_ready_for_lender(self):
        # Modify borrower to medium risk
        self.borrower.existing_monthly_obligations = Decimal("30000.00")
        self.borrower.amount_requested = Decimal("420000.00")
        self.borrower.cibil_score = 680
        self.borrower.employment_type = "SELF_EMPLOYED"
        self.borrower.save()

        self.application.amount_requested = Decimal("420000.00")
        self.application.save()

        url = f"/api/lender/evaluate/{self.application.id}/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["status"], "READY_FOR_LENDER")
        self.assertEqual(data["ai_risk_level"], "MEDIUM")
        self.assertEqual(data["ai_trust_score"], 63)

    def test_evaluate_endpoint_dscr_below_1_rejected(self):
        # Modify borrower to have DSCR < 1.0 (EMI 60000 vs Disposable 40000)
        self.borrower.existing_monthly_obligations = Decimal("60000.00")  # Disposable = 40000
        self.borrower.amount_requested = Decimal("720000.00")  # EMI = 60000, DSCR = 40/60 = 0.67 < 1.0
        self.borrower.cibil_score = 780
        self.borrower.employment_type = "SALARIED"
        self.borrower.save()

        self.application.amount_requested = Decimal("720000.00")
        self.application.save()

        url = f"/api/lender/evaluate/{self.application.id}/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["status"], "REJECTED")
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
