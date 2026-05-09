// Medical Lexer JavaScript Implementation
console.log("MedLex: app.js loaded");

const TOKEN_SPECIFICATION = [
    ['VITALS', /\b(BP|HR|RR|SpO2|Temp|T)\b/],
    ['PATIENT_REF', /\b(Pt[s]?|patient|Hx|Dx|Sx|CC|Hx of|Dx of)\b/],
    ['SYMPTOM', /\b(SOB|CP|HA|N\/V|URI|UTI|DOE|CP|Abd pain|LOI|LOC)\b/],
    ['DIAGNOSIS', /\b(HTN|DM[12]?|CAD|CHF|COPD|AFib|CKD|CVA|TIA|PNA|PE|NSTEMI|HFrEF)\b/],
    ['DOSAGE', /\b\d+\s?(mg|ml|mcg|gtt|tab[s]?|units)\b/],
    ['FREQUENCY', /\b(qD|BID|TID|QID|qHS|PRN|q\d+h|q\d+hr[s]?)\b/],
    ['DURATION', /(x\d+[dhwk])/],
    ['MEDICATION', /\b(Rx|ASA|NS|D5W|Lisinopril|Metformin|Atorvastatin|Metoprolol|Furosemide|Aspirin)\b/],
    ['PROCEDURE', /\b(CXR|EKG|ECG|CT|MRI|US|CBC|BMP|LFT|UA)\b/],
    ['LATERALITY', /\b(L|R|Bilat|Left|Right|Bilateral)\b/],
    ['NUMBER', /\b\d+(\.\d+)?\b/],
    ['CONNECTOR', /\b(w\/|s\/p|c\/o|r\/o)\b/],
    ['NEWLINE', /\n/],
    ['SKIP', /[ \t,]+/],
    ['PUNCTUATION', /[:;\-\(\)\/]/],
    ['UNKNOWN', /./]
];

class MedicalLexer {
    constructor(text) {
        this.text = text;
        this.tokens = [];
    }

    tokenize() {
        let remaining = this.text;
        let line = 1;
        let col = 1;

        while (remaining.length > 0) {
            let matched = false;
            for (const [kind, regex] of TOKEN_SPECIFICATION) {
                const r = new RegExp('^' + regex.source);
                const match = remaining.match(r);
                if (match) {
                    const value = match[0];
                    if (kind !== 'SKIP' && kind !== 'NEWLINE') {
                        this.tokens.push({ kind, value, line, col });
                    }
                    
                    if (kind === 'NEWLINE') {
                        line++;
                        col = 1;
                    } else {
                        col += value.length;
                    }

                    remaining = remaining.slice(value.length);
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                remaining = remaining.slice(1);
                col++;
            }
        }
        return this.tokens;
    }
}

class MedicalParser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
        this.errors = [];
    }

    current() { return this.tokens[this.pos]; }

    eat(kind) {
        const token = this.current();
        if (token && token.kind === kind) {
            this.pos++;
            return token;
        }
        throw new Error(`Expected ${kind}, but found ${token ? token.kind : 'EOF'}`);
    }

    parse() {
        const ast = [];
        while (this.pos < this.tokens.length) {
            try {
                const stmt = this.parseStatement();
                if (stmt) ast.push(stmt);
            } catch (e) {
                this.errors.push(e.message);
                this.pos++; 
            }
        }
        return ast;
    }

    parseStatement() {
        let token = this.current();
        if (!token) return null;

        // Skip punctuation, unknown, or standalone patient references at the start
        // We want to handle DIAGONIS/SYMPTOM separately in grouping
        if (token.kind === 'PUNCTUATION' || token.kind === 'UNKNOWN' || token.kind === 'CONNECTOR' || token.kind === 'DIAGNOSIS' || token.kind === 'SYMPTOM' || token.kind === 'PATIENT_REF') {
            this.pos++;
            return this.parseStatement();
        }

        if (token.kind === 'MEDICATION') return this.parsePrescription();
        if (token.kind === 'VITALS') return this.parseVitals();
        if (token.kind === 'PROCEDURE') return this.parseProcedure();
        
        this.pos++; 
        return null;
    }

    parsePrescription() {
        const drug = this.eat('MEDICATION');
        if (this.current() && this.current().kind === 'PUNCTUATION' && this.current().value === ':') {
            this.pos++;
        }

        let actualDrug = drug.value;
        if (drug.value.toLowerCase() === 'rx' && this.current() && this.current().kind === 'MEDICATION') {
            actualDrug = this.eat('MEDICATION').value;
        }

        let dose, freq, duration;
        const skipPunct = () => {
            while(this.current() && this.current().kind === 'PUNCTUATION') this.pos++;
        };

        skipPunct();
        if (this.current() && this.current().kind === 'DOSAGE') dose = this.eat('DOSAGE');
        skipPunct();
        if (this.current() && this.current().kind === 'FREQUENCY') freq = this.eat('FREQUENCY');
        skipPunct();
        if (this.current() && this.current().kind === 'DURATION') duration = this.eat('DURATION');

        const freqMap = { 'qD': 'once daily', 'BID': 'twice daily', 'TID': 'three times daily', 'QID': 'four times daily', 'PRN': 'as needed' };
        const freqLabel = freq ? (freqMap[freq.value] || freq.value) : '';

        let summary = `Patient is prescribed ${actualDrug}`;
        if (dose) summary += ` ${dose.value}`;
        if (freqLabel) summary += ` ${freqLabel}`;
        if (duration) summary += ` for ${duration.value}`;
        summary += ".";

        return { type: "Prescription", summary };
    }

    parseVitals() {
        const type = this.eat('VITALS');
        let val1, val2;

        if (this.current() && this.current().kind === 'NUMBER') {
            val1 = this.eat('NUMBER');
            if (this.current() && this.current().kind === 'PUNCTUATION') {
                this.eat('PUNCTUATION');
                if (this.current() && this.current().kind === 'NUMBER') val2 = this.eat('NUMBER');
            }
        }

        const typeMap = { 'BP': 'Blood Pressure', 'HR': 'Heart Rate', 'Temp': 'Temperature' };
        const typeLabel = typeMap[type.value] || type.value;
        let summary = `${typeLabel} recording initiated.`;
        if (val1) {
            const reading = val2 ? `${val1.value}/${val2.value}` : val1.value;
            summary = `${typeLabel} recorded at ${reading}.`;
        }

        return { type: "VitalSign", summary };
    }

    parseProcedure() {
        const proc = this.eat('PROCEDURE');
        let lat;
        if (this.current() && this.current().kind === 'LATERALITY') lat = this.eat('LATERALITY');

        return { 
            type: "Procedure", 
            summary: `${proc.value} ${lat ? '(' + lat.value + ') ' : ''}has been ordered for the patient.` 
        };
    }
}

