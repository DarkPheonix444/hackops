import logging
from pathlib import Path
from tempfile import TemporaryDirectory

try:
    import fitz
except ImportError:
    fitz = None

logger = logging.getLogger(__name__)
_ocr_engine = None


class OCRProcessingError(Exception):
    """Raised when a document cannot be processed by the OCR pipeline."""


def _get_ocr_engine():
    global _ocr_engine
    if _ocr_engine is None:
        try:
            from paddleocr import PaddleOCR
        except ImportError as exc:
            raise OCRProcessingError(
                "PaddleOCR is not installed. Install paddleocr and paddlepaddle."
            ) from exc
        _ocr_engine = PaddleOCR(lang="en")
    return _ocr_engine


def _texts_from_result(result):
    if isinstance(result, dict):
        for key in ("rec_texts", "texts", "text"):
            value = result.get(key)
            if isinstance(value, str):
                return [value]
            if isinstance(value, (list, tuple)):
                return [str(item) for item in value if item]

    for attribute in ("rec_texts", "texts", "text"):
        value = getattr(result, attribute, None)
        if isinstance(value, str):
            return [value]
        if isinstance(value, (list, tuple)):
            return [str(item) for item in value if item]

    if isinstance(result, (list, tuple)):
        texts = []
        for item in result:
            if (
                isinstance(item, (list, tuple))
                and len(item) == 2
                and isinstance(item[0], str)
            ):
                texts.append(item[0])
            else:
                texts.extend(_texts_from_result(item))
        return texts

    return []


def _ocr_image(image_path):
    engine = _get_ocr_engine()

    if hasattr(engine, "predict"):
        results = engine.predict(str(image_path))
    else:
        results = engine.ocr(str(image_path), cls=True)

    texts = []
    for result in results or []:
        texts.extend(_texts_from_result(result))
    return "\n".join(text.strip() for text in texts if text.strip())


def _process_pdf(file_path):
    if fitz is None:
        raise OCRProcessingError("PyMuPDF (fitz) is not installed.")
    document = fitz.open(file_path)
    try:
        direct_text = "\n".join(page.get_text("text") for page in document).strip()
        if direct_text:
            return direct_text, len(document), "pdf_text"

        page_text = []
        with TemporaryDirectory() as temporary_directory:
            for page_number, page in enumerate(document):
                pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                image_path = Path(temporary_directory) / f"page-{page_number}.png"
                pixmap.save(str(image_path))
                page_text.append(_ocr_image(image_path))
        return "\n\n".join(text for text in page_text if text), len(document), "pdf_ocr"
    finally:
        document.close()


def process_document(file_path):
    """Extract real text from an image or PDF without changing the source file."""
    path = Path(file_path)
    if not path.is_file():
        raise OCRProcessingError(f"Document file does not exist: {path}")

    suffix = path.suffix.lower()
    if suffix == ".pdf":
        raw_text, page_count, source_type = _process_pdf(path)
    elif suffix in {".jpg", ".jpeg", ".png"}:
        raw_text = _ocr_image(path)
        page_count, source_type = 1, "image_ocr"
    else:
        raise OCRProcessingError(
            f"Unsupported document format: {suffix or 'missing extension'}"
        )

    return {
        "raw_text": raw_text,
        "page_count": page_count,
        "source_type": source_type,
    }
