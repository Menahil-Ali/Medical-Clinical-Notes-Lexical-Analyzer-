from medical_parser import MedicalParser
from medical_lexer import MedicalLexer
import json

def test_parser():
    test_cases = [
        "Pt w/ HTN. Lisinopril 10mg qD.",
        "BP 120/80. Ordered CXR.",
        "Lisinopril BID", # Should trigger error (missing dosage)
        "Patient CC: SOB. Rx: Metformin 500mg BID x2wk."
    ]
    
    for i, case in enumerate(test_cases):
        print(f"\n--- Test Case {i+1}: '{case}' ---")
        lexer = MedicalLexer(case)
        tokens = lexer.tokenize()
        parser = MedicalParser(tokens)
        ast = parser.parse()
        print(json.dumps(ast, indent=2))

if __name__ == "__main__":
    test_parser()
