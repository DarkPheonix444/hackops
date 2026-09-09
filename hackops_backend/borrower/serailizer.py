from rest_framework import serializers
from .models import Borrower, BorrowerDocument


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

