const fs = require('fs');
const path = require('path');

const csvPath = 'c:/Users/YEISON/Proyectos AI/krh-recursoshumanos/ImportarEmpPetro.csv';
const mappingsPath = 'c:/Users/YEISON/Proyectos AI/krh-recursoshumanos/db_mappings.json';

const PETROCASINOS_ID = '0a1a781e-e8ad-4ae6-a475-1f717c100304';
const LIMONAL_ID = 'b2377a7c-a871-4260-b118-0426a8849d19';

const mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));

function getMappingId(type, name) {
    if (!name || name === 'N/A' || name === 'Ninguno' || name === 'Sin área' || name === 'Sin Arl' || name.toLowerCase().includes('sin rea')) return null;
    const found = mappings.find(m => m.type === type && m.name.toLowerCase() === name.toLowerCase());
    return found ? found.id : null;
}

function excelDateToJs(serial) {
    if (!serial || isNaN(serial) || serial == 0) return null;
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
}

function formatDate(dateStr) {
    if (!dateStr || dateStr === '00/00/0000' || dateStr === 'NULL' || dateStr === '0' || dateStr === 'null') return null;
    if (!isNaN(dateStr) && dateStr.length > 4) {
        return excelDateToJs(parseFloat(dateStr));
    }
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        let d = parts[0].padStart(2, '0');
        let m = parts[1].padStart(2, '0');
        let y = parts[2];
        if (y.length === 2) y = '19' + y;
        return `${y}-${m}-${d}`;
    }
    return dateStr;
}

function cleanSalary(salaryStr) {
    if (!salaryStr) return 0;
    return parseFloat(salaryStr.replace(/[^0-9.]/g, '')) || 0;
}

function escapeSql(str) {
    if (!str) return '';
    return str.replace(/'/g, "''");
}

const content = fs.readFileSync(csvPath, 'latin1'); 
const lines = content.split('\n');
const rawHeaders = lines[0].split(';');

const headerMap = {};
rawHeaders.forEach((h, i) => {
    const clean = h.toLowerCase().trim();
    if (clean === 'empresa') headerMap.empresa = i;
    if (clean === 'centro de operaciones') headerMap.centro_operaciones = i;
    if (clean === 'area') headerMap.area = i;
    if (clean === 'primernombre') headerMap.primer_nombre = i;
    if (clean === 'segundonombre') headerMap.segundo_nombre = i;
    if (clean === 'primerapellido') headerMap.primer_apellido = i;
    if (clean === 'segundoapellido') headerMap.segundo_apellido = i;
    if (clean === 'identidificación' || clean === 'identidificaciï¿½n') headerMap.documento = i;
    if (clean === 'tipo de identificación' || clean === 'tipo de identificaciï¿½n') headerMap.tipo_id = i;
    if (clean === 'fechanacimiento') headerMap.fecha_nacimiento = i;
    if (clean === 'fechaingreso') headerMap.fecha_ingreso = i;
    if (clean === 'salario') headerMap.salario = i;
    if (clean === 'cargo') headerMap.cargo = i;
    if (clean === 'eps') headerMap.eps = i;
    if (clean === 'afp') headerMap.afp = i;
    if (clean === 'ccf') headerMap.ccf = i;
    if (clean === 'bancos') headerMap.banco = i;
    if (clean === 'cuenta de banco') headerMap.cuenta_numero = i;
    if (clean === 'tipo de cuenta') headerMap.cuenta_tipo = i;
    if (clean === 'tipo de contrato') headerMap.contrato_tipo = i;
});

// Final check for document header if not found
if (headerMap.documento === undefined) {
    headerMap.documento = rawHeaders.findIndex(h => h.toLowerCase().includes('identidificaci'));
}
if (headerMap.tipo_id === undefined) {
    headerMap.tipo_id = rawHeaders.findIndex(h => h.toLowerCase().includes('tipo de identificaci'));
}

const employees = [];

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(';');
    
    const getValue = (key) => {
        const idx = headerMap[key];
        return (idx !== undefined && values[idx]) ? values[idx].trim() : '';
    };

    const companyName = getValue('empresa');
    const companyId = companyName === 'El Limonal' ? LIMONAL_ID : PETROCASINOS_ID;
    
    let docType = 'CC';
    const rawDocType = getValue('tipo_id').toUpperCase();
    if (rawDocType.includes('EXTRANJER')) docType = 'CE';
    if (rawDocType.includes('PEP')) docType = 'PEP';
    if (rawDocType.includes('PROTECCI')) docType = 'PPT';
    if (rawDocType.includes('TARJETA')) docType = 'TI';

    const emp = {
        company_id: companyId,
        document_type: docType,
        document_number: getValue('documento'),
        first_name: escapeSql(getValue('primer_nombre')),
        middle_name: escapeSql(getValue('segundo_nombre')),
        last_name: escapeSql(getValue('primer_apellido')),
        second_last_name: escapeSql(getValue('segundo_apellido')),
        birth_date: formatDate(getValue('fecha_nacimiento')),
        entry_date: formatDate(getValue('fecha_ingreso')),
        salary: cleanSalary(getValue('salario')),
        position_id: getMappingId('position', getValue('cargo')),
        position_name: escapeSql(getValue('cargo')),
        area_id: getMappingId('area', getValue('area')),
        operation_center_id: getMappingId('center', getValue('centro_operaciones')),
        eps: escapeSql(getValue('eps')),
        afp: escapeSql(getValue('afp')),
        ccf: escapeSql(getValue('ccf')),
        bank_name: escapeSql(getValue('banco')),
        bank_account_number: getValue('cuenta_numero'),
        bank_account_type: getValue('cuenta_tipo').toLowerCase().includes('ahorro') ? 'ahorros' : 'corriente',
        contract_type: getValue('contrato_tipo').includes('Fijo') ? 'fijo' : 
                       getValue('contrato_tipo').includes('Aprendizaje') ? 'aprendizaje' : 
                       getValue('contrato_tipo').includes('Obra') ? 'obra_labor' : 'indefinido'
    };

    employees.push(emp);
}

