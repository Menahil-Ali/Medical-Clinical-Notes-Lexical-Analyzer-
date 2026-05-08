import re
from patterns import TOKEN_SPECIFICATION, get_compiled_regex

class Token:
    """Represents a single lexical token with metadata."""
    def __init__(self, kind, value, line, column):
        self.kind = kind
        self.value = value
        self.line = line
        self.column = column

    def __repr__(self):
        return f"Token({self.kind}, '{self.value}', Line: {self.line}, Col: {self.column})"

class MedicalLexer:
    """A formal Lexical Analyzer for Medical Clinical Notes."""
    
    def __init__(self, text):
        self.text = text
        self.tokens = []
        self.regex = re.compile(get_compiled_regex())
        self.line_num = 1
        self.line_start = 0

    def tokenize(self):
        """Generates tokens from the input text."""
        for mo in self.regex.finditer(self.text):
            kind = mo.lastgroup
            value = mo.group()
            column = mo.start() - self.line_start + 1
            
            if kind == 'NEWLINE':
                self.line_start = mo.end()
                self.line_num += 1
                continue
            elif kind == 'SKIP':
                continue
            elif kind == 'UNKNOWN':
                # For an academic project, we can raise a warning or handle errors
                # Here we just label it as UNKNOWN for flexibility
                pass
                
            self.tokens.append(Token(kind, value, self.line_num, column))
            
        return self.tokens

    def get_symbol_table(self):
        """Returns a summarized table of unique entities identified."""
        symbol_table = {}
        for token in self.tokens:
            if token.kind not in ['NUMBER', 'PUNCTUATION', 'UNKNOWN', 'CONNECTOR']:
                if token.value not in symbol_table:
                    symbol_table[token.value] = {
                        'type': token.kind,
                        'count': 1,
                        'occurrences': [(token.line, token.column)]
                    }
                else:
                    symbol_table[token.value]['count'] += 1
                    symbol_table[token.value]['occurrences'].append((token.line, token.column))
        return symbol_table

def display_results(lexer):
    """Utility to print tokens and symbol table in a clean format."""
    tokens = lexer.tokens
    symbol_table = lexer.get_symbol_table()

    print("\n" + "="*60)
    print(f"{'LEXICAL ANALYSIS REPORT':^60}")
    print("="*60)
    
    print(f"\n{'TOKEN TYPE':<15} | {'VALUE':<15} | {'LINE':<5} | {'COL':<5}")
    print("-" * 60)
    for t in tokens:
        print(f"{t.kind:<15} | {t.value:<15} | {t.line:<5} | {t.column:<5}")

    print("\n" + "="*60)
    print(f"{'SYMBOL TABLE (UNIQUE ENTITIES)':^60}")
    print("="*60)
    print(f"{'ENTITY':<20} | {'CATEGORY':<15} | {'COUNT':<5}")
    print("-" * 60)
    for entity, info in symbol_table.items():
        print(f"{entity:<20} | {info['type']:<15} | {info['count']:<5}")

if __name__ == "__main__":
    # Robust sample input
    sample_note = """
    Pt w/ Hx of HTN and DM.
    Presented w/ SOB and CP x3d.
    Vitals: BP 140/90, HR 88, SpO2 94% on RA.
    Rx: Lisinopril 10mg qD, ASA 81mg PRN.
    Ordered: CXR and EKG.
    """
    
    lexer = MedicalLexer(sample_note)
    lexer.tokenize()
    display_results(lexer)
