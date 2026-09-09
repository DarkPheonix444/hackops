from django.test import TestCase
from datetime import date
from django.contrib.auth import get_user_model

from borrower.models import Borrower, BorrowerDocument, BorrowerVerification
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
