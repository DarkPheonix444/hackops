import logging

from django.utils import timezone

from co.models import DocumentProcessing
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
    processing.status = DocumentProcessing.Status.COMPLETED
    processing.processed_at = timezone.now()
    processing.error_message = ""
    processing.save(
        update_fields=[
            "raw_ocr_text",
            "status",
            "processed_at",
            "error_message",
            "updated_at",
        ]
    )
    return processing, result
