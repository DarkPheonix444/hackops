from rest_framework import serializers

from borrower.models import Borrower, BorrowerDocument
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


class CompanyDocumentSerializer(serializers.ModelSerializer):
    document_url = serializers.SerializerMethodField()
    ocr_status = serializers.SerializerMethodField()
    raw_ocr_text = serializers.SerializerMethodField()
    processed_at = serializers.SerializerMethodField()
    processing_error = serializers.SerializerMethodField()

    class Meta:
        model = BorrowerDocument
        fields = [
            "id",
            "document_type",
            "document_url",
            "uploaded_at",
            "verification_status",
            "ocr_status",
            "raw_ocr_text",
            "processed_at",
            "processing_error",
        ]

    def _processing(self, obj):
        try:
            return obj.processing
        except DocumentProcessing.DoesNotExist:
            return None

    def get_document_url(self, obj):
        if not obj.document:
            return None
        url = obj.document.url
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request else url

    def get_ocr_status(self, obj):
        processing = self._processing(obj)
        return processing.status if processing else None

    def get_raw_ocr_text(self, obj):
        processing = self._processing(obj)
        if not processing or processing.status != DocumentProcessing.Status.COMPLETED:
            return None
        return processing.raw_ocr_text

    def get_processed_at(self, obj):
        processing = self._processing(obj)
        return processing.processed_at if processing else None

    def get_processing_error(self, obj):
        processing = self._processing(obj)
        return processing.error_message if processing else None


class CompanyBorrowerListSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    trust_score = serializers.IntegerField(read_only=True, allow_null=True, default=None)
    risk_score = serializers.IntegerField(read_only=True, allow_null=True, default=None)
    fraud_score = serializers.IntegerField(read_only=True, allow_null=True, default=None)

    class Meta:
        model = Borrower
        fields = [
            "id",
            "name",
            "email",
            "phone_number",
            "city",
            "state",
            "employment_type",
            "employer_or_business_name",
            "monthly_income",
            "annual_gross_income",
            "existing_monthly_obligations",
            "credit_score",
            "amount_requested",
            "loan_purpose",
            "requested_tenure_months",
            "repayment_frequency",
            "application_status",
            "submitted_at",
            "trust_score",
            "risk_score",
            "fraud_score",
        ]


class CompanyBorrowerDetailSerializer(CompanyBorrowerListSerializer):
    documents = CompanyDocumentSerializer(many=True, read_only=True)

    class Meta(CompanyBorrowerListSerializer.Meta):
        fields = CompanyBorrowerListSerializer.Meta.fields + [
            "name_as_per_aadhaar",
            "name_as_per_pan",
            "aadhaar_number",
            "pan_number",
            "date_of_birth",
            "address_line",
            "pincode",
            "cibil_score",
            "loan_purpose_details",
            "frozen_at",
            "updated_at",
            "documents",
        ]
