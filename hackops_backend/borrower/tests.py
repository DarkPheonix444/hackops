from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from .models import Borrower, BorrowerDocument, BorrowerVerification
from .providers import MockVerificationProvider, DigiLockerProvider
from .verification import TrustLensVerificationEngine

User = get_user_model()


class VerificationProviderTests(TestCase):
    """Unit tests for Mock and DigiLocker Verification Providers (Requirement 15: #12)."""

    def setUp(self):
        self.provider = MockVerificationProvider()
        self.digilocker = DigiLockerProvider()

    def test_valid_pan(self):
        res = self.provider.verify_pan("ABCDE1234F", declared_name="Rahul Sharma")
        self.assertTrue(res["valid"])
        self.assertEqual(res["status"], "VERIFIED")
        self.assertEqual(res["provider"], "MOCK")
        self.assertEqual(res["environment"], "DEMO")

    def test_invalid_pan_format(self):
        res = self.provider.verify_pan("INVALID12", declared_name="Rahul Sharma")
        self.assertFalse(res["valid"])
        self.assertEqual(res["status"], "INVALID_FORMAT")

    def test_repetitive_synthetic_pan(self):
        res = self.provider.verify_pan("AAAAA1234F", declared_name="Rahul Sharma")
        self.assertFalse(res["valid"])
        self.assertEqual(res["status"], "SUSPICIOUS_PATTERN")

    def test_valid_aadhaar(self):
        res = self.provider.verify_aadhaar("234567890123", declared_name="Rahul Sharma")
        self.assertTrue(res["valid"])
        self.assertEqual(res["status"], "VERIFIED")
        self.assertEqual(res["details"]["masked_id"], "XXXX-XXXX-0123")

    def test_invalid_aadhaar_length_and_prefix(self):
        res_short = self.provider.verify_aadhaar("12345")
        self.assertFalse(res_short["valid"])
        self.assertEqual(res_short["status"], "INVALID_LENGTH")

        res_zero = self.provider.verify_aadhaar("012345678901")
        self.assertFalse(res_zero["valid"])
        self.assertEqual(res_zero["status"], "INVALID_PREFIX")

    def test_digilocker_mock_flow(self):
        res = self.digilocker.simulate_consent_flow(borrower_id=1, consent=True)
        self.assertEqual(res["status"], "CONSENT_GRANTED")
        self.assertEqual(res["provider"], "DIGILOCKER_MOCK")
        self.assertIn("Demo verification", res["disclaimer"])


class VerificationEngineUnitTests(TestCase):
    """Unit tests for the explainable TrustLens Verification Engine."""

    def setUp(self):
        self.engine = TrustLensVerificationEngine()
        self.user = User.objects.create_user(
            email="rahul.sharma@example.com",
            name="Rahul Sharma",
            password="testpassword123"
        )
        self.borrower = Borrower.objects.create(
            user=self.user,
            name="Rahul Sharma",
            name_as_per_pan="Rahul Sharma",
            name_as_per_aadhaar="Rahul Sharma",
            pan_number="ABCDE1234F",
            aadhaar_number="234567890123",
            phone_number="9876543210",
            amount_requested=25000,
        )

    def test_successful_verification_full_data(self):
        # Add required documents
        BorrowerDocument.objects.create(
            borrower=self.borrower,
            document_type=BorrowerDocument.DocumentType.AADHAAR,
            document="docs/aadhaar.pdf"
        )
        BorrowerDocument.objects.create(
            borrower=self.borrower,
            document_type=BorrowerDocument.DocumentType.PAN,
            document="docs/pan.jpg"
        )
        BorrowerDocument.objects.create(
            borrower=self.borrower,
            document_type=BorrowerDocument.DocumentType.BANK_STATEMENT,
            document="docs/bank.pdf"
        )

        verif = self.engine.evaluate(self.borrower, {"digilocker_consent": True})
        self.assertEqual(verif.verification_status, BorrowerVerification.VerificationStatus.VERIFIED)
        self.assertGreaterEqual(verif.confidence_score, 75)
        self.assertEqual(verif.identity_match, BorrowerVerification.IdentityMatchStatus.MATCH)
        self.assertEqual(verif.document_status, BorrowerVerification.DocumentStatus.COMPLETE)
        self.assertGreaterEqual(len(verif.explanation), 3)

    def test_identity_minor_mismatch(self):
        self.borrower.name_as_per_pan = "R. Sharma"
        self.borrower.name_as_per_aadhaar = "Rahul Sharma"
        self.borrower.save()

        verif = self.engine.evaluate(self.borrower)
        self.assertEqual(verif.identity_match, BorrowerVerification.IdentityMatchStatus.PARTIAL_MATCH)
        self.assertEqual(verif.consistency_status, BorrowerVerification.ConsistencyStatus.MINOR_MISMATCH)
        flag_types = [f["type"] for f in verif.flags]
        self.assertIn("NAME_MINOR_MISMATCH", flag_types)

    def test_identity_major_mismatch(self):
        self.borrower.name_as_per_pan = "Amit Kumar"
        self.borrower.name_as_per_aadhaar = "Suresh Patel"
        self.borrower.save()

        verif = self.engine.evaluate(self.borrower)
        self.assertEqual(verif.identity_match, BorrowerVerification.IdentityMatchStatus.MISMATCH)
        self.assertEqual(verif.consistency_status, BorrowerVerification.ConsistencyStatus.MAJOR_MISMATCH)
        self.assertEqual(verif.verification_status, BorrowerVerification.VerificationStatus.FAILED)
        flag_types = [f["type"] for f in verif.flags]
        self.assertIn("NAME_MAJOR_MISMATCH", flag_types)

    def test_missing_documents_flag(self):
        # No documents uploaded
        verif = self.engine.evaluate(self.borrower)
        self.assertEqual(verif.document_status, BorrowerVerification.DocumentStatus.MISSING)
        flag_types = [f["type"] for f in verif.flags]
        self.assertIn("NO_DOCUMENTS", flag_types)


