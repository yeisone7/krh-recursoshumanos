const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'c:/Users/YEISON/Proyectos AI/krh-recursoshumanos/EmpleadosCosecharte.xlsx';
const companyId = '11a12ece-a130-4682-9a8a-cba4325dadf0';

function toTitleCase(str) {
    if (!str || typeof str !== 'string') return '';
    return str.toLowerCase().split(' ').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

function excelDateToISO(serial) {
    if (!serial || serial === 'NULL' || isNaN(serial)) return null;
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
}

const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet);

let sql = `-- MIGRATION BLOCK 2: EMPLOYEES (IDENTITY)\n\n`;

data.forEach((row, index) => {
    const documentType = row['Tipo de Identificación'] === 'CEDULA DE CIUDADANIA' ? 'CC' : 
                         row['Tipo de Identificación'] === 'CEDULA DE EXTRANJERIA' ? 'CE' : 'CC'; // Default to CC
    
    const docNumber = String(row['Identidificación']).trim();
    const firstName = toTitleCase(String(row['primerNombre']).trim());
    const middleName = row['segundoNombre'] ? toTitleCase(String(row['segundoNombre']).trim()) : null;
    const lastName = toTitleCase(String(row['primerApellido']).trim());
    const secondLastName = row['segundoApellido'] ? toTitleCase(String(row['segundoApellido']).trim()) : null;
    
    const gender = row['Sexo Biológico'] === 'MASCULINO' ? 'M' : 
                   row['Sexo Biológico'] === 'FEMENINO' ? 'F' : 'O';
    
    const bloodType = String(row['Tipo de Sangre']).trim();
    
    const maritalStatusRaw = String(row['Estado Civil']).toLowerCase().trim();
    const maritalStatus = maritalStatusRaw.includes('soltero') ? 'soltero' :
                          maritalStatusRaw.includes('casado') ? 'casado' :
                          maritalStatusRaw.includes('union') ? 'union_libre' :
                          maritalStatusRaw.includes('divorciado') ? 'divorciado' :
                          maritalStatusRaw.includes('viudo') ? 'viudo' : 'soltero';

    const birthDate = excelDateToISO(row['fechaNacimiento']);
    const issueDate = excelDateToISO(row['fechaExpedida']);
    
    const issueCity = toTitleCase(String(row['Ciudad de Expedición']).trim());
    const birthCountry = toTitleCase(String(row['País de Nacimiento']).trim());
    const birthDept = toTitleCase(String(row['Departamento de Nacimiento']).trim());
    const birthCity = toTitleCase(String(row['Ciudad de Nacimiento']).trim());

    sql += `INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '${companyId}', '${documentType}', '${docNumber}', '${issueCity.replace(/'/g, "''")}', ${issueDate ? `'${issueDate}'` : 'NULL'},
        '${firstName.replace(/'/g, "''")}', ${middleName ? `'${middleName.replace(/'/g, "''")}'` : 'NULL'}, '${lastName.replace(/'/g, "''")}', ${secondLastName ? `'${secondLastName.replace(/'/g, "''")}'` : 'NULL'},
        '${birthCountry.replace(/'/g, "''")}', '${birthDept.replace(/'/g, "''")}', '${birthCity.replace(/'/g, "''")}', ${birthDate ? `'${birthDate}'` : 'NULL'},
        '${gender}', '${bloodType}', '${maritalStatus}', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;\n`;
});

fs.writeFileSync('c:/Users/YEISON/Proyectos AI/krh-recursoshumanos/scratch/block2.sql', sql);
console.log('SQL for Block 2 generated in scratch/block2.sql');
