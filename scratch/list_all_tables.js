
import fs from 'fs';
const data = JSON.parse(fs.readFileSync('C:\\Users\\YEISON\\.gemini\\antigravity\\brain\\5e5bcac7-adc2-429e-af04-72b38ad4b732\\.system_generated\\steps\\305\\output.txt', 'utf8'));
const tables = data.tables.map(t => t.name);
console.log(JSON.stringify(tables, null, 2));
