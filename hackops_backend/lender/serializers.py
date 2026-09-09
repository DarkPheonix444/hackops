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

    class Meta:
        model = LoanApplication
        fields = [
            'id',
            'borrower',
            'lender',
            'amount_requested',
            'purpose',
            'status',
            'ai_trust_score',
            'ai_risk_level',
            'ai_recommended_terms',
            'ai_risk_breakdown',
            'decision_notes',
            'decided_at',
            'created_at',
            'updated_at',
        ]


class LenderDecisionSerializer(serializers.Serializer):
    ACTION_CHOICES = ['APPROVE', 'REJECT']

    action = serializers.ChoiceField(choices=ACTION_CHOICES)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
