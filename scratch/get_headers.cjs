const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'c:/Users/YEISON/Proyectos AI/krh-recursoshumanos/EmpleadosCosecharte.xlsx';
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet);

const headers = Object.keys(data[0]);
fs.writeFileSync('c:/Users/YEISON/Proyectos AI/krh-recursoshumanos/scratch/headers.txt', headers.join('\n'));
console.log('Headers written to scratch/headers.txt');
