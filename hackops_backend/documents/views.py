import logging

from rest_framework import generics, permissions, parsers
from rest_framework.response import Response

from .models import Document
from .serializers import DocumentSerializer


logger = logging.getLogger(__name__)


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