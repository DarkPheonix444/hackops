
from django.urls import path

from .views import (
    BorrowerProfileView,
    BorrowerDocumentUploadView,
    SubmitBorrowerApplicationView,
)


urlpatterns = [
    path(
        "profile/",
        BorrowerProfileView.as_view(),
        name="borrower-profile"
    ),

    path(
        "documents/",
        BorrowerDocumentUploadView.as_view(),
        name="borrower-documents"
    ),

    path(
        "submit/",
        SubmitBorrowerApplicationView.as_view(),
        name="borrower-submit"
    ),
]
