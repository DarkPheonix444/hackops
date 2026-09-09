from rest_framework import serializers
from .models import Borrower, BorrowerDocument, BorrowerVerification


class BorrowerSerializer(serializers.ModelSerializer):

    class Meta:
        model = Borrower
        fields = "__all__"
        read_only_fields = [
            "user",
            "application_status",
            "submitted_at",
            "frozen_at",
            "created_at",
            "updated_at",
        ]


class BorrowerDocumentSerializer(serializers.ModelSerializer):

    class Meta:
        model = BorrowerDocument
        fields = "__all__"
        read_only_fields = [
            "borrower",
            "verification_status",
            "extracted_name",
            "extracted_document_number",
            "extracted_date",
            "extracted_income",
            "verification_notes",
            "verified_at",
            "uploaded_at",
        ]


class BorrowerVerificationSerializer(serializers.ModelSerializer):
    status = serializers.CharField(source="verification_status", read_only=True)
    verification_confidence = serializers.IntegerField(source="confidence_score", read_only=True)
    masked_aadhaar = serializers.ReadOnlyField()
    masked_pan = serializers.ReadOnlyField()

    class Meta:
        model = BorrowerVerification
        fields = [
            "id",
            "identity_method",
            "status",
            "verification_confidence",
            "identity_match",
            "document_status",
            "consistency_status",
            "provider",
            "provider_reference",
            "flags",
            "explanation",
            "masked_aadhaar",
            "masked_pan",
            "details",
            "created_at",
            "updated_at",
        ]


class VerificationSubmitSerializer(serializers.Serializer):
    method = serializers.ChoiceField(
        choices=BorrowerVerification.VerificationMethod.choices,
        default=BorrowerVerification.VerificationMethod.HYBRID
    )
    pan_number = serializers.CharField(max_length=10, required=False, allow_blank=True)
    aadhaar_number = serializers.CharField(max_length=14, required=False, allow_blank=True)
    name_as_per_pan = serializers.CharField(max_length=150, required=False, allow_blank=True)
    name_as_per_aadhaar = serializers.CharField(max_length=150, required=False, allow_blank=True)
    digilocker_consent = serializers.BooleanField(required=False, default=False)

