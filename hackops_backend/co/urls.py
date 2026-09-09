from django.urls import path

from .views import BorrowerDocumentListView, DocumentProcessView


urlpatterns = [
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