from borrower.models import Borrower, BorrowerDocument
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DocumentProcessing
from .permissions import CompanyOnlyPermission
from .serializers import (
	BorrowerDocumentIngestionSerializer,
	DocumentProcessingSerializer,
)


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

		processing, created = DocumentProcessing.objects.get_or_create(
			document=document,
		)
		return Response(
			DocumentProcessingSerializer(processing).data,
			status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
		)

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
