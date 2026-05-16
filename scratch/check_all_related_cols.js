
import fs from 'fs';
const data = JSON.parse(fs.readFileSync('C:\\Users\\YEISON\\.gemini\\antigravity\\brain\\5e5bcac7-adc2-429e-af04-72b38ad4b732\\.system_generated\\steps\\305\\output.txt', 'utf8'));
const tableNames = ['public.employee_work_info', 'public.employee_contact', 'public.contracts', 'public.employee_social_security', 'public.employee_bank_info', 'public.operation_centers', 'public.areas', 'public.positions'];
const result = {};

tableNames.forEach(name => {
  const table = data.tables.find(t => t.name === name);
  if (table) {
    result[name] = table.columns.map(c => ({ name: c.name, type: c.type }));
  }
});

console.log(JSON.stringify(result, null, 2));
