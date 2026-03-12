from io import BytesIO

from pypdf import PdfReader

from app.config import get_settings


def extract_pdf_text(file_bytes: bytes) -> str:
    settings = get_settings()
    if len(file_bytes) > settings.max_pdf_size_mb * 1024 * 1024:
        raise ValueError(f"PDF 文件过大，最大支持 {settings.max_pdf_size_mb}MB。")

    reader = PdfReader(BytesIO(file_bytes))
    if len(reader.pages) > settings.max_pdf_pages:
        raise ValueError(f"PDF 页数过多，最大支持 {settings.max_pdf_pages} 页。")

    text_parts: list[str] = []
    for page in reader.pages:
        text_parts.append(page.extract_text() or "")

    text = "\n".join(text_parts).strip()
    if not text:
        raise ValueError("未从 PDF 中提取到文本。当前 Demo 只支持文本型 PDF。")

    return text
