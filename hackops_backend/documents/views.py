import logging

from rest_framework import generics, permissions, parsers, serializers
from rest_framework.response import Response

from .models import Document
from .serializers import DocumentSerializer
from .permissions import IsBorrower, IsLender

logger = logging.getLogger(__name__)


# Document type groupings per user role
COMMON_DOCUMENT_TYPES = [
    Document.DocumentType.AADHAAR,
    Document.DocumentType.PAN,
    Document.DocumentType.ADDRESS_PROOF,
    Document.DocumentType.PHOTOGRAPH,
    Document.DocumentType.BANK_STATEMENT,
    Document.DocumentType.BANK_ACCOUNT_PROOF,
]

BORROWER_DOCUMENT_TYPES = [
    Document.DocumentType.SALARY_SLIP,
    Document.DocumentType.FORM_16,
    Document.DocumentType.ITR,
    Document.DocumentType.EMPLOYMENT_PROOF,
    Document.DocumentType.EXISTING_LOAN_STATEMENT,
    Document.DocumentType.LOAN_REPAYMENT_HISTORY,
]

LENDER_DOCUMENT_TYPES = [
    Document.DocumentType.INCOME_PROOF,
    Document.DocumentType.SOURCE_OF_FUNDS_PROOF,
    Document.DocumentType.ASSET_NET_WORTH_PROOF,
    Document.DocumentType.LENDER_EMPLOYMENT_BUSINESS_PROOF,
]


class DocumentListCreateView(generics.ListCreateAPIView):
    """API endpoint that allows authenticated users to list and upload documents.

    GET: Returns only the authenticated user's documents, ordered by uploaded_at (desc).
    POST: Uploads a new document, automatically assigning ownership to request.user.
    """

    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def get_queryset(self):
        """Return only documents belonging to the authenticated user."""
        return Document.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Save the document with the authenticated user as owner.

        The frontend must NOT supply a user ID; we always use request.user.
        """
        serializer.save(user=self.request.user)


class CommonDocumentView(generics.ListCreateAPIView):
    """GET/list and POST upload common documents for any authenticated user.

    GET returns only the authenticated user's common documents.
    POST accepts only common document types; returns HTTP 400 for disallowed types.
    """

    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def get_queryset(self):
        return Document.objects.filter(
            user=self.request.user,
            document_type__in=COMMON_DOCUMENT_TYPES,
        )

    def perform_create(self, serializer):
        document_type = serializer.validated_data.get('document_type')
        if document_type not in COMMON_DOCUMENT_TYPES:
            raise serializers.ValidationError(
                {'document_type': 'This document type is not allowed for common documents.'}
            )
        serializer.save(user=self.request.user)


class BorrowerDocumentView(generics.ListCreateAPIView):
    """GET/list and POST upload borrower-specific documents.

    Accessible only to authenticated users with role == "borrower".
    GET returns only the authenticated user's borrower-specific documents.
    POST accepts only borrower-specific document types; returns HTTP 400 for disallowed types.
    HTTP 403 if authenticated user's role is not "borrower".
    """

    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated, IsBorrower]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def get_queryset(self):
        return Document.objects.filter(
            user=self.request.user,
            document_type__in=BORROWER_DOCUMENT_TYPES,
        )

    def perform_create(self, serializer):
        document_type = serializer.validated_data.get('document_type')
        if document_type not in BORROWER_DOCUMENT_TYPES:
            raise serializers.ValidationError(
                {'document_type': 'This document type is not allowed for borrower documents.'}
            )
        serializer.save(user=self.request.user)


class LenderDocumentView(generics.ListCreateAPIView):
    """GET/list and POST upload lender-specific documents.

    Accessible only to authenticated users with role == "lender".
    GET returns only the authenticated user's lender-specific documents.
    POST accepts only lender-specific document types; returns HTTP 400 for disallowed types.
    HTTP 403 if authenticated user's role is not "lender".
    """

    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated, IsLender]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def get_queryset(self):
        return Document.objects.filter(
            user=self.request.user,
            document_type__in=LENDER_DOCUMENT_TYPES,
        )

    def perform_create(self, serializer):
        document_type = serializer.validated_data.get('document_type')
        if document_type not in LENDER_DOCUMENT_TYPES:
            raise serializers.ValidationError(
                {'document_type': 'This document type is not allowed for lender documents.'}
            )
        serializer.save(user=self.request.user)