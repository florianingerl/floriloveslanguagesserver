import importlib.util
for m in ["pdfplumber", "PyPDF2", "pypdf", "fitz", "pdfminer", "camelot"]:
    print(m, importlib.util.find_spec(m) is not None)