class VerificationAPITests(TestCase):
    """End-to-End API Integration tests for the Borrower Verification Module."""

    def setUp(self):
        self.client = APIClient()

        # Create Borrower 1
        self.user1 = User.objects.create_user(
            email="borrower1@example.com",
            name="Priya Patel",
            password="securePassword123"
        )
        self.borrower1 = Borrower.objects.create(
            user=self.user1,
            name="Priya Patel",
            name_as_per_pan="Priya Patel",
            name_as_per_aadhaar="Priya Patel",
            pan_number="ABCDE9999Z",
            aadhaar_number="345678901234",
            phone_number="9123456780",
            amount_requested=50000,
        )

        # Create Borrower 2 for isolation testing
        self.user2 = User.objects.create_user(
            email="borrower2@example.com",
            name="Vikram Singh",
            password="securePassword456"
        )
        self.borrower2 = Borrower.objects.create(
            user=self.user2,
            name="Vikram Singh",
            pan_number="FGHIJ5678K",
            aadhaar_number="456789012345",
            phone_number="9988776655",
            amount_requested=20000,
        )

    def test_unauthorized_access(self):
        """Unauthenticated requests must be rejected with 401."""
        res_start = self.client.post("/api/borrower/verification/start/")
        self.assertEqual(res_start.status_code, status.HTTP_401_UNAUTHORIZED)

        res_status = self.client.get("/api/borrower/verification/status/")
        self.assertEqual(res_status.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_verification_start_authenticated(self):
        """Authenticated borrower can start verification session."""
        self.client.force_authenticate(user=self.user1)
        res = self.client.post("/api/borrower/verification/start/", {"method": "HYBRID"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["session"]["status"], "PENDING")
        self.assertIn("instructions", res.data)

    def test_verification_submit_and_result(self):
        """Submitting valid verification data returns VERIFIED and updates status."""
        self.client.force_authenticate(user=self.user1)

        # Start session
        self.client.post("/api/borrower/verification/start/")

        # Upload required documents
        BorrowerDocument.objects.create(
            borrower=self.borrower1,
            document_type=BorrowerDocument.DocumentType.AADHAAR,
            document="docs/aadhaar.pdf"
        )
        BorrowerDocument.objects.create(
            borrower=self.borrower1,
            document_type=BorrowerDocument.DocumentType.PAN,
            document="docs/pan.jpg"
        )

        # Submit verification data
        submit_payload = {
            "method": "DIGILOCKER",
            "pan_number": "ABCDE9999Z",
            "aadhaar_number": "345678901234",
            "name_as_per_pan": "Priya Patel",
            "name_as_per_aadhaar": "Priya Patel",
            "digilocker_consent": True,
        }
        res_submit = self.client.post("/api/borrower/verification/submit/", submit_payload)
        self.assertEqual(res_submit.status_code, status.HTTP_200_OK)
        self.assertEqual(res_submit.data["status"], "VERIFIED")
        self.assertGreaterEqual(res_submit.data["verification_confidence"], 75)
        self.assertEqual(res_submit.data["masked_aadhaar"], "XXXX-XXXX-1234")
        self.assertEqual(res_submit.data["masked_pan"], "ABXXXXX99Z")

        # Check GET /status/
        res_status = self.client.get("/api/borrower/verification/status/")
        self.assertEqual(res_status.status_code, status.HTTP_200_OK)
        self.assertEqual(res_status.data["status"], "VERIFIED")

        # Check GET /result/
        res_result = self.client.get("/api/borrower/verification/result/")
        self.assertEqual(res_result.status_code, status.HTTP_200_OK)
        self.assertEqual(res_result.data["status"], "VERIFIED")
        self.assertIsInstance(res_result.data["explanation"], list)
        self.assertGreater(len(res_result.data["explanation"]), 0)

    def test_borrower_isolation(self):
        """Borrower 2 cannot see Borrower 1's verification result."""
        # Create verification for Borrower 1
        BorrowerVerification.objects.create(
            borrower=self.borrower1,
            verification_status=BorrowerVerification.VerificationStatus.VERIFIED,
            confidence_score=85,
        )

        # Authenticate as Borrower 2 (has no verification)
        self.client.force_authenticate(user=self.user2)
        res = self.client.get("/api/borrower/verification/result/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("No verification record found", res.data["detail"])
