from django.test import TestCase
from datetime import date
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from borrower.models import Borrower, BorrowerDocument, BorrowerVerification
from lender.models import LenderProfile
from .services.extraction import extract_document_data
from .services.identity_matching import (
	apply_identity_name_check,
	compare_identity_dobs,
	compare_identity_names,
)
from .models import DocumentProcessing

User = get_user_model()


class DocumentExtractionTests(TestCase):
	def test_pan_extraction(self):
		result = extract_document_data(
			"PAN",
			"Name: Rahul Sharma\nPAN: abcde1234f",
		)

		self.assertEqual(
			result,
			{
				"document_type": "PAN",
				"fields": {
					"name": "RAHUL SHARMA",
					"pan": "ABCDE1234F",
				},
			},
		)

	def test_bank_statement_extraction(self):
		result = extract_document_data(
			"BANK_STATEMENT",
			"Account Holder: Rahul Sharma\n"
			"Account Number: 1234567890\n"
			"01/01/2026 Salary 1000 Credit\n"
			"02/01/2026 Rent 250 Debit",
		)

		self.assertEqual(result["fields"]["account_holder_name"], "RAHUL SHARMA")
		self.assertEqual(result["fields"]["account_number"], "1234567890")
		self.assertEqual(result["fields"]["total_credits"], 1000.0)
		self.assertEqual(result["fields"]["average_credit"], 1000.0)
		self.assertEqual(len(result["fields"]["transaction_rows"]), 2)

	def test_pan_dob_extraction(self):
		result = extract_document_data(
			"PAN",
			"Name: Rahul Sharma\nPAN: ABCDE1234F\nDate of Birth: 15/08/1995",
		)

		self.assertEqual(result["fields"]["date_of_birth"], "15/08/1995")


class IdentityNameMatchingTests(TestCase):
	def test_matching_dobs_are_not_flagged(self):
		result = compare_identity_dobs(
			date(1995, 8, 15),
			"15/08/1995",
			"1995-08-15",
		)

		self.assertEqual(result["status"], "MATCH")
		self.assertIsNone(result["flag"])

	def test_mismatching_dobs_are_flagged(self):
		result = compare_identity_dobs(
			date(1995, 8, 15),
			"16/08/1995",
			"15/08/1995",
		)

		self.assertEqual(result["status"], "MISMATCH")
		self.assertEqual(result["flag"]["type"], "OCR_DOB_MISMATCH")

	def test_matching_names_are_not_flagged(self):
		result = compare_identity_names(
			"Rahul Sharma",
			"SHARMA RAHUL",
			"Rahul Sharma",
		)

		self.assertEqual(result["status"], "MATCH")
		self.assertIsNone(result["flag"])

	def test_mismatching_names_create_review_flag(self):
		user = User.objects.create_user(
			email="identity@example.com",
			name="Rahul Sharma",
			password="testpassword123",
		)
		borrower = Borrower.objects.create(
			user=user,
			name="Rahul Sharma",
			aadhaar_number="234567890123",
			pan_number="ABCDE1234F",
			phone_number="9876543210",
		)
		pan_document = BorrowerDocument.objects.create(
			borrower=borrower,
			document_type=BorrowerDocument.DocumentType.PAN,
			document="docs/pan.jpg",
		)
		aadhaar_document = BorrowerDocument.objects.create(
			borrower=borrower,
			document_type=BorrowerDocument.DocumentType.AADHAAR,
			document="docs/aadhaar.jpg",
		)
		pan_processing = DocumentProcessing.objects.create(
			document=pan_document,
			status=DocumentProcessing.Status.COMPLETED,
			extracted_data={"fields": {"name": "Amit Kumar"}},
		)
		aadhaar_processing = DocumentProcessing.objects.create(
			document=aadhaar_document,
			status=DocumentProcessing.Status.COMPLETED,
			extracted_data={"fields": {"name": "Rahul Sharma"}},
		)

		result = apply_identity_name_check(
			borrower,
			[pan_processing, aadhaar_processing],
		)

		verification = borrower.verifications.first()
		self.assertEqual(result["status"], "MISMATCH")
		self.assertEqual(
			verification.verification_status,
			BorrowerVerification.VerificationStatus.NEEDS_REVIEW,
		)
		self.assertIn(
			"OCR_NAME_MAJOR_MISMATCH",
			[flag["type"] for flag in verification.flags],
		)


class CompanyDashboardAPITests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.borrower_user = User.objects.create_user(
			email="borrower@example.com",
			name="Rahul Sharma",
			password="testpassword123",
		)
		self.borrower = Borrower.objects.create(
			user=self.borrower_user,
			name="Rahul Sharma",
			aadhaar_number="234567890123",
			pan_number="ABCDE1234F",
			phone_number="9876543210",
			application_status=Borrower.ApplicationStatus.FROZEN,
		)
		self.document = BorrowerDocument.objects.create(
			borrower=self.borrower,
			document_type=BorrowerDocument.DocumentType.PAN,
			document=SimpleUploadedFile("pan.jpg", b"image-bytes"),
		)
		DocumentProcessing.objects.create(
			document=self.document,
			status=DocumentProcessing.Status.COMPLETED,
			raw_ocr_text="Name: Rahul Sharma",
		)
		self.company_user = User.objects.create_user(
			email="company@example.com",
			name="Company User",
			password="testpassword123",
		)
		LenderProfile.objects.create(user=self.company_user)

	def test_borrower_cannot_access_company_dashboard(self):
		self.client.force_authenticate(user=self.borrower_user)
		response = self.client.get("/api/co/borrowers/")
		self.assertEqual(response.status_code, 403)

	def test_company_can_view_borrower_and_document_data(self):
		self.client.force_authenticate(user=self.company_user)

		list_response = self.client.get("/api/co/borrowers/")
		self.assertEqual(list_response.status_code, 200)
		self.assertEqual(list_response.data[0]["email"], "borrower@example.com")

		detail_response = self.client.get(
			f"/api/co/borrowers/{self.borrower.id}/"
		)
		self.assertEqual(detail_response.status_code, 200)
		document_data = detail_response.data["documents"][0]
		self.assertEqual(document_data["ocr_status"], "COMPLETED")
		self.assertEqual(document_data["raw_ocr_text"], "Name: Rahul Sharma")
		self.assertTrue(document_data["document_url"].endswith("/media/borrower_documents/pan.jpg"))

		documents_response = self.client.get(
			f"/api/co/borrowers/{self.borrower.id}/documents/"
		)
		self.assertEqual(documents_response.status_code, 200)
		self.assertEqual(len(documents_response.data), 1)
