const fs = require('fs');

async function check() {
    const csvData = fs.readFileSync('ImportarEmpPetro.csv', 'utf8');
    const dbData = fs.readFileSync('db_employees.txt', 'utf8'); // I will save the db result here

    const csvDocs = new Set();
    csvData.split('\n').forEach(line => {
        const parts = line.split(';');
        if (parts.length > 10) {
            csvDocs.add(parts[10].trim());
        }
    });

    const dbDocs = JSON.parse(dbData);
    let countIn = 0;
    let countOut = 0;
    dbDocs.forEach(row => {
        if (csvDocs.has(row.document_number)) {
            countIn++;
        } else {
            countOut++;
            console.log('Not in CSV:', row.document_number);
        }
    });

    console.log('Total in DB:', dbDocs.length);
    console.log('In CSV:', countIn);
    console.log('NOT in CSV:', countOut);
}

// I need the db_employees.txt file first.
