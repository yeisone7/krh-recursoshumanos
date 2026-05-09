const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'c:/Users/YEISON/Proyectos AI/krh-recursoshumanos/EmpleadosCosecharte.xlsx';
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet);

const excelCargos = new Set();

function toTitleCase(str) {
    if (!str || typeof str !== 'string') return '';
    return str.toLowerCase().split(' ').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

data.forEach(row => {
    if (row['Cargo']) excelCargos.add(toTitleCase(String(row['Cargo']).trim()));
});

console.log('Unique Cargos from Excel:', Array.from(excelCargos));

fs.writeFileSync('c:/Users/YEISON/Proyectos AI/krh-recursoshumanos/scratch/excel_cargos.json', JSON.stringify(Array.from(excelCargos), null, 2));
