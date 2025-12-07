from pypdf import PdfReader
import os

file_path = 'indigo-yield-platform-v01/REPORTS/Reporting_YieldFund - August 2025 (2).pdf'

try:
    reader = PdfReader(file_path)
    for i, page in enumerate(reader.pages):
        print(f"--- Page {i+1} ---")
        print(page.extract_text())
except Exception as e:
    print(f"Error: {e}")
