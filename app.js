// Medical Lexer JavaScript Implementation
console.log("MedLex: app.js loaded");

const TOKEN_SPECIFICATION = [
    ['VITALS', /\b(BP|HR|RR|SpO2|Temp|T)\b/],
    ['PATIENT_REF', /\b(Pt[s]?|patient|Hx|Dx|Sx|CC|Hx of|Dx of)\b/],
    ['SYMPTOM', /\b(SOB|CP|HA|N\/V|URI|UTI|DOE|CP|Abd pain|LOI|LOC)\b/],
    ['DIAGNOSIS', /\b(HTN|DM|CAD|CHF|COPD|AFib|CKD|CVA|TIA|PNA|PE)\b/],
    ['DOSAGE', /\b\d+\s?(mg|ml|mcg|gtt|tab[s]?|units)\b/],
    ['FREQUENCY', /\b(qD|BID|TID|QID|qHS|PRN|q\d+h|q\d+hr[s]?)\b/],
    ['DURATION', /(x\d+[dhwk])/],
    ['MEDICATION', /\b(Rx|ASA|NS|D5W|Lisinopril|Metformin|Atorvastatin)\b/],
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

// UI Handling
const input = document.getElementById('noteInput');
const tokenizeBtn = document.getElementById('tokenizeBtn');
const clearBtn = document.getElementById('clearBtn');
const highlightView = document.getElementById('highlightView');
const tokenTableBody = document.querySelector('#tokenTable tbody');
const symbolGrid = document.getElementById('symbolGrid');

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

const runAnalysis = () => {
    console.log("MedLex: Running analysis...");
    const text = input.value;
    const lexer = new MedicalLexer(text);
    const tokens = lexer.tokenize();
    console.log(`MedLex: Found ${tokens.length} tokens`);

    renderHighlights(text);
    renderTable(tokens);
    renderSymbols(tokens);
};

if (tokenizeBtn) {
    tokenizeBtn.addEventListener('click', runAnalysis);
    console.log("MedLex: Tokenize button listener attached");
}

if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        input.value = "";
        highlightView.innerHTML = "";
        tokenTableBody.innerHTML = "";
        symbolGrid.innerHTML = "";
        console.log("MedLex: UI cleared");
    });
    console.log("MedLex: Clear button listener attached");
}

// Initial run with sample text
if (input && input.value) {
    runAnalysis();
}
