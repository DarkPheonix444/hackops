from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self.create_user(email, password=password, **extra_fields)


class User(AbstractUser):
    username=None
    email=models.EmailField(unique=True)
    name=models.CharField(max_length=255)
    role=models.CharField(
        max_length=20,
        choices=[('borrower', 'Borrower'), ('lender', 'Lender')],
        default='borrower',
    )

    objects = UserManager()

    USERNAME_FIELD='email'
    REQUIRED_FIELDS=[]

    def __str__(self):
        return self.email


class CommonProfile(models.Model):
    """
    Common profile shared by borrower and lender users.
    Fields are filled progressively across onboarding phases.
    """

    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]

    MARITAL_STATUS_CHOICES = [
        ('single', 'Single'),
        ('married', 'Married'),
        ('divorced', 'Divorced'),
        ('widowed', 'Widowed'),
    ]

    EMPLOYMENT_TYPE_CHOICES = [
        ('salaried', 'Salaried'),
        ('self_employed', 'Self Employed'),
        ('business', 'Business'),
        ('unemployed', 'Unemployed'),
        ('student', 'Student'),
    ]

    RESIDENCE_TYPE_CHOICES = [
        ('owned', 'Owned'),
        ('rented', 'Rented'),
        ('family', 'Family'),
        ('company_provided', 'Company Provided'),
    ]

    PREFERRED_LOAN_TYPE_CHOICES = [
        ('personal', 'Personal Loan'),
        ('home', 'Home Loan'),
        ('auto', 'Auto Loan'),
        ('education', 'Education Loan'),
        ('business', 'Business Loan'),
    ]

    RISK_PREFERENCE_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    ROLE_CHOICES = [
        ('borrower', 'Borrower'),
        ('lender', 'Lender'),
    ]

    # One-to-one link to the existing User model
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='common_profile',
    )

    # Role chosen by the user (collected in a later phase)
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='borrower',
    )

    # --- Personal Details ---
    full_name = models.CharField(max_length=255, null=False, blank=False)
    date_of_birth = models.DateField(null=False, blank=False)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, null=False, blank=False)
    phone_number = models.CharField(max_length=15, null=False, blank=False)
    alternate_phone_number = models.CharField(max_length=15, blank=True)
    marital_status = models.CharField(max_length=20, choices=MARITAL_STATUS_CHOICES, null=False, blank=False)
    nationality = models.CharField(max_length=100, null=False, blank=False)

    # --- Family Details ---
    father_name = models.CharField(max_length=255, null=False, blank=False)
    mother_name = models.CharField(max_length=255, null=False, blank=False)
    # Conditionally required: only when marital_status == 'married' (enforced in serializer)
    spouse_name = models.CharField(max_length=255, blank=True)
    number_of_dependents = models.PositiveIntegerField(default=0, null=False, blank=False)

    # --- Income / Employment Details ---
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPE_CHOICES, null=False, blank=False)
    occupation = models.CharField(max_length=255, null=False, blank=False)
    employer_or_business_name = models.CharField(max_length=255, null=False, blank=False)
    monthly_income = models.DecimalField(max_digits=12, decimal_places=2, null=False, blank=False)
    annual_income = models.DecimalField(max_digits=14, decimal_places=2, null=False, blank=False)
    years_of_experience = models.DecimalField(max_digits=4, decimal_places=1, null=False, blank=False)

    # --- Residential Details ---
    address_line = models.CharField(max_length=255, null=False, blank=False)
    city = models.CharField(max_length=100, null=False, blank=False)
    state = models.CharField(max_length=100, null=False, blank=False)
    pincode = models.CharField(max_length=6, null=False, blank=False)
    residence_type = models.CharField(max_length=20, choices=RESIDENCE_TYPE_CHOICES, null=False, blank=False)
    years_at_current_address = models.DecimalField(max_digits=4, decimal_places=1, null=False, blank=False)

    # --- KYC Details ---
    aadhaar_number = models.CharField(max_length=12, null=False, blank=False)
    pan_number = models.CharField(max_length=10, null=False, blank=False)

    # --- Borrower-specific Financial/Banking Details ---
    # Filled during borrower onboarding based on CommonProfile.role
    bank_name = models.CharField(max_length=255, null=False, blank=False)
    account_number = models.CharField(max_length=20, null=False, blank=False)
    ifsc_code = models.CharField(max_length=11, null=False, blank=False)
    has_existing_loan = models.BooleanField(default=False, null=False, blank=False)
    # Conditionally required: only when has_existing_loan is True (enforced in serializer)
    existing_monthly_emi = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    total_asset_value = models.DecimalField(max_digits=14, decimal_places=2, null=False, blank=False)
    # Credit verification is handled in a later layer; kept optional for now
    credit_score = models.IntegerField(null=True, blank=True)

    # --- Lender-specific Lending Details ---
    # Filled during lender onboarding based on CommonProfile.role
    amount_willing_to_lend = models.DecimalField(max_digits=14, decimal_places=2, null=False, blank=False)
    minimum_lending_amount = models.DecimalField(max_digits=14, decimal_places=2, null=False, blank=False)
    maximum_lending_amount = models.DecimalField(max_digits=14, decimal_places=2, null=False, blank=False)
    lender_total_asset_value = models.DecimalField(max_digits=14, decimal_places=2, null=False, blank=False)
    lender_bank_name = models.CharField(max_length=255, null=False, blank=False)
    lender_account_number = models.CharField(max_length=20, null=False, blank=False)
    lender_ifsc_code = models.CharField(max_length=11, null=False, blank=False)
    preferred_loan_type = models.CharField(max_length=20, choices=PREFERRED_LOAN_TYPE_CHOICES, null=False, blank=False)
    risk_preference = models.CharField(max_length=10, choices=RISK_PREFERENCE_CHOICES, null=False, blank=False)

    def __str__(self):
        return f"{self.full_name or self.user.email} ({self.role})"
