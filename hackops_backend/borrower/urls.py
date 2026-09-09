<<<<<<< HEAD

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
=======
from django.urls import path

urlpatterns = [
    # Borrower endpoint routes
>>>>>>> cd0fa131647097f65dd5dd98a6785940caa26813
]
