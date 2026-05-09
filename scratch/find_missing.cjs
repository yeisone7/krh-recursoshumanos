const fs = require('fs');
const xlsx = require('xlsx');

const workbook = xlsx.readFile('EmpleadosCosecharte.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet);

const mapping = JSON.parse(fs.readFileSync('scratch/employee_mapping.json', 'utf8'));

const missing = rows.filter(row => !mapping[String(row['Identidificación'])]);

console.log('Missing employees in mapping:', missing.length);
missing.forEach(m => console.log(m['Identidificación'], m['primerNombre'], m['primerApellido']));
