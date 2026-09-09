from django.urls import path

from .views import (
    BorrowerDocumentListView,
    CompanyBorrowerDetailView,
    CompanyBorrowerDocumentsView,
    CompanyBorrowerListView,
    DocumentProcessView,
)


urlpatterns = [
    path(
        "borrowers/",
        CompanyBorrowerListView.as_view(),
        name="co-borrower-list",
    ),
    path(
        "borrowers/<int:borrower_id>/",
        CompanyBorrowerDetailView.as_view(),
        name="co-borrower-detail",
    ),
    path(
        "borrowers/<int:borrower_id>/documents/",
        CompanyBorrowerDocumentsView.as_view(),
        name="co-borrower-documents",
    ),
    path(
        "documents/",
        BorrowerDocumentListView.as_view(),
        name="co-document-list",
    ),
    path(
        "documents/<int:document_id>/process/",
        DocumentProcessView.as_view(),
        name="co-document-process",
    ),
]