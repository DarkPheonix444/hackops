from rest_framework import serializers

from borrower.models import BorrowerDocument
from .models import DocumentProcessing


class DocumentProcessingSerializer(serializers.ModelSerializer):
    document_id = serializers.IntegerField(source="document.id", read_only=True)

    class Meta:
        model = DocumentProcessing
        fields = [
            "id",
            "document_id",
            "raw_ocr_text",
            "extracted_data",
            "ocr_confidence",
            "status",
            "processed_at",
            "error_message",
            "created_at",
            "updated_at",
        ]


class BorrowerDocumentIngestionSerializer(serializers.ModelSerializer):
    borrower_id = serializers.IntegerField(source="borrower.id", read_only=True)
    borrower_name = serializers.CharField(source="borrower.name", read_only=True)
    processing = DocumentProcessingSerializer(read_only=True, allow_null=True)

    class Meta:
        model = BorrowerDocument
        fields = [
            "id",
            "borrower_id",
            "borrower_name",
            "document_type",
            "document",
            "verification_status",
            "uploaded_at",
            "processing",
        ]
        read_only_fields = fields
