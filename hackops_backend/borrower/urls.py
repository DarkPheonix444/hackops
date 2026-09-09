from django.urls import path

from .views import (
    BorrowerProfileView,
    BorrowerDocumentUploadView,
    SubmitBorrowerApplicationView,
    VerificationStartView,
    VerificationReverificationView,
    VerificationSubmitView,
    VerificationStatusView,
    VerificationResultView,
)

urlpatterns = [
    # Borrower Profile Management
    path("", BorrowerProfileView.as_view(), name="borrower-root"),
    path("profile/", BorrowerProfileView.as_view(), name="borrower-profile"),

    # Document Uploads
    path("documents/", BorrowerDocumentUploadView.as_view(), name="borrower-documents"),

    # Application Submission
    path("submit/", SubmitBorrowerApplicationView.as_view(), name="borrower-submit"),

    # TrustLens Identity & Document Verification Module
    path("verification/start/", VerificationStartView.as_view(), name="verification-start"),
    path("verification/reverify/", VerificationReverificationView.as_view(), name="verification-reverify"),
    path("verification/submit/", VerificationSubmitView.as_view(), name="verification-submit"),
    path("verification/status/", VerificationStatusView.as_view(), name="verification-status"),
    path("verification/result/", VerificationResultView.as_view(), name="verification-result"),
]