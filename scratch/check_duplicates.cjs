const XLSX = require('xlsx');
const path = require('path');

const filePath = 'c:\\Users\\YEISON\\Proyectos AI\\krh-recursoshumanos\\EmpleadosCosecharte.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

const docs = data.map(r => r['Identidificación']?.toString().trim()).filter(d => d);
const duplicates = docs.filter((item, index) => docs.indexOf(item) !== index);

console.log('Total records:', data.length);
console.log('Unique documents:', new Set(docs).size);
console.log('Duplicates:', duplicates);
