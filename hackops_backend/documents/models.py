from django.db import models

from users.models import User


class Document(models.Model):
    """
    A user-owned uploaded document.

    V1 scope: basic file uploading with a review status only.
    Every document belongs to exactly one user; ownership must be
    derived from the authenticated user (request.user) at the API
    layer, never from a user ID supplied by the frontend.

    Intentionally out of scope for V1: OCR fields/processing,
    verification logic, company/staff fields, loan relationships,
    AI fields, and external storage services.
    """

    class DocumentType(models.TextChoices):
        # Common documents
        AADHAAR = 'aadhaar', 'Aadhaar'
        PAN = 'pan', 'PAN'
        ADDRESS_PROOF = 'address_proof', 'Address Proof'
        PHOTOGRAPH = 'photograph', 'Photograph'
        BANK_STATEMENT = 'bank_statement', 'Bank Statement'
        BANK_ACCOUNT_PROOF = 'bank_account_proof', 'Bank Account Proof'

        # Borrower-specific documents
        SALARY_SLIP = 'salary_slip', 'Salary Slip'
        FORM_16 = 'form_16', 'Form 16'
        ITR = 'itr', 'ITR (Income Tax Return)'
        EMPLOYMENT_PROOF = 'employment_proof', 'Employment Proof'
        EXISTING_LOAN_STATEMENT = (
            'existing_loan_statement',
            'Existing Loan Statement',
        )
        LOAN_REPAYMENT_HISTORY = (
            'loan_repayment_history',
            'Loan Repayment History',
        )

        # Lender-specific documents
        INCOME_PROOF = 'income_proof', 'Income Proof'
        SOURCE_OF_FUNDS_PROOF = (
            'source_of_funds_proof',
            'Source of Funds Proof',
        )
        ASSET_NET_WORTH_PROOF = (
            'asset_net_worth_proof',
            'Asset / Net Worth Proof',
        )
        LENDER_EMPLOYMENT_BUSINESS_PROOF = (
            'lender_employment_business_proof',
            'Lender Employment / Business Proof',
        )

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        UNDER_REVIEW = 'under_review', 'Under Review'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        REUPLOAD_REQUIRED = 'reupload_required', 'Reupload Required'

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    document_type = models.CharField(
        max_length=40,
        choices=DocumentType.choices,
    )
    file = models.FileField(
        upload_to="documents/",
        max_length=255,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    rejection_reason = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.user} - {self.get_document_type_display()} ({self.status})"
