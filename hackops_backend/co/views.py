import logging

from django.db.models import Q
from borrower.models import Borrower, BorrowerDocument
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DocumentProcessing
from .permissions import CompanyOnlyPermission
from .serializers import (
	BorrowerDocumentIngestionSerializer,
	CompanyBorrowerDetailSerializer,
	CompanyBorrowerListSerializer,
	CompanyDocumentSerializer,
	DocumentProcessingSerializer,
)
from .services.document_processing import process_borrower_document

logger = logging.getLogger(__name__)


class CompanyBorrowerListView(APIView):
	permission_classes = [CompanyOnlyPermission]

	def get(self, request):
		borrowers = Borrower.objects.exclude(
			application_status=Borrower.ApplicationStatus.DRAFT
		).select_related("user").order_by("-submitted_at", "-updated_at")

		application_status = request.query_params.get("application_status")
		if application_status:
			borrowers = borrowers.filter(application_status=application_status)

		search = request.query_params.get("search")
		if search:
			borrowers = borrowers.filter(
				Q(name__icontains=search)
				| Q(pan_number__icontains=search)
				| Q(user__email__icontains=search)
			)

		serializer = CompanyBorrowerListSerializer(borrowers, many=True)
		return Response(serializer.data, status=status.HTTP_200_OK)


class CompanyBorrowerDetailView(APIView):
	permission_classes = [CompanyOnlyPermission]

	def get(self, request, borrower_id):
		try:
			borrower = Borrower.objects.exclude(
				application_status=Borrower.ApplicationStatus.DRAFT
			).select_related("user").prefetch_related(
				"documents__processing"
			).get(pk=borrower_id)
		except Borrower.DoesNotExist:
			return Response(
				{"detail": "Borrower not found."},
				status=status.HTTP_404_NOT_FOUND,
			)

		serializer = CompanyBorrowerDetailSerializer(
			borrower,
			context={"request": request},
		)
		return Response(serializer.data, status=status.HTTP_200_OK)


class CompanyBorrowerDocumentsView(APIView):
	permission_classes = [CompanyOnlyPermission]

	def get(self, request, borrower_id):
		try:
			borrower = Borrower.objects.exclude(
				application_status=Borrower.ApplicationStatus.DRAFT
			).get(pk=borrower_id)
		except Borrower.DoesNotExist:
			return Response(
				{"detail": "Borrower not found."},
				status=status.HTTP_404_NOT_FOUND,
			)

		documents = borrower.documents.all().prefetch_related("processing")
		serializer = CompanyDocumentSerializer(
			documents,
			many=True,
			context={"request": request},
		)
		return Response(serializer.data, status=status.HTTP_200_OK)


class BorrowerDocumentListView(APIView):
	permission_classes = [CompanyOnlyPermission]

	def get(self, request):
		documents = BorrowerDocument.objects.exclude(
			borrower__application_status=Borrower.ApplicationStatus.DRAFT
		).select_related("borrower").order_by("-uploaded_at")
		serializer = BorrowerDocumentIngestionSerializer(
			documents,
			many=True,
			context={"request": request},
		)
		return Response(serializer.data, status=status.HTTP_200_OK)


class DocumentProcessView(APIView):
	permission_classes = [CompanyOnlyPermission]

	def post(self, request, document_id):
		try:
			document = BorrowerDocument.objects.select_related("borrower").get(
			pk=document_id
		)
		except BorrowerDocument.DoesNotExist:
			return Response(
				{"detail": "Borrower document not found."},
				status=status.HTTP_404_NOT_FOUND,
			)

		if document.borrower.application_status == Borrower.ApplicationStatus.DRAFT:
			return Response(
				{"detail": "Only submitted borrower documents are available."},
				status=status.HTTP_403_FORBIDDEN,
			)

		try:
			processing, result = process_borrower_document(document)
		except Exception as exc:
			logger.error(
				"Document processing failed for %s: %s",
				document.pk,
				exc,
			)
			processing = DocumentProcessing.objects.get(document=document)
			return Response(
				DocumentProcessingSerializer(processing).data,
				status=status.HTTP_422_UNPROCESSABLE_ENTITY,
			)

		response_data = DocumentProcessingSerializer(processing).data
		response_data["page_count"] = result["page_count"]
		response_data["source_type"] = result["source_type"]
		return Response(response_data, status=status.HTTP_200_OK)

	def get(self, request, document_id):
		try:
			processing = DocumentProcessing.objects.select_related(
				"document",
				"document__borrower",
			).get(
				document_id=document_id
			)
		except DocumentProcessing.DoesNotExist:
			return Response(
				{"detail": "Processing record not found."},
				status=status.HTTP_404_NOT_FOUND,
			)

		if (
			processing.document.borrower.application_status
			== Borrower.ApplicationStatus.DRAFT
		):
			return Response(
				{"detail": "Only submitted borrower documents are available."},
				status=status.HTTP_403_FORBIDDEN,
			)

		return Response(
			DocumentProcessingSerializer(processing).data,
			status=status.HTTP_200_OK,
		)


