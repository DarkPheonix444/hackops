from django.db import models
from django.conf import settings


class LenderProfile(models.Model):
    RISK_TOLERANCE_CHOICES = [
        ('LOW', 'Low Risk'),
        ('MEDIUM', 'Medium Risk'),
        ('HIGH', 'High Risk'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='lender_profile'
    )
    company_name = models.CharField(max_length=255, blank=True, null=True)
    available_funds = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    risk_tolerance = models.CharField(max_length=10, choices=RISK_TOLERANCE_CHOICES, default='MEDIUM')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"LenderProfile ({self.user.email})"


class LoanApplication(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Verification'),
        ('DOCS_VERIFIED', 'Documents Verified'),
        ('READY_FOR_LENDER', 'Ready for Lender Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    borrower = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='loan_applications'
    )
    lender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='funded_loans'
    )
    amount_requested = models.DecimalField(max_digits=12, decimal_places=2)
    purpose = models.CharField(max_length=255)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='READY_FOR_LENDER')
    
    # AI Assessment Fields
    ai_trust_score = models.IntegerField(default=0)
    ai_risk_level = models.CharField(max_length=20, default='LOW')
    ai_recommended_terms = models.JSONField(default=dict, blank=True)
    ai_risk_breakdown = models.JSONField(default=dict, blank=True)

    # Decision Tracking
    decision_notes = models.TextField(blank=True, null=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"LoanApplication #{self.id} - {self.borrower.email} (${self.amount_requested})"
