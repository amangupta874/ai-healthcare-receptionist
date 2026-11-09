import pytest
import io
import docx
from app.documents.extractor import DocumentExtractor, DocumentExtractionError
from app.documents.parser import DocumentParser

def test_reject_invalid_extension():
    with pytest.raises(DocumentExtractionError) as exc:
        DocumentExtractor.validate_upload(b"test content", "virus.exe")
    assert "Unsupported file format" in str(exc.value)

def test_reject_oversized_file():
    huge_bytes = b"0" * (11 * 1024 * 1024)
    with pytest.raises(DocumentExtractionError) as exc:
        DocumentExtractor.validate_upload(huge_bytes, "huge.pdf")
    assert "exceeds maximum allowed limit" in str(exc.value)

def test_reject_corrupt_pdf():
    corrupt_bytes = b"Not a valid PDF header"
    with pytest.raises(DocumentExtractionError) as exc:
        DocumentExtractor.validate_upload(corrupt_bytes, "test.pdf")
    assert "Corrupt or invalid PDF" in str(exc.value)

def test_extract_docx_and_parse():
    # Build a small in-memory docx file
    doc = docx.Document()
    doc.add_heading('City Care Clinic - Policy & Timings 2026', level=1)
    doc.add_paragraph('Clinic Timings: Monday to Saturday from 09:00 AM to 06:00 PM. Closed on Sundays.')
    doc.add_paragraph('Dr. Ramesh Gupta, Senior Cardiologist, Consultation Fee: 600')
    doc.add_paragraph('Free parking is available in front of the clinic.')

    file_stream = io.BytesIO()
    doc.save(file_stream)
    docx_bytes = file_stream.getvalue()

    text, used_ocr = DocumentExtractor.extract_text(docx_bytes, "policy.docx")
    assert "City Care Clinic" in text
    assert "09:00 AM" in text
    assert used_ocr is False

    # Test parser
    draft = DocumentParser.parse_with_llm(text)
    assert draft is not None
    assert "timings" in draft
    assert "rules" in draft
    assert "issues" in draft

