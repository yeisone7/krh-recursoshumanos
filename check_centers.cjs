const fs = require('fs');
const csvPath = 'c:/Users/YEISON/Proyectos AI/krh-recursoshumanos/ImportarEmpPetro.csv';
const mappingsPath = 'C:/Users/YEISON/.gemini/antigravity/brain/12da31e2-01da-46c4-abe7-129d0c0c12bd/db_mappings.json';

const content = fs.readFileSync(csvPath, 'latin1');
const lines = content.split('\n');
const headers = lines[0].split(';');
const centerIdx = headers.findIndex(h => h.toLowerCase().trim() === 'centro de operaciones');

const mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
const centersInDb = mappings.filter(m => m.type === 'center').map(m => m.name.toLowerCase());

const missingCenters = new Set();

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(';');
    const center = values[centerIdx] ? values[centerIdx].trim() : '';
    if (center && !centersInDb.includes(center.toLowerCase())) {
        missingCenters.add(center);
    }
}

console.log('Missing Centers:', Array.from(missingCenters));
