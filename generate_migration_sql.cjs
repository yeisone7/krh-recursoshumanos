const fs = require('fs');
const pkg = require('xlsx');

const mappingData = JSON.parse(fs.readFileSync('mapping_clean.json', 'utf8'));

const areaMap = new Map();
const positionMap = new Map();
const sedeMap = new Map();
const employeeMap = new Map();

mappingData.forEach(item => {
  const name = item.name.trim();
  if (item.type === 'area') areaMap.set(name, item.id);
  if (item.type === 'position') positionMap.set(name, item.id);
  if (item.type === 'sede') sedeMap.set(name, item.id);
  if (item.type === 'employee') employeeMap.set(name, item.id);
});

const companyId = '11a12ece-a130-4682-9a8a-cba4325dadf0';
const workbook = pkg.readFile('EmpleadosCosecharte.xlsx');
const excelData = pkg.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

const toTitleCase = s => s ? s.trim().toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';

const excelToLinkType = {
  'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO': 'fijo',
  'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO': 'indefinido',
  'CONTRATO POR OBRA O LABOR DETERMINADA': 'obra_labor',
  'CONTRATO DE APRENDIZAJE': 'aprendizaje',
  'TERMINO INDEFINIDO': 'indefinido',
  'TERMINO FIJO': 'fijo',
  'OBRA O LABOR': 'obra_labor',
  'PRESTACION DE SERVICIOS': 'servicios',
  'TEMPORAL': 'temporal'
};

const workInfoInserts = [];
const contractInserts = [];

excelData.forEach((row, index) => {
  const doc = String(row['Identidificación']);
  const employeeId = employeeMap.get(doc);
  if (!employeeId) {
    console.warn(`Employee not found in map: ${doc}`);
    return;
  }

  const areaName = toTitleCase(row['Área']);
  const areaId = areaMap.get(areaName) || null;

  const positionName = toTitleCase(row['Cargo']);
  const positionId = positionMap.get(positionName) || null;

  const sedeName = toTitleCase(row['Centro de Operaciones']);
  const sedeId = sedeMap.get(sedeName) || null;

  const hireDateSerial = row['fechaIngreso'];
  const hireDate = hireDateSerial ? new Date((hireDateSerial - 25569) * 86400 * 1000).toISOString().split('T')[0] : '2024-01-01';

  const linkType = excelToLinkType[row['Tipo de Contrato']] || 'indefinido';
  const salary = row['salario'] || 0;

  // Determine if this is the current record (for duplicates like Andres Hernandez)
  // Simple logic: if it's the last occurrence of the doc in the excel, it's current.
  const isLastOccurrence = excelData.map(r => String(r['Identidificación'])).lastIndexOf(doc) === index;

  workInfoInserts.push(`('${employeeId}', '${companyId}', ${areaId ? `'${areaId}'` : 'NULL'}, ${positionId ? `'${positionId}'` : 'NULL'}, '${positionName}', ${sedeId ? `'${sedeId}'` : 'NULL'}, '${hireDate}', ${isLastOccurrence}, '${hireDate}', '${linkType}')`);
  
  contractInserts.push(`('${employeeId}', '${companyId}', '${linkType}', '${hireDate}', ${salary})`);
});

const sql = `
-- Insertar Informacion Laboral
INSERT INTO public.employee_work_info (employee_id, company_id, area_id, position_id, position_name, operation_center_id, hire_date, is_current, valid_from, link_type)
VALUES 
${workInfoInserts.join(',\n')};

-- Insertar Contratos
INSERT INTO public.contracts (employee_id, company_id, contract_type, start_date, salary)
VALUES 
${contractInserts.join(',\n')};
`;

fs.writeFileSync('migrate_work_info.sql', sql);
console.log('Migration SQL generated in migrate_work_info.sql');
