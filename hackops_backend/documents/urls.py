from django.urls import path

from .views import DocumentListCreateView, CommonDocumentView, BorrowerDocumentView, LenderDocumentView

urlpatterns = [
    path("", DocumentListCreateView.as_view(), name="document-list-create"),
    path("common/", CommonDocumentView.as_view(), name="common-documents"),
    path("borrower/", BorrowerDocumentView.as_view(), name="borrower-documents"),
    path("lender/", LenderDocumentView.as_view(), name="lender-documents"),
]