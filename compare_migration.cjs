const fs = require('fs');

const csvPath = 'ImportarEmpPetro.csv';
const dbOutputPath = 'C:/Users/YEISON/.gemini/antigravity/brain/bcc78b7e-5cfb-4986-9655-0c933a9f7d90/.system_generated/steps/643/output.txt';

try {
    const csvData = fs.readFileSync(csvPath, 'utf8');
    const dbOutputRaw = fs.readFileSync(dbOutputPath, 'utf8');
    const dbOutput = JSON.parse(dbOutputRaw);
    
    // Extract the JSON list from the "result" string
    const resultMatch = dbOutput.result.match(/<untrusted-data-.*?>(.*?)<\/untrusted-data-.*?>/s);
    if (!resultMatch) {
        console.error('Could not find data in result');
        process.exit(1);
    }
    const dbDocs = JSON.parse(resultMatch[1]);

    const csvDocs = new Set();
    csvData.split('\n').forEach(line => {
        const parts = line.split(';');
        if (parts.length > 10) {
            csvDocs.add(parts[10].trim());
        }
    });

    let countIn = 0;
    let countOut = 0;
    const outDocs = [];
    dbDocs.forEach(row => {
        if (csvDocs.has(row.document_number)) {
            countIn++;
        } else {
            countOut++;
            outDocs.push(row.document_number);
        }
    });

    console.log('Total in DB:', dbDocs.length);
    console.log('In CSV:', countIn);
    console.log('NOT in CSV:', countOut);
    if (countOut > 0) {
        console.log('Sample NOT in CSV:', outDocs.slice(0, 5).join(', '));
    }
} catch (e) {
    console.error(e);
}
