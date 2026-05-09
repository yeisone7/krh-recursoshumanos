const fs = require('fs');
const path = require('path');

const inputPath = 'C:\\Users\\YEISON\\.gemini\\antigravity\\brain\\12da31e2-01da-46c4-abe7-129d0c0c12bd\\.system_generated\\steps\\1227\\output.txt';
const content = fs.readFileSync(inputPath, 'utf8');
const fileData = JSON.parse(content);
const resultStr = fileData.result;
const start = resultStr.indexOf('[');
const end = resultStr.lastIndexOf(']') + 1;
if (start === -1 || end === 0) {
    console.error('No JSON array found in result');
    process.exit(1);
}
const data = JSON.parse(resultStr.substring(start, end));

const mapping = {};
data.forEach(item => {
    mapping[item.document_number] = item.id;
});

fs.writeFileSync('c:\\Users\\YEISON\\Proyectos AI\\krh-recursoshumanos\\scratch\\employee_mapping.json', JSON.stringify(mapping, null, 2));
console.log('Employee mapping saved to scratch/employee_mapping.json');
