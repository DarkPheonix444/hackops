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

    def validate(self, attrs):
        # spouse_name is conditionally required: only for married users.
        # On partial updates, fall back to the stored profile values so a
        # married user who already provided a spouse_name can patch other
        # fields without resending it.
        marital_status = attrs.get('marital_status')
        if marital_status is None and self.instance is not None:
            marital_status = self.instance.marital_status
        if marital_status == 'married':
            spouse_name = attrs.get('spouse_name')
            if spouse_name is None and self.instance is not None:
                spouse_name = self.instance.spouse_name
            if not spouse_name:
                raise serializers.ValidationError({
                    'spouse_name': 'This field is required when marital_status is married.'
                })
        return attrs

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

    # Required in the request body: the model-level default=False would
    # otherwise make DRF treat this field as optional-with-default.
    has_existing_loan = serializers.BooleanField()

    def validate(self, attrs):
        # existing_monthly_emi is conditionally required: only when the
        # borrower has an existing loan. On partial updates, fall back to the
        # stored profile values so a borrower who already provided an EMI can
        # patch other fields without resending it.
        has_existing_loan = attrs.get('has_existing_loan')
        if has_existing_loan is None and self.instance is not None:
            has_existing_loan = self.instance.has_existing_loan
        if has_existing_loan:
            existing_monthly_emi = attrs.get('existing_monthly_emi')
            if existing_monthly_emi is None and self.instance is not None:
                existing_monthly_emi = self.instance.existing_monthly_emi
            if existing_monthly_emi is None:
                raise serializers.ValidationError({
                    'existing_monthly_emi': 'This field is required when has_existing_loan is True.'
                })
        return attrs

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
