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
    extracted_data = serializers.SerializerMethodField()
    ocr_confidence = serializers.SerializerMethodField()
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
            "extracted_name",
            "extracted_document_number",
            "extracted_date",
            "extracted_income",
            "verification_notes",
            "extracted_data",
            "ocr_confidence",
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

    def get_extracted_data(self, obj):
        processing = self._processing(obj)
        if not processing:
            return None
        return processing.extracted_data

    def get_ocr_confidence(self, obj):
        processing = self._processing(obj)
        if not processing or processing.ocr_confidence is None:
            return None
        return float(processing.ocr_confidence)

    def get_processed_at(self, obj):
        processing = self._processing(obj)
        return processing.processed_at if processing else None

    def get_processing_error(self, obj):
        processing = self._processing(obj)
        return processing.error_message if processing else None


class CompanyBorrowerListSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    trust_score = serializers.SerializerMethodField()
    risk_score = serializers.SerializerMethodField()
    fraud_score = serializers.SerializerMethodField()
    verification_status = serializers.SerializerMethodField()

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
            "verification_status",
            "submitted_at",
            "trust_score",
            "risk_score",
            "fraud_score",
        ]

    def get_verification_status(self, obj):
        v = obj.verifications.order_by("-updated_at").first()
        if v and v.verification_status:
            return v.verification_status
        docs = obj.documents.all()
        if not docs.exists():
            return "PENDING"
        if any(d.verification_status == "REVERIFICATION" for d in docs):
            return "REVERIFICATION"
        if any(d.verification_status == "REJECTED" for d in docs):
            return "REJECTED"
        if all(d.verification_status == "VERIFIED" for d in docs):
            return "VERIFIED"
        return "PENDING"

    def get_trust_score(self, obj):
        from lender.models import LoanApplication
        app = LoanApplication.objects.filter(borrower=obj.user).order_by("-created_at").first()
        if app and app.ai_trust_score:
            return app.ai_trust_score
        v = obj.verifications.order_by("-updated_at").first()
        if v and v.confidence_score:
            return v.confidence_score
        return None

    def get_risk_score(self, obj):
        from lender.models import LoanApplication
        app = LoanApplication.objects.filter(borrower=obj.user).order_by("-created_at").first()
        if app and app.ai_risk_level:
            return app.ai_risk_level
        return None

    def get_fraud_score(self, obj):
        v = obj.verifications.order_by("-updated_at").first()
        if v and v.flags:
            return len(v.flags)
        return 0


class CompanyBorrowerDetailSerializer(CompanyBorrowerListSerializer):
    documents = CompanyDocumentSerializer(many=True, read_only=True)
    verification = serializers.SerializerMethodField()
    loan_application = serializers.SerializerMethodField()
    decision_engine = serializers.SerializerMethodField()

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
            "verification",
            "loan_application",
            "decision_engine",
        ]

    def get_verification(self, obj):
        v = obj.verifications.order_by("-updated_at").first()
        if not v:
            return None
        return {
            "id": v.id,
            "identity_method": v.identity_method,
            "verification_status": v.verification_status,
            "identity_match": v.identity_match,
            "document_status": v.document_status,
            "consistency_status": v.consistency_status,
            "confidence_score": v.confidence_score,
            "flags": v.flags,
            "explanation": v.explanation,
            "provider": v.provider,
            "provider_reference": v.provider_reference,
            "details": v.details,
            "created_at": v.created_at,
            "updated_at": v.updated_at,
        }

    def get_loan_application(self, obj):
        from lender.models import LoanApplication
        app = LoanApplication.objects.filter(borrower=obj.user).order_by("-created_at").first()
        if not app:
            return None
        return {
            "id": app.id,
            "amount_requested": str(app.amount_requested),
            "purpose": app.purpose,
            "status": app.status,
            "ai_trust_score": app.ai_trust_score,
            "ai_risk_level": app.ai_risk_level,
            "ai_recommended_terms": app.ai_recommended_terms,
            "ai_risk_breakdown": app.ai_risk_breakdown,
            "decision_notes": app.decision_notes,
            "decided_at": app.decided_at,
            "created_at": app.created_at,
        }

    def get_decision_engine(self, obj):
        try:
            from lender.scoring import (
                calculate_layer2_trust_score,
                calculate_layer3_financial_score,
                calculate_layer4_decision,
            )
            trust_score, trust_breakdown = calculate_layer2_trust_score(obj)
            fin_score, risk_level, fin_breakdown = calculate_layer3_financial_score(obj)
            composite_score, decision_status, terms = calculate_layer4_decision(
                trust_score, fin_score, float(obj.amount_requested or 0)
            )
            return {
                "trust_score": trust_score,
                "trust_breakdown": trust_breakdown,
                "financial_score": fin_score,
                "risk_level": risk_level,
                "financial_breakdown": fin_breakdown,
                "composite_score": composite_score,
                "decision_status": decision_status,
                "recommended_terms": terms,
            }
        except Exception:
            return None
