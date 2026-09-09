from borrower.models import BorrowerDocument
from django.db import models


class DocumentProcessing(models.Model):
	class Status(models.TextChoices):
		PENDING = "PENDING", "Pending"
		PROCESSING = "PROCESSING", "Processing"
		COMPLETED = "COMPLETED", "Completed"
		FAILED = "FAILED", "Failed"

	document = models.OneToOneField(
		BorrowerDocument,
		on_delete=models.CASCADE,
		related_name="processing",
	)
	raw_ocr_text = models.TextField(blank=True, default="")
	extracted_data = models.JSONField(blank=True, default=dict)
	ocr_confidence = models.DecimalField(
		max_digits=5,
		decimal_places=4,
		blank=True,
		null=True,
	)
	status = models.CharField(
		max_length=20,
		choices=Status.choices,
		default=Status.PENDING,
	)
	processed_at = models.DateTimeField(blank=True, null=True)
	error_message = models.TextField(blank=True, default="")
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self):
		return f"OCR processing for document {self.document_id}"
