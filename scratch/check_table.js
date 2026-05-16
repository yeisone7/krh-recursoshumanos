
import fs from 'fs';
const data = JSON.parse(fs.readFileSync('C:\\Users\\YEISON\\.gemini\\antigravity\\brain\\5e5bcac7-adc2-429e-af04-72b38ad4b732\\.system_generated\\steps\\305\\output.txt', 'utf8'));
const table = data.tables.find(t => t.name === 'public.employee_work_info');
if (table) {
  console.log(JSON.stringify(table.columns.map(c => c.name), null, 2));
} else {
  console.log('Table not found');
}