class CompanyBorrowerValidateView(APIView):
	permission_classes = [CompanyOnlyPermission]

	def post(self, request, borrower_id):
		try:
			borrower = Borrower.objects.get(pk=borrower_id)
		except Borrower.DoesNotExist:
			return Response(
				{"detail": "Borrower not found."},
				status=status.HTTP_404_NOT_FOUND,
			)

		action = request.data.get("action", "").upper()
		notes = request.data.get("notes", "")
		verification_status = request.data.get("verification_status")
		application_status = request.data.get("application_status")

		from borrower.models import BorrowerVerification

		verification = borrower.verifications.order_by("-updated_at").first()
		if not verification:
			verification = BorrowerVerification.objects.create(
				borrower=borrower,
				verification_status=BorrowerVerification.VerificationStatus.PENDING,
			)

		if action == "VERIFY":
			borrower.application_status = Borrower.ApplicationStatus.VERIFIED
			verification.verification_status = BorrowerVerification.VerificationStatus.VERIFIED
			borrower.documents.filter(
				verification_status__in=[
					BorrowerDocument.VerificationStatus.PENDING,
					BorrowerDocument.VerificationStatus.PROCESSING,
				]
			).update(verification_status=BorrowerDocument.VerificationStatus.VERIFIED)
		elif action == "REVERIFY":
			borrower.application_status = Borrower.ApplicationStatus.REVERIFICATION
			verification.verification_status = BorrowerVerification.VerificationStatus.REVERIFICATION
			borrower.documents.filter(
				verification_status=BorrowerDocument.VerificationStatus.PENDING
			).update(verification_status=BorrowerDocument.VerificationStatus.REVERIFICATION)
		elif action == "REJECT":
			borrower.application_status = Borrower.ApplicationStatus.REJECTED
			verification.verification_status = BorrowerVerification.VerificationStatus.FAILED
		elif action == "APPROVE":
			borrower.application_status = Borrower.ApplicationStatus.APPROVED
			verification.verification_status = BorrowerVerification.VerificationStatus.VERIFIED

		if verification_status:
			verification.verification_status = verification_status
		if application_status:
			borrower.application_status = application_status

		if notes:
			explanations = list(verification.explanation or [])
			explanations.append(f"Admin validation note: {notes}")
			verification.explanation = explanations

		borrower.save(update_fields=["application_status", "updated_at"])
		verification.save()

		# Synchronize with LoanApplication for lender marketplace if verified or approved
		if borrower.application_status in [
			Borrower.ApplicationStatus.VERIFIED,
			Borrower.ApplicationStatus.APPROVED,
		]:
			from lender.models import LoanApplication
			loan_app, created = LoanApplication.objects.get_or_create(
				borrower=borrower.user,
				defaults={
					"amount_requested": borrower.amount_requested,
					"purpose": borrower.loan_purpose or "General Financing",
					"status": (
						"APPROVED"
						if borrower.application_status == Borrower.ApplicationStatus.APPROVED
						else "READY_FOR_LENDER"
					),
				},
			)
			if not created:
				if borrower.application_status == Borrower.ApplicationStatus.APPROVED:
					loan_app.status = "APPROVED"
				elif loan_app.status not in ["APPROVED", "REJECTED"]:
					loan_app.status = "READY_FOR_LENDER"
				loan_app.amount_requested = borrower.amount_requested
				loan_app.save(update_fields=["status", "amount_requested", "updated_at"])

		serializer = CompanyBorrowerDetailSerializer(
			borrower, context={"request": request}
		)
		return Response(
			{
				"message": f"Borrower application validated as {borrower.application_status}.",
				"borrower": serializer.data,
			},
			status=status.HTTP_200_OK,
		)
