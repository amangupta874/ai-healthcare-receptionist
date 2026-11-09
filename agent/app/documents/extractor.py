import io
import os
import tempfile
from pathlib import Path
from typing import Tuple, Optional
import pypdf
import docx
import pytesseract
from pdf2image import convert_from_bytes
from app.config import settings

ALLOWED_EXTENSIONS = {'.pdf', '.docx'}
PDF_MAGIC = b'%PDF'
DOCX_MAGIC = b'PK\x03\x04'

class DocumentExtractionError(Exception):
    pass

class DocumentExtractor:
    @staticmethod
    def validate_upload(file_bytes: bytes, file_name: str) -> None:
        """
        Validates file size, extension, and magic bytes.
        """
        max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
        if len(file_bytes) > max_bytes:
            raise DocumentExtractionError(f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_MB}MB.")

        ext = Path(file_name).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise DocumentExtractionError(f"Unsupported file format '{ext}'. Allowed formats: PDF and DOCX.")

        if ext == '.pdf' and not file_bytes.startswith(PDF_MAGIC):
            raise DocumentExtractionError("Corrupt or invalid PDF file header.")

        if ext == '.docx' and not file_bytes.startswith(DOCX_MAGIC):
            raise DocumentExtractionError("Corrupt or invalid DOCX file header.")

    @staticmethod
    def extract_text(file_bytes: bytes, file_name: str) -> Tuple[str, bool]:
        """
        Extracts text from PDF or DOCX.
        Returns: (extracted_text, used_ocr)
        """
        DocumentExtractor.validate_upload(file_bytes, file_name)
        ext = Path(file_name).suffix.lower()

        if ext == '.docx':
            return DocumentExtractor._extract_docx(file_bytes), False
        elif ext == '.pdf':
            return DocumentExtractor._extract_pdf(file_bytes)
        else:
            raise DocumentExtractionError(f"Unsupported file type {ext}")

    @staticmethod
    def _extract_docx(file_bytes: bytes) -> str:
        doc = docx.Document(io.BytesIO(file_bytes))
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join([cell.text.strip() for cell in row.cells if cell.text.strip()])
                if row_text:
                    paragraphs.append(row_text)
        return "\n".join(paragraphs)

    @staticmethod
    def _extract_pdf(file_bytes: bytes) -> Tuple[str, bool]:
        # 1. First try native PDF text extraction
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text_parts = []
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text_parts.append(extracted.strip())
            full_text = "\n".join(text_parts).strip()
            if len(full_text) >= 60:
                return full_text, False
        except Exception:
            pass

        # 2. Fallback to OCR using Tesseract (eng+hin)
        try:
            images = convert_from_bytes(file_bytes, first_page=1, last_page=5)
            ocr_parts = []
            ocr_langs = settings.OCR_LANGS or 'eng+hin'
            for img in images:
                text = pytesseract.image_to_string(img, lang=ocr_langs)
                if text.strip():
                    ocr_parts.append(text.strip())
            return "\n".join(ocr_parts), True
        except Exception as e:
            raise DocumentExtractionError(f"Failed to perform OCR on scanned PDF: {str(e)}")
