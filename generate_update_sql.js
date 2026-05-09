const fs = require('fs');
const employees = JSON.parse(fs.readFileSync('employees_to_update.json', 'utf8'));

// Filter out duplicates to have only one name per document_number for the update
const uniqueEmployees = Array.from(new Map(employees.map(e => [e.doc, e])).values());

const values = uniqueEmployees.map(e => {
  const fn = e.fn.replace(/'/g, "''");
  const mn = e.mn.replace(/'/g, "''");
  const ln = e.ln.replace(/'/g, "''");
  const sln = e.sln.replace(/'/g, "''");
  return `('${e.doc}', '${fn}', '${mn}', '${ln}', '${sln}')`;
}).join(',');

const sql = `UPDATE public.employees_v2 
SET 
  first_name = v.fn, 
  middle_name = v.mn, 
  last_name = v.ln, 
  second_last_name = v.sln 
FROM (VALUES ${values}) AS v(doc, fn, mn, ln, sln) 
WHERE employees_v2.document_number = v.doc 
AND employees_v2.company_id = '11a12ece-a130-4682-9a8a-cba4325dadf0';`;

fs.writeFileSync('update_employees.sql', sql);
console.log('SQL generated in update_employees.sql');
