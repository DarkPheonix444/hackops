# pyrefly: ignore [missing-import]
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import LenderProfile, LoanApplication

User = get_user_model()


class LenderUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'name']


class LenderProfileSerializer(serializers.ModelSerializer):
    user = LenderUserSerializer(read_only=True)

    class Meta:
        model = LenderProfile
        fields = [
            'id',
            'user',
            'company_name',
            'available_funds',
            'risk_tolerance',
            'created_at',
            'updated_at',
        ]


class VerifiedLoanApplicationSerializer(serializers.ModelSerializer):
    borrower = LenderUserSerializer(read_only=True)
    lender = LenderUserSerializer(read_only=True)
    verification = serializers.SerializerMethodField()

    class Meta:
        model = LoanApplication
        fields = [
            'id',
            'borrower',
            'lender',
            'amount_requested',
            'purpose',
            'status',
            'verification',
            'ai_trust_score',
            'ai_risk_level',
            'ai_recommended_terms',
            'ai_risk_breakdown',
            'decision_notes',
            'decided_at',
            'created_at',
            'updated_at',
        ]

    def get_verification(self, obj):
        try:
            borrower_profile = getattr(obj.borrower, 'borrower_profile', None)
            if borrower_profile:
                verif = borrower_profile.verifications.first()
                if verif:
                    return {
                        "status": verif.verification_status,
                        "confidence": verif.confidence_score,
                        "identity_match": verif.identity_match,
                        "document_status": verif.document_status,
                        "consistency_status": verif.consistency_status,
                        "provider": verif.provider,
                        "masked_aadhaar": verif.masked_aadhaar,
                        "masked_pan": verif.masked_pan,
                        "explanation": verif.explanation,
                        "flags": verif.flags,
                    }
        except Exception:
            pass
        return None


class LenderDecisionSerializer(serializers.Serializer):
    ACTION_CHOICES = ['APPROVE', 'REJECT']

    action = serializers.ChoiceField(choices=ACTION_CHOICES)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
