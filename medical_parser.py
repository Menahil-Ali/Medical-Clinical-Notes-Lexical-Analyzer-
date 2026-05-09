from medical_lexer import MedicalLexer

class ParserError(Exception):
    """Custom exception for parsing errors."""
    pass

class MedicalParser:
    """
    A Recursive Descent Parser for Medical Clinical Notes.
    Transforms a stream of tokens into a Structured Abstract Syntax Tree (AST).
    """
    def __init__(self, tokens):
        self.tokens = tokens
        self.pos = 0

    def current_token(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def eat(self, kind):
        """Consumes a token of the expected kind, or raises an error."""
        token = self.current_token()
        if token and token.kind == kind:
            self.pos += 1
            return token
        else:
            expected = kind
            actual = token.kind if token else "EOF"
            raise ParserError(f"Expected {expected}, but found {actual} at line {token.line if token else 'unknown'}")

    def parse(self):
        """Main entry point: parses the entire token stream into statements."""
        statements = []
        while self.current_token():
            try:
                stmt = self.parse_statement()
                if stmt:
                    statements.append(stmt)
            except ParserError as e:
                # Basic error recovery: skip to next line or statement
                print(f"Parse Error: {e}")
                self.pos += 1
        return statements

    def parse_statement(self):
        """Determines which rule to apply based on the lookahead token."""
        token = self.current_token()
        if not token: return None

        if token.kind == 'MEDICATION':
            return self.parse_prescription()
        elif token.kind == 'PATIENT_REF':
            return self.parse_observation()
        elif token.kind == 'VITALS':
            return self.parse_vitals()
        elif token.kind == 'PROCEDURE':
            return self.parse_procedure()
        else:
            # Skip unknown tokens at the statement level
            self.pos += 1
            return None

    def parse_prescription(self):
        """Rule: <Prescription> ::= MEDICATION DOSAGE FREQUENCY (DURATION)?"""
        drug = self.eat('MEDICATION')
        
        # Check for mandatory dosage
        if self.current_token() and self.current_token().kind == 'DOSAGE':
            dose = self.eat('DOSAGE')
        else:
            raise ParserError(f"Prescription Error: Medication '{drug.value}' missing dosage")

        # Check for mandatory frequency
        if self.current_token() and self.current_token().kind == 'FREQUENCY':
            freq = self.eat('FREQUENCY')
        else:
            raise ParserError(f"Prescription Error: Medication '{drug.value}' missing frequency (e.g., qD, BID)")

        # Optional duration
        duration = None
        if self.current_token() and self.current_token().kind == 'DURATION':
            duration = self.eat('DURATION').value

        return {
            "type": "Prescription",
            "drug": drug.value,
            "dosage": dose.value,
            "frequency": freq.value,
            "duration": duration,
            "children": [drug, dose, freq] + ([duration] if duration else [])
        }

    def parse_observation(self):
        """Rule: <Observation> ::= PATIENT_REF (CONNECTOR)? (SYMPTOM | DIAGNOSIS)"""
        patient = self.eat('PATIENT_REF')
        
        connector = None
        if self.current_token() and self.current_token().kind == 'CONNECTOR':
            connector = self.eat('CONNECTOR')

        target = None
        if self.current_token() and self.current_token().kind in ['SYMPTOM', 'DIAGNOSIS']:
            target = self.eat(self.current_token().kind)
        else:
            raise ParserError(f"Observation Error: Patient reference missing clinical context")

        return {
            "type": "Observation",
            "patient": patient.value,
            "condition": target.value,
            "category": target.kind,
            "connector": connector.value if connector else None
        }

    def parse_vitals(self):
        """Rule: <VitalSign> ::= VITALS NUMBER (PUNCTUATION NUMBER)?"""
        vital_type = self.eat('VITALS')
        value1 = self.eat('NUMBER')
        
        value2 = None
        if self.current_token() and self.current_token().kind == 'PUNCTUATION':
            self.eat('PUNCTUATION') # Consume / or -
            if self.current_token() and self.current_token().kind == 'NUMBER':
                value2 = self.eat('NUMBER').value

        return {
            "type": "VitalSign",
            "name": vital_type.value,
            "value": f"{value1.value}/{value2}" if value2 else value1.value
        }

    def parse_procedure(self):
        """Rule: <Procedure> ::= PROCEDURE (LATERALITY)?"""
        proc = self.eat('PROCEDURE')
        lat = None
        if self.current_token() and self.current_token().kind == 'LATERALITY':
            lat = self.eat('LATERALITY')

        return {
            "type": "Procedure",
            "name": proc.value,
            "laterality": lat.value if lat else "Not specified"
        }

if __name__ == "__main__":
    sample_note = "Pt w/ HTN. Rx: Lisinopril 10mg qD. BP 120/80. Ordered CXR."
    
    lexer = MedicalLexer(sample_note)
    tokens = lexer.tokenize()
    
    parser = MedicalParser(tokens)
    ast = parser.parse()
    
    import json
    print("\n--- STRUCTURED CLINICAL DATA (AST) ---")
    print(json.dumps(ast, indent=2))
