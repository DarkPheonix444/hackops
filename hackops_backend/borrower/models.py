
from django.db import models
from django.conf import settings


class Borrower(models.Model):

    class EmploymentType(models.TextChoices):
        SALARIED = "SALARIED", "Salaried"
        SELF_EMPLOYED = "SELF_EMPLOYED", "Self Employed"
        BUSINESS = "BUSINESS", "Business"
        STUDENT = "STUDENT", "Student"
        RETIRED = "RETIRED", "Retired"
        OTHER = "OTHER", "Other"

    class RepaymentFrequency(models.TextChoices):
        MONTHLY = "MONTHLY", "Monthly"
        WEEKLY = "WEEKLY", "Weekly"
        BIWEEKLY = "BIWEEKLY", "Bi-weekly"

    class ApplicationStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SUBMITTED = "SUBMITTED", "Submitted"
        FROZEN = "FROZEN", "Frozen"
        UNDER_VERIFICATION = "UNDER_VERIFICATION", "Under Verification"
        REVERIFICATION = "REVERIFICATION", "Reverification Required"
        VERIFIED = "VERIFIED", "Verified"
        RISK_ASSESSMENT = "RISK_ASSESSMENT", "Risk Assessment"
        COMPLETED = "COMPLETED", "Completed"

    # =====================================================
    # AUTH USER
    # =====================================================

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="borrower_profile"
    )

    # =====================================================
    # BASIC IDENTITY
    # =====================================================

    name = models.CharField(max_length=150)

    name_as_per_aadhaar = models.CharField(
        max_length=150,
        blank=True
    )

    name_as_per_pan = models.CharField(
        max_length=150,
        blank=True
    )

    aadhaar_number = models.CharField(
        max_length=12,
        unique=True
    )

    pan_number = models.CharField(
        max_length=10,
        unique=True
    )

    date_of_birth = models.DateField(
        blank=True,
        null=True
    )

    phone_number = models.CharField(
        max_length=15
    )

    # =====================================================
    # ADDRESS
    # =====================================================

    address_line = models.TextField(
        blank=True
    )

    city = models.CharField(
        max_length=100,
        blank=True
    )

    state = models.CharField(
        max_length=100,
        blank=True
    )

    pincode = models.CharField(
        max_length=10,
        blank=True
    )

    # =====================================================
    # EMPLOYMENT / FINANCIAL INFORMATION
    # =====================================================

    employment_type = models.CharField(
        max_length=20,
        choices=EmploymentType.choices,
        blank=True
    )

    employer_or_business_name = models.CharField(
        max_length=200,
        blank=True
    )

    monthly_income = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    annual_gross_income = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        blank=True,
        null=True
    )

    existing_monthly_obligations = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    credit_score = models.PositiveSmallIntegerField(
        blank=True,
        null=True
    )

    cibil_score = models.PositiveSmallIntegerField(
        blank=True,
        null=True
    )

    # =====================================================
    # LOAN REQUIREMENT
    # =====================================================

    amount_requested = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0
    )

    loan_purpose = models.CharField(
        max_length=200,
        blank=True
    )

    loan_purpose_details = models.TextField(
        blank=True
    )

    requested_tenure_months = models.PositiveIntegerField(
        blank=True,
        null=True
    )

    repayment_frequency = models.CharField(
        max_length=20,
        choices=RepaymentFrequency.choices,
        default=RepaymentFrequency.MONTHLY
    )

    # =====================================================
    # APPLICATION STATE
    # =====================================================

    application_status = models.CharField(
        max_length=30,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.DRAFT
    )

    submitted_at = models.DateTimeField(
        blank=True,
        null=True
    )

    frozen_at = models.DateTimeField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.name} - {self.pan_number}"


