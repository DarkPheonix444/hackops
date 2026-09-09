import logging

from django.utils import timezone

from co.models import DocumentProcessing
from .extraction import extract_document_data
from .identity_matching import apply_identity_name_check
from .ocr import process_document

logger = logging.getLogger(__name__)


def process_borrower_document(document):
    """Process one BorrowerDocument and persist its OCR result and status."""
    processing, _ = DocumentProcessing.objects.get_or_create(document=document)
    processing.status = DocumentProcessing.Status.PROCESSING
    processing.error_message = ""
    processing.save(update_fields=["status", "error_message", "updated_at"])

    try:
        result = process_document(document.document.path)
    except Exception as exc:
        logger.exception("OCR failed for BorrowerDocument %s", document.pk)
        processing.status = DocumentProcessing.Status.FAILED
        processing.error_message = str(exc)
        processing.processed_at = timezone.now()
        processing.save(
            update_fields=[
                "status",
                "error_message",
                "processed_at",
                "updated_at",
            ]
        )
        raise

    processing.raw_ocr_text = result["raw_text"]
    processing.extracted_data = extract_document_data(
        document.document_type,
        result["raw_text"],
    )
    processing.status = DocumentProcessing.Status.COMPLETED
    processing.processed_at = timezone.now()
    processing.error_message = ""
    processing.save(
        update_fields=[
            "raw_ocr_text",
			"extracted_data",
            "status",
            "processed_at",
            "error_message",
            "updated_at",
        ]
    )

    if document.document_type in {"PAN", "AADHAAR"}:
        related_processing = list(
            DocumentProcessing.objects.select_related("document").filter(
                document__borrower=document.borrower,
                document__document_type__in={"PAN", "AADHAAR"},
                status=DocumentProcessing.Status.COMPLETED,
            )
        )
        apply_identity_name_check(document.borrower, related_processing)

    return processing, result
