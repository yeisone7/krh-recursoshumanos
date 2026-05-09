const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'c:/Users/YEISON/Proyectos AI/krh-recursoshumanos/EmpleadosCosecharte.xlsx';
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet);

const areas = new Set();
const opCenters = new Set();

function toTitleCase(str) {
    if (!str || typeof str !== 'string') return '';
    return str.toLowerCase().split(' ').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

data.forEach(row => {
    if (row['Área']) areas.add(toTitleCase(String(row['Área']).trim()));
    if (row['Centro de Operaciones']) opCenters.add(toTitleCase(String(row['Centro de Operaciones']).trim()));
});

console.log('Unique Areas from Excel:', Array.from(areas));
console.log('Unique Operation Centers from Excel:', Array.from(opCenters));

fs.writeFileSync('c:/Users/YEISON/Proyectos AI/krh-recursoshumanos/scratch/missing_catalogs.json', JSON.stringify({
    areas: Array.from(areas),
    opCenters: Array.from(opCenters)
}, null, 2));
