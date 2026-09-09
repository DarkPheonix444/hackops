
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import Borrower, BorrowerDocument, BorrowerVerification
from .serializer import (
    BorrowerSerializer,
    BorrowerDocumentSerializer,
    BorrowerVerificationSerializer,
    VerificationSubmitSerializer,
)
from .verification import TrustLensVerificationEngine


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


class VerificationStartView(APIView):
    """
    POST /api/borrower/verification/start/
    Initiates or resets a verification session for the authenticated borrower.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            borrower = request.user.borrower_profile
        except Borrower.DoesNotExist:
            return Response(
                {"detail": "Borrower profile not found. Please create a borrower profile first."},
                status=status.HTTP_404_NOT_FOUND
            )

        method = request.data.get("method", BorrowerVerification.VerificationMethod.HYBRID)
        if method not in dict(BorrowerVerification.VerificationMethod.choices):
            method = BorrowerVerification.VerificationMethod.HYBRID

        # Retrieve latest pending or create initial verification draft
        latest = borrower.verifications.first()
        if latest and latest.verification_status == BorrowerVerification.VerificationStatus.PENDING:
            verification = latest
            verification.identity_method = method
            verification.save()
        else:
            verification = BorrowerVerification.objects.create(
                borrower=borrower,
                identity_method=method,
                verification_status=BorrowerVerification.VerificationStatus.PENDING,
                explanation=["Verification initiated. Waiting for document and identity data submission."],
                provider="MOCK",
                details={"environment": "DEMO", "session_started_at": timezone.now().isoformat()},
            )

        serializer = BorrowerVerificationSerializer(verification)
        return Response(
            {
                "message": "Verification session started.",
                "session": serializer.data,
                "environment": "DEMO",
                "instructions": [
                    "1. Connect DigiLocker (Demo) or submit PAN/Aadhaar details.",
                    "2. Upload required documents (Aadhaar, PAN, Bank Statement).",
                    "3. Submit for deterministic explainable verification.",
                ],
            },
            status=status.HTTP_200_OK
        )


class VerificationSubmitView(APIView):
    """
    POST /api/borrower/verification/submit/
    Submits identity details/documents to the TrustLens Verification Engine.
    Generates explainable verification results with confidence score and evidence reasons.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            borrower = request.user.borrower_profile
        except Borrower.DoesNotExist:
            return Response(
                {"detail": "Borrower profile not found. Please create a borrower profile first."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = VerificationSubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # Update borrower fields if supplied in payload
        if data.get("pan_number"):
            borrower.pan_number = data["pan_number"].strip().upper()
        if data.get("aadhaar_number"):
            borrower.aadhaar_number = data["aadhaar_number"].strip()
        if data.get("name_as_per_pan"):
            borrower.name_as_per_pan = data["name_as_per_pan"].strip()
        if data.get("name_as_per_aadhaar"):
            borrower.name_as_per_aadhaar = data["name_as_per_aadhaar"].strip()
        borrower.save()

        # Run TrustLens Verification Engine
        engine = TrustLensVerificationEngine()
        verification = engine.evaluate(borrower, payload=data)

        # Synchronize borrower application status
        if verification.verification_status == BorrowerVerification.VerificationStatus.VERIFIED:
            borrower.application_status = Borrower.ApplicationStatus.VERIFIED
        elif verification.verification_status == BorrowerVerification.VerificationStatus.NEEDS_REVIEW:
            borrower.application_status = Borrower.ApplicationStatus.UNDER_VERIFICATION
        else:
            borrower.application_status = Borrower.ApplicationStatus.REVERIFICATION
        borrower.save()

        # Bridge to Lender LoanApplication if amount requested > 0
        try:
            from lender.models import LoanApplication
            if borrower.amount_requested and borrower.amount_requested > 0:
                loan_app, _ = LoanApplication.objects.get_or_create(
                    borrower=request.user,
                    defaults={
                        "amount_requested": borrower.amount_requested,
                        "purpose": borrower.loan_purpose or "General Purpose",
                        "status": "DOCS_VERIFIED" if verification.verification_status == "VERIFIED" else "PENDING",
                    }
                )
                if verification.verification_status == "VERIFIED":
                    loan_app.status = "DOCS_VERIFIED"
                loan_app.save()
        except Exception:
            pass

        response_serializer = BorrowerVerificationSerializer(verification)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class VerificationStatusView(APIView):
    """
    GET /api/borrower/verification/status/
    Returns lightweight verification status and confidence score.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            borrower = request.user.borrower_profile
        except Borrower.DoesNotExist:
            return Response(
                {"detail": "Borrower profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        verification = borrower.verifications.first()
        if not verification:
            return Response(
                {
                    "status": "NOT_STARTED",
                    "verification_confidence": 0,
                    "identity_match": "NOT_AVAILABLE",
                    "document_status": "MISSING",
                    "message": "No verification session found for this borrower.",
                },
                status=status.HTTP_200_OK
            )

        return Response(
            {
                "id": verification.id,
                "status": verification.verification_status,
                "verification_confidence": verification.confidence_score,
                "identity_match": verification.identity_match,
                "document_status": verification.document_status,
                "consistency_status": verification.consistency_status,
                "provider": verification.provider,
                "flags_count": len(verification.flags),
                "updated_at": verification.updated_at,
            },
            status=status.HTTP_200_OK
        )


class VerificationResultView(APIView):
    """
    GET /api/borrower/verification/result/
    Returns complete explainable verification result with evidence bullet points and flags.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            borrower = request.user.borrower_profile
        except Borrower.DoesNotExist:
            return Response(
                {"detail": "Borrower profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        verification = borrower.verifications.first()
        if not verification:
            return Response(
                {"detail": "No verification record found. Please start and submit verification first."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = BorrowerVerificationSerializer(verification)
        return Response(serializer.data, status=status.HTTP_200_OK)