// Generate SQL in batches of 50
const batchSize = 50;
for (let i = 0; i < employees.length; i += batchSize) {
    const batch = employees.slice(i, i + batchSize);
    let sql = 'DO $$\nDECLARE\n  emp_id UUID;\nBEGIN\n';
    
    batch.forEach(e => {
        sql += `  -- Empleado: ${e.document_number} (${e.first_name} ${e.last_name})\n`;
        sql += `  emp_id := NULL;\n`;
        sql += `  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)\n`;
        sql += `  SELECT '${e.company_id}', '${e.document_type}', '${e.document_number}', '${e.first_name}', '${e.middle_name}', '${e.last_name}', '${e.second_last_name}', ${e.birth_date ? `'${e.birth_date}'` : 'NULL'}, true\n`;
        sql += `  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '${e.company_id}' AND document_number = '${e.document_number}')\n`;
        sql += `  RETURNING id INTO emp_id;\n\n`;
        
        sql += `  IF emp_id IS NOT NULL THEN\n`;
        sql += `    -- Work Info\n`;
        sql += `    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)\n`;
        sql += `    VALUES (emp_id, '${e.company_id}', ${e.operation_center_id ? `'${e.operation_center_id}'` : 'NULL'}, ${e.area_id ? `'${e.area_id}'` : 'NULL'}, ${e.position_id ? `'${e.position_id}'` : 'NULL'}, '${e.position_name}', ${e.entry_date ? `'${e.entry_date}'` : 'NULL'}, true);\n\n`;
        
        sql += `    -- Contract\n`;
        sql += `    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)\n`;
        sql += `    VALUES (emp_id, '${e.company_id}', '${e.contract_type}', ${e.salary}, ${e.entry_date ? `'${e.entry_date}'` : 'NULL'});\n\n`;
        
        sql += `    -- Social Security\n`;
        sql += `    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)\n`;
        sql += `    VALUES (emp_id, '${e.company_id}', '${e.eps}', '${e.afp}', '${e.ccf}', true);\n\n`;
        
        sql += `    -- Bank Info\n`;
        sql += `    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)\n`;
        sql += `    VALUES (emp_id, '${e.company_id}', '${e.bank_name}', '${e.bank_account_number}', '${e.bank_account_type}', true);\n`;
        sql += `  END IF;\n\n`;
    });

    sql += 'END $$;';
    fs.writeFileSync(path.join(__dirname, `import_batch_v2_${Math.floor(i/batchSize) + 1}.sql`), sql, 'utf8');
}

console.log(`Generated ${Math.ceil(employees.length / batchSize)} batches.`);