// UI Handling
const input = document.getElementById('noteInput');
const tokenizeBtn = document.getElementById('tokenizeBtn');
const clearBtn = document.getElementById('clearBtn');
const highlightView = document.getElementById('highlightView');
const tokenTableBody = document.querySelector('#tokenTable tbody');
const symbolGrid = document.getElementById('symbolGrid');
const clinicalSummary = document.getElementById('clinicalSummary');

const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

const renderHighlights = (text) => {
    let result = "";
    let remaining = text;
    while(remaining.length > 0) {
        let matched = false;
        for (const [kind, regex] of TOKEN_SPECIFICATION) {
            const r = new RegExp('^' + regex.source);
            const match = remaining.match(r);
            if (match) {
                const value = match[0];
                if (kind !== 'SKIP' && kind !== 'NEWLINE' && kind !== 'PUNCTUATION') {
                    result += `<span class="tk-${kind}">${escapeHtml(value)}</span>`;
                } else {
                    result += escapeHtml(value);
                }
                remaining = remaining.slice(value.length);
                matched = true;
                break;
            }
        }
        if(!matched) {
            result += escapeHtml(remaining[0]);
            remaining = remaining.slice(1);
        }
    }
    highlightView.innerHTML = result;
};

const renderTable = (tokens) => {
    tokenTableBody.innerHTML = tokens.map(t => `
        <tr>
            <td><span class="badge" style="color: var(--clr-${t.kind.toLowerCase()})">${t.kind}</span></td>
            <td><code>${escapeHtml(t.value)}</code></td>
            <td style="color: var(--text-dim)">${t.line}:${t.col}</td>
        </tr>
    `).join('');
};

const renderSymbols = (tokens) => {
    const symbols = {};
    tokens.forEach(t => {
        if (!['NUMBER', 'PUNCTUATION', 'UNKNOWN', 'CONNECTOR'].includes(t.kind)) {
            if (!symbols[t.value]) {
                symbols[t.value] = { kind: t.kind, count: 0 };
            }
            symbols[t.value].count++;
        }
    });

    symbolGrid.innerHTML = Object.entries(symbols).map(([name, info]) => `
        <div class="symbol-item" style="border-left-color: var(--clr-${info.kind.toLowerCase()})">
            <div>
                <div class="symbol-name">${name}</div>
                <div class="symbol-type">${info.kind}</div>
            </div>
            <div class="badge">${info.count}x</div>
        </div>
    `).join('');
};

const renderSummary = (tokens, ast) => {
    const summaries = ast.map(node => node.summary);
    
    // Group ALL Diagnosis and Symptoms
    const diagnoses = [];
    tokens.forEach(t => {
        if (t.kind === 'DIAGNOSIS' || t.kind === 'SYMPTOM') {
            if (!diagnoses.includes(t.value)) {
                diagnoses.push(t.value);
            }
        }
    });

    if (diagnoses.length > 0) {
        let diagSentence = "Patient presents with a history of ";
        if (diagnoses.length === 1) {
            diagSentence += diagnoses[0];
        } else {
            const last = diagnoses.pop();
            diagSentence += diagnoses.join(", ") + " and " + last;
        }
        diagSentence += ".";
        summaries.unshift(diagSentence);
    }
    
    if (summaries.length === 0) {
        clinicalSummary.innerHTML = '<p class="placeholder-text">Enter clinical notes to see the human-friendly interpretation...</p>';
        return;
    }
    
    clinicalSummary.innerHTML = summaries.map(s => `<div class="summary-item">${s}</div>`).join('');
};

const runAnalysis = () => {
    const text = input.value;
    const lexer = new MedicalLexer(text);
    const tokens = lexer.tokenize();

    const parser = new MedicalParser(tokens);
    const ast = parser.parse();

    renderHighlights(text);
    renderTable(tokens);
    renderSymbols(tokens);
    renderSummary(tokens, ast);
};

if (tokenizeBtn) tokenizeBtn.addEventListener('click', runAnalysis);
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        input.value = "";
        highlightView.innerHTML = "";
        tokenTableBody.innerHTML = "";
        symbolGrid.innerHTML = "";
        clinicalSummary.innerHTML = '<p class="placeholder-text">Enter clinical notes to see the human-friendly interpretation...</p>';
    });
}

if (input && input.value) runAnalysis();
