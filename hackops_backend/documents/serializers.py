
import os

from rest_framework import serializers

from .models import Document


# V1 allowed upload formats: file extension -> accepted MIME/content types.
# Document *types* are owned exclusively by ``Document.DocumentType`` on the
# model, so this mapping only covers file formats, not document types.
ALLOWED_FILE_FORMATS = {
    '.pdf': ('application/pdf',),
    '.jpg': ('image/jpeg', 'image/jpg'),
    '.jpeg': ('image/jpeg', 'image/jpg'),
    '.png': ('image/png',),
}

# Maximum accepted upload size: 10 MB.
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

# ``Document.file`` is stored under ``upload_to='documents/'`` and Django's
# FileField path column is 255 characters wide, path included.
MAX_FILENAME_LENGTH = 255 - len('documents/')


class DocumentSerializer(serializers.ModelSerializer):
    """
    Upload-oriented serializer for ``Document``.

    Only ``document_type`` and ``file`` are writable. ``status``,
    ``rejection_reason``, ``uploaded_at`` and ``updated_at`` are read-only,
    and ``user`` is deliberately not exposed at all so it can neither be
    read from nor written to a client payload.
    """

    class Meta:
        model = Document
        fields = (
            'document_type',
            'file',
            'status',
            'rejection_reason',
            'uploaded_at',
            'updated_at',
        )
        read_only_fields = (
            'status',
            'rejection_reason',
            'uploaded_at',
            'updated_at',
        )

    def validate_file(self, value):
        """Reject unsafe or unsupported uploads before they are stored."""
        name = getattr(value, 'name', '') or ''

        # (4) Empty files.
        size = getattr(value, 'size', None)
        if not size:
            raise serializers.ValidationError('The submitted file is empty.')

        # (2) File size: maximum 10 MB per file.
        if size > MAX_FILE_SIZE_BYTES:
            raise serializers.ValidationError(
                'File is too large. The maximum allowed size is 10 MB.'
            )

        # (5) Filename safety: never let a client filename become a path.
        if not name.strip():
            raise serializers.ValidationError(
                'The submitted file has no filename.'
            )
        if '/' in name or '\\' in name or name in ('.', '..'):
            raise serializers.ValidationError(
                'Invalid filename: directory separators and path traversal '
                'sequences are not allowed.'
            )
        if any(ord(ch) < 32 or ord(ch) == 127 for ch in name):
            raise serializers.ValidationError(
                'Invalid filename: control characters are not allowed.'
            )
        if len(name) > MAX_FILENAME_LENGTH:
            raise serializers.ValidationError(
                'Invalid filename: the filename is too long '
                f'(maximum {MAX_FILENAME_LENGTH} characters).'
            )

        # (1) File extension, case-insensitive.
        extension = os.path.splitext(name)[1].lower()
        if extension not in ALLOWED_FILE_FORMATS:
            raise serializers.ValidationError(
                'Unsupported file type. Allowed formats: PDF, JPG, JPEG '
                'and PNG.'
            )

        # (3) Declared MIME/content type must be allowed and consistent
        # with the extension. Never trusted the extension alone.
        content_type = getattr(value, 'content_type', None)
        if content_type:
            content_type = content_type.split(';')[0].strip().lower()
        if not content_type:
            raise serializers.ValidationError(
                'The file content type is missing, so the upload cannot '
                'be verified.'
            )
        allowed_types = ALLOWED_FILE_FORMATS[extension]
        if content_type not in allowed_types:
            raise serializers.ValidationError(
                f'File content type "{content_type}" does not match the '
                f'"{extension}" extension and is not an allowed format.'
            )

        return value
