const xlsx = require('xlsx');
const fs = require('fs');

const company_id = '11a12ece-a130-4682-9a8a-cba4325dadf0';
const employeeMapping = JSON.parse(fs.readFileSync('scratch/employee_mapping.json', 'utf8'));
const catalogMapping = JSON.parse(fs.readFileSync('scratch/catalog_mapping.json', 'utf8'));

const workbook = xlsx.readFile('EmpleadosCosecharte.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet);

function toTitleCase(str) {
    if (!str || typeof str !== 'string') return '';
    return str.toLowerCase().split(' ').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

function excelDateToISO(excelDate) {
    if (!excelDate) return null;
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
}

const linkTypeMapping = {
    'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO': 'fijo',
    'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO': 'indefinido',
    'CONTRATO POR OBRA O LABOR DETERMINADA': 'obra_labor',
    'CONTRATO DE APRENDIZAJE': 'aprendizaje'
};

let sql = '';

rows.forEach(row => {
    const docNumber = String(row['Identidificación']).trim();
    const employee_id = employeeMapping[docNumber];
    
    if (!employee_id) {
        console.warn(`Employee with doc ${docNumber} not found in mapping. Skipping.`);
        return;
    }

    const opCenterName = toTitleCase(String(row['Centro de Operaciones']).trim());
    const areaName = toTitleCase(String(row['Área']).trim());
    const cargoName = toTitleCase(String(row['Cargo']).trim());
    
    const opCenterId = catalogMapping.opCenters[opCenterName] || null;
    const areaId = catalogMapping.areas[areaName] || null;
    const positionId = catalogMapping.positions[cargoName] || null;
    
    const hireDate = excelDateToISO(row['fechaIngreso']);
    const linkType = linkTypeMapping[row['Tipo de Contrato']] || 'indefinido';
    const costCenter = toTitleCase(String(row['Centro de Costo']).trim());
    const workCity = toTitleCase(String(row['Ciudad Donde Labora']).trim());
    const salary = row['salario'] || 0;

    sql += `-- Work Info for ${docNumber}\n`;
    sql += `INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '${employee_id}', '${company_id}', ${opCenterId ? `'${opCenterId}'` : 'NULL'}, '${costCenter.replace(/'/g, "''")}', ${areaId ? `'${areaId}'` : 'NULL'}, ${positionId ? `'${positionId}'` : 'NULL'}, '${cargoName.replace(/'/g, "''")}', '${workCity.replace(/'/g, "''")}', '${hireDate}', '${linkType}', true, '${hireDate}'
) ON CONFLICT DO NOTHING;\n`;

    sql += `-- Contract for ${docNumber}\n`;
    sql += `INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '${employee_id}', '${company_id}', '${String(row['Tipo de Contrato']).replace(/'/g, "''")}', '${hireDate}', ${salary}, '${workCity.replace(/'/g, "''")}', false
) ON CONFLICT DO NOTHING;\n\n`;

    const index = rows.indexOf(row);
    if ((index + 1) % 60 === 0 || index === rows.length - 1) {
        const part = Math.ceil((index + 1) / 60);
        fs.writeFileSync(`scratch/block3_part${part}.sql`, sql);
        console.log(`SQL for Block 3 Part ${part} generated.`);
        sql = '';
    }
});

console.log('Total records processed:', rows.length);