class BorrowerDocument(models.Model):

    class DocumentType(models.TextChoices):
        AADHAAR = "AADHAAR", "Aadhaar"
        PAN = "PAN", "PAN Card"
        ITR = "ITR", "Income Tax Return"
        INCOME_COMPUTATION = (
            "INCOME_COMPUTATION",
            "Income Computation"
        )
        PASSPORT = "PASSPORT", "Passport"
        ADDRESS_PROOF = "ADDRESS_PROOF", "Address Proof"
        ELECTRICITY_BILL = (
            "ELECTRICITY_BILL",
            "Electricity Bill"
        )
        MAINTENANCE_BILL = (
            "MAINTENANCE_BILL",
            "Maintenance Bill"
        )
        BANK_STATEMENT = (
            "BANK_STATEMENT",
            "Bank Statement"
        )
        SALARY_SLIP = (
            "SALARY_SLIP",
            "Salary Slip"
        )
        FORM_16 = "FORM_16", "Form 16"
        BUSINESS_PROOF = (
            "BUSINESS_PROOF",
            "Business Proof"
        )
        LOAN_REPAYMENT_STATEMENT = (
            "LOAN_REPAYMENT_STATEMENT",
            "Previous Loan Repayment Statement"
        )
        OTHER = "OTHER", "Other"

    class VerificationStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSING = "PROCESSING", "Processing"
        VERIFIED = "VERIFIED", "Verified"
        REJECTED = "REJECTED", "Rejected"
        REVERIFICATION = (
            "REVERIFICATION",
            "Reverification Required"
        )

    borrower = models.ForeignKey(
        Borrower,
        on_delete=models.CASCADE,
        related_name="documents"
    )

    document_type = models.CharField(
        max_length=40,
        choices=DocumentType.choices
    )

    document = models.FileField(
        upload_to="borrower_documents/"
    )

    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING
    )

    # =====================================================
    # AI / OCR EXTRACTED INFORMATION
    # =====================================================

    extracted_name = models.CharField(
        max_length=150,
        blank=True
    )

    extracted_document_number = models.CharField(
        max_length=50,
        blank=True
    )

    extracted_date = models.DateField(
        blank=True,
        null=True
    )

    extracted_income = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        blank=True,
        null=True
    )

    # =====================================================
    # VERIFICATION
    # =====================================================

    verification_notes = models.TextField(
        blank=True
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True
    )

    verified_at = models.DateTimeField(
        blank=True,
        null=True
    )

    def __str__(self):
        return (
            f"{self.borrower.name} - "
            f"{self.get_document_type_display()}"
        )


class BorrowerVerification(models.Model):

    class VerificationStatus(models.TextChoices):
        VERIFIED = "VERIFIED", "Verified"
        NEEDS_REVIEW = "NEEDS_REVIEW", "Needs Review"
        FAILED = "FAILED", "Failed"
        PENDING = "PENDING", "Pending"

    class IdentityMatchStatus(models.TextChoices):
        MATCH = "MATCH", "Match"
        PARTIAL_MATCH = "PARTIAL_MATCH", "Partial Match"
        MISMATCH = "MISMATCH", "Mismatch"
        NOT_AVAILABLE = "NOT_AVAILABLE", "Not Available"

    class DocumentStatus(models.TextChoices):
        COMPLETE = "COMPLETE", "Complete"
        PARTIALLY_COMPLETE = "PARTIALLY_COMPLETE", "Partially Complete"
        MISSING = "MISSING", "Missing"
        INVALID = "INVALID", "Invalid"

    class ConsistencyStatus(models.TextChoices):
        CONSISTENT = "CONSISTENT", "Consistent"
        MINOR_MISMATCH = "MINOR_MISMATCH", "Minor Mismatch"
        MAJOR_MISMATCH = "MAJOR_MISMATCH", "Major Mismatch"
        PENDING = "PENDING", "Pending"

    class VerificationMethod(models.TextChoices):
        DIGILOCKER = "DIGILOCKER", "DigiLocker (Demo)"
        MANUAL = "MANUAL", "Document Upload & Verification"
        PAN_DIRECT = "PAN_DIRECT", "PAN Verification"
        HYBRID = "HYBRID", "Hybrid"

    borrower = models.ForeignKey(
        Borrower,
        on_delete=models.CASCADE,
        related_name="verifications"
    )

    identity_method = models.CharField(
        max_length=30,
        choices=VerificationMethod.choices,
        default=VerificationMethod.HYBRID
    )

    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING
    )

    identity_match = models.CharField(
        max_length=20,
        choices=IdentityMatchStatus.choices,
        default=IdentityMatchStatus.NOT_AVAILABLE
    )

    document_status = models.CharField(
        max_length=25,
        choices=DocumentStatus.choices,
        default=DocumentStatus.MISSING
    )

    consistency_status = models.CharField(
        max_length=20,
        choices=ConsistencyStatus.choices,
        default=ConsistencyStatus.PENDING
    )

    confidence_score = models.PositiveSmallIntegerField(
        default=0
    )

    flags = models.JSONField(
        default=list,
        blank=True
    )

    explanation = models.JSONField(
        default=list,
        blank=True
    )

    provider = models.CharField(
        max_length=50,
        default="MOCK"
    )

    provider_reference = models.CharField(
        max_length=100,
        blank=True
    )

    details = models.JSONField(
        default=dict,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"Verification #{self.id} for {self.borrower.name} "
            f"[{self.verification_status} - {self.confidence_score}%]"
        )

    @property
    def masked_aadhaar(self):
        num = (self.borrower.aadhaar_number or "").strip()
        if len(num) >= 4:
            return f"XXXX-XXXX-{num[-4:]}"
        return "XXXX-XXXX-XXXX"

    @property
    def masked_pan(self):
        pan = (self.borrower.pan_number or "").strip()
        if len(pan) == 10:
            return f"{pan[:2]}XXXXX{pan[-3:]}"
        return "XXXXXXXXXX"


