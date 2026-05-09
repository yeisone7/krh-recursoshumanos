const fs = require('fs');
const path = require('path');

const dir = 'combined_batches';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql'));

const docNumbers = new Map();

files.forEach(file => {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const matches = content.matchAll(/document_number = '(\d+)'/g);
    for (const match of matches) {
        const doc = match[1];
        if (!docNumbers.has(doc)) {
            docNumbers.set(doc, []);
        }
        docNumbers.get(doc).push(file);
    }
});

const duplicates = [];
for (const [doc, files] of docNumbers.entries()) {
    if (files.length > 1) {
        duplicates.push({ doc, files });
    }
}

console.log(JSON.stringify(duplicates, null, 2));
