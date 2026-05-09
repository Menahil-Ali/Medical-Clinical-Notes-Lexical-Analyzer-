import re

# Medical Grammar Specification
# Groups patterns by category to allow for easy expansion and semantic processing

TOKEN_SPECIFICATION = [
    # [1] VITALS (e.g., BP 120/80, HR 80)
    ('VITALS', r'\b(BP|HR|RR|SpO2|Temp|T)\b'),
    
    # [2] PATIENT CONTEXT (e.g., Pt, Hx, Dx)
    ('PATIENT_REF', r'\b(Pt[s]?|patient|Hx|Dx|Sx|CC|Hx of|Dx of)\b'),
    
    # [3] SYMPTOMS (e.g., SOB, CP)
    ('SYMPTOM', r'\b(SOB|CP|HA|N/V|URI|UTI|DOE|CP|N/V|Abd pain|LOI|LOC)\b'),
    
    # [4] DIAGNOSES (e.g., HTN, DM)
    ('DIAGNOSIS', r'\b(HTN|DM|CAD|CHF|COPD|AFib|CKD|CVA|TIA|PNA|PE|Asthma|GERD|COVID)\b'),
    
    # [5] DOSAGE & UNITS (e.g., 500mg, 2 tabs)
    # Using a slightly complex regex to capture number + unit together as one token
    ('DOSAGE', r'\b\d+\s?(mg|ml|mcg|gtt|tab[s]?|units)\b'),
    
    # [6] FREQUENCY (e.g., BID, TID, PRN)
    ('FREQUENCY', r'\b(qD|BID|TID|QID|qHS|PRN|q\d+h|q\d+hr[s]?)\b'),
    
    # [7] DURATION (e.g., x3d, x1wk)
    ('DURATION', r'(x\d+[dhwk])'),
    
    # [8] MEDICATIONS (e.g., Rx, ASA)
    ('MEDICATION', r'\b(Rx|ASA|NS|D5W|Lisinopril|Metformin|Atorvastatin)\b'),
    
    # [9] PROCEDURES (e.g., CXR, MRI)
    ('PROCEDURE', r'\b(CXR|EKG|ECG|CT|MRI|US|CBC|BMP|LFT|UA)\b'),
    
    # [10] LATERALITY (e.g., L, R, Bilat)
    ('LATERALITY', r'\b(L|R|Bilat|Left|Right|Bilateral)\b'),
    
    # [11] NUMBERS
    ('NUMBER', r'\b\d+(\.\d+)?\b'),
    
    # [12] COMMON CONNECTORS (Optional skip or keep)
    ('CONNECTOR', r'\b(w/|s/p|c/o|r/o)\b'),

    # [13] WHITESPACE & PUNCTUATION
    ('NEWLINE', r'\n'),
    ('SKIP', r'[ \t,]+'),
    ('PUNCTUATION', r'[:;\-\(\)\/]'),
    
    # [14] UNKNOWN - Fallback
    ('UNKNOWN', r'.')
]

# Utility to compile patterns into a single regex with named groups
def get_compiled_regex():
    return '|'.join(f'(?P<{name}>{pattern})' for name, pattern in TOKEN_SPECIFICATION)
