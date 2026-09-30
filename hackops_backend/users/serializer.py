from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import CommonProfile

User = get_user_model()


class signupserializer(serializers.ModelSerializer):
    password=serializers.CharField(write_only=True,min_length=8)
    role=serializers.ChoiceField(choices=['borrower', 'lender'], default='borrower')

    class Meta:
        model=User
        fields=['email','name','password','role']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(
            email=validated_data.get('email'),
            password=password,
            name=validated_data.get('name'),
            role=validated_data.get('role', 'borrower'),
        )
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        data = super().validate(attrs)
        data["email"] = self.user.email
        data["name"] = self.user.name
        data["role"] = self.user.role
        data["is_staff"] = self.user.is_staff
        data["is_superuser"] = self.user.is_superuser
        return data


class CommonProfileSerializer(serializers.ModelSerializer):
    """
    Common onboarding information shared by borrower and lender users.
    The user relationship is read-only: the future view will associate the
    profile with request.user.
    """

    role = serializers.ChoiceField(choices=CommonProfile.ROLE_CHOICES)

    class Meta:
        model = CommonProfile
        fields = [
            # Role
            'role',
            # Personal Details
            'full_name',
            'date_of_birth',
            'gender',
            'phone_number',
            'alternate_phone_number',
            'marital_status',
            'nationality',
            # Family Details
            'father_name',
            'mother_name',
            'spouse_name',
            'number_of_dependents',
            # Income Details
            'employment_type',
            'occupation',
            'employer_or_business_name',
            'monthly_income',
            'annual_income',
            'years_of_experience',
            # Residential Details
            'address_line',
            'city',
            'state',
            'pincode',
            'residence_type',
            'years_at_current_address',
            # KYC Details
            'aadhaar_number',
            'pan_number',
        ]
        read_only_fields = ['user']


class BorrowerProfileSerializer(serializers.ModelSerializer):
    """
    Borrower-only onboarding information (bank, existing loans, assets, credit).
    Bank statement uploads are handled later by a separate document/upload layer.
    """

    class Meta:
        model = CommonProfile
        fields = [
            # Bank Details
            'bank_name',
            'account_number',
            'ifsc_code',
            # Existing Loan Details
            'has_existing_loan',
            'existing_monthly_emi',
            # Assets
            'total_asset_value',
            # Credit Information
            'credit_score',
        ]


class LenderProfileSerializer(serializers.ModelSerializer):
    """Lender-only onboarding information (lending capacity, bank, assets, preferences)."""

    class Meta:
        model = CommonProfile
        fields = [
            # Lending Capacity
            'amount_willing_to_lend',
            'minimum_lending_amount',
            'maximum_lending_amount',
            # Bank Details
            'lender_bank_name',
            'lender_account_number',
            'lender_ifsc_code',
            # Assets
            'lender_total_asset_value',
            # Lending Preferences
            'preferred_loan_type',
            'risk_preference',
        ]
