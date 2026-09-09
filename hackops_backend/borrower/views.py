
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import Borrower, BorrowerDocument
from .serializer import (
    BorrowerSerializer,
    BorrowerDocumentSerializer,
)


class BorrowerProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):

        try:
            borrower = request.user.borrower_profile
        except Borrower.DoesNotExist:
            return Response(
                {"detail": "Borrower profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = BorrowerSerializer(borrower)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    def post(self, request):

        if hasattr(request.user, "borrower_profile"):
            return Response(
                {"detail": "Borrower profile already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = BorrowerSerializer(data=request.data)

        if serializer.is_valid():
            borrower = serializer.save(user=request.user)

            return Response(
                BorrowerSerializer(borrower).data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def patch(self, request):

        try:
            borrower = request.user.borrower_profile
        except Borrower.DoesNotExist:
            return Response(
                {"detail": "Borrower profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Don't allow borrower to modify a frozen application
        if borrower.application_status in [
            Borrower.ApplicationStatus.FROZEN,
            Borrower.ApplicationStatus.UNDER_VERIFICATION,
            Borrower.ApplicationStatus.VERIFIED,
            Borrower.ApplicationStatus.RISK_ASSESSMENT,
            Borrower.ApplicationStatus.COMPLETED,
        ]:
            return Response(
                {
                    "detail": "Application is frozen and cannot be modified."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = BorrowerSerializer(
            borrower,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()

            return Response(
                serializer.data,
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class BorrowerDocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):

        try:
            borrower = request.user.borrower_profile
        except Borrower.DoesNotExist:
            return Response(
                {"detail": "Borrower profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        documents = borrower.documents.all()

        serializer = BorrowerDocumentSerializer(
            documents,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    def post(self, request):

        try:
            borrower = request.user.borrower_profile
        except Borrower.DoesNotExist:
            return Response(
                {"detail": "Borrower profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Don't allow documents to be changed after submission
        if borrower.application_status != Borrower.ApplicationStatus.DRAFT:
            return Response(
                {
                    "detail": (
                        "Application has already been submitted. "
                        "Documents cannot be uploaded."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = BorrowerDocumentSerializer(
            data=request.data
        )

        if serializer.is_valid():
            document = serializer.save(
                borrower=borrower
            )

            return Response(
                BorrowerDocumentSerializer(document).data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class SubmitBorrowerApplicationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):

        try:
            borrower = request.user.borrower_profile
        except Borrower.DoesNotExist:
            return Response(
                {"detail": "Borrower profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if borrower.application_status != Borrower.ApplicationStatus.DRAFT:
            return Response(
                {
                    "detail": "Application has already been submitted."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        documents = borrower.documents.all()

        required_documents = {
            BorrowerDocument.DocumentType.AADHAAR,
            BorrowerDocument.DocumentType.PAN,
            BorrowerDocument.DocumentType.ITR,
            BorrowerDocument.DocumentType.INCOME_COMPUTATION,
            BorrowerDocument.DocumentType.BANK_STATEMENT,
        }

        uploaded_documents = set(
            documents.values_list(
                "document_type",
                flat=True
            )
        )

        missing_documents = required_documents - uploaded_documents

        if missing_documents:
            return Response(
                {
                    "detail": "Required documents are missing.",
                    "missing_documents": list(missing_documents),
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        borrower.application_status = (
            Borrower.ApplicationStatus.FROZEN
        )

        borrower.submitted_at = timezone.now()
        borrower.frozen_at = timezone.now()

        borrower.save()

        return Response(
            {
                "message": "Application submitted successfully.",
                "application_status": borrower.application_status,
                "submitted_at": borrower.submitted_at,
                "frozen_at": borrower.frozen_at,
            },
            status=status.HTTP_200_OK
        )
