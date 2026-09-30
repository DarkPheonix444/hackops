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
        return self.create_user(email, password, **extra_fields)


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
    full_name = models.CharField(max_length=255)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)
    phone_number = models.CharField(max_length=15, blank=True)
    alternate_phone_number = models.CharField(max_length=15, blank=True)
    marital_status = models.CharField(max_length=20, choices=MARITAL_STATUS_CHOICES, blank=True)
    nationality = models.CharField(max_length=100, blank=True)

    # --- Family Details ---
    father_name = models.CharField(max_length=255, blank=True)
    mother_name = models.CharField(max_length=255, blank=True)
    spouse_name = models.CharField(max_length=255, blank=True)
    number_of_dependents = models.PositiveIntegerField(default=0)

    # --- Income Details ---
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPE_CHOICES, blank=True)
    occupation = models.CharField(max_length=255, blank=True)
    employer_or_business_name = models.CharField(max_length=255, blank=True)
    monthly_income = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    annual_income = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    years_of_experience = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)

    # --- Residential Details ---
    address_line = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=6, blank=True)
    residence_type = models.CharField(max_length=20, choices=RESIDENCE_TYPE_CHOICES, blank=True)
    years_at_current_address = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)

    # --- KYC Details ---
    aadhaar_number = models.CharField(max_length=12, blank=True)
    pan_number = models.CharField(max_length=10, blank=True)

    # --- Borrower-specific Financial/Banking Details ---
    # Filled during borrower onboarding based on CommonProfile.role
    bank_name = models.CharField(max_length=255, blank=True)
    account_number = models.CharField(max_length=20, blank=True)
    ifsc_code = models.CharField(max_length=11, blank=True)
    has_existing_loan = models.BooleanField(default=False)
    existing_monthly_emi = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    total_asset_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    credit_score = models.IntegerField(null=True, blank=True)

    # --- Lender-specific Lending Details ---
    # Filled during lender onboarding based on CommonProfile.role
    amount_willing_to_lend = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    minimum_lending_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    maximum_lending_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    lender_total_asset_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    lender_bank_name = models.CharField(max_length=255, blank=True)
    lender_account_number = models.CharField(max_length=20, blank=True)
    lender_ifsc_code = models.CharField(max_length=11, blank=True)
    preferred_loan_type = models.CharField(max_length=20, choices=PREFERRED_LOAN_TYPE_CHOICES, blank=True)
    risk_preference = models.CharField(max_length=10, choices=RISK_PREFERENCE_CHOICES, blank=True)

    def __str__(self):
        return f"{self.full_name or self.user.email} ({self.role})"
