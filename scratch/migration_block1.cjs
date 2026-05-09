const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'c:/Users/YEISON/Proyectos AI/krh-recursoshumanos/EmpleadosCosecharte.xlsx';
const companyId = '11a12ece-a130-4682-9a8a-cba4325dadf0';

function toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet);

const catalogs = {
    areas: new Set(),
    positions: new Set(),
    eps: new Set(),
    afp: new Set(),
    arl: new Set(),
    ccf: new Set(),
    banks: new Set(),
    operation_centers: new Set(['Principal'])
};

data.forEach(row => {
    if (row['Área']) catalogs.areas.add(toTitleCase(String(row['Área']).trim()));
    if (row['Cargo']) catalogs.positions.add(toTitleCase(String(row['Cargo']).trim()));
    if (row['EPS']) catalogs.eps.add(toTitleCase(String(row['EPS']).trim()));
    if (row['AFP']) catalogs.afp.add(toTitleCase(String(row['AFP']).trim()));
    if (row['ARL']) catalogs.arl.add(toTitleCase(String(row['ARL']).trim()));
    if (row['CCF']) catalogs.ccf.add(toTitleCase(String(row['CCF']).trim()));
    if (row['Banco']) catalogs.banks.add(toTitleCase(String(row['Banco']).trim()));
    if (row['Centro de Operaciones']) catalogs.operation_centers.add(toTitleCase(String(row['Centro de Operaciones']).trim()));
});

// Generate SQL
let sql = `-- MIGRATION BLOCK 1: CATALOGS\n`;

// Areas
sql += `\n-- Areas\n`;
Array.from(catalogs.areas).forEach(name => {
    sql += `INSERT INTO public.areas (company_id, name) VALUES ('${companyId}', '${name.replace(/'/g, "''")}') ON CONFLICT (company_id, name) DO NOTHING;\n`;
});

// Positions
sql += `\n-- Positions\n`;
Array.from(catalogs.positions).forEach(name => {
    sql += `INSERT INTO public.positions (company_id, name) VALUES ('${companyId}', '${name.replace(/'/g, "''")}') ON CONFLICT (company_id, name) DO NOTHING;\n`;
});

// Operation Centers
sql += `\n-- Operation Centers\n`;
Array.from(catalogs.operation_centers).forEach(name => {
    sql += `INSERT INTO public.operation_centers (company_id, name) VALUES ('${companyId}', '${name.replace(/'/g, "''")}') ON CONFLICT (company_id, name) DO NOTHING;\n`;
});

// EPS
sql += `\n-- EPS\n`;
Array.from(catalogs.eps).forEach(name => {
    sql += `INSERT INTO public.catalog_eps (company_id, name) VALUES ('${companyId}', '${name.replace(/'/g, "''")}') ON CONFLICT (company_id, name) DO NOTHING;\n`;
});

// AFP
sql += `\n-- AFP\n`;
Array.from(catalogs.afp).forEach(name => {
    sql += `INSERT INTO public.catalog_afp (company_id, name) VALUES ('${companyId}', '${name.replace(/'/g, "''")}') ON CONFLICT (company_id, name) DO NOTHING;\n`;
});

// ARL
sql += `\n-- ARL\n`;
Array.from(catalogs.arl).forEach(name => {
    sql += `INSERT INTO public.catalog_arl (company_id, name) VALUES ('${companyId}', '${name.replace(/'/g, "''")}') ON CONFLICT (company_id, name) DO NOTHING;\n`;
});

// CCF
sql += `\n-- CCF\n`;
Array.from(catalogs.ccf).forEach(name => {
    sql += `INSERT INTO public.catalog_ccf (company_id, name) VALUES ('${companyId}', '${name.replace(/'/g, "''")}') ON CONFLICT (company_id, name) DO NOTHING;\n`;
});

// Banks
sql += `\n-- Banks\n`;
Array.from(catalogs.banks).forEach(name => {
    sql += `INSERT INTO public.catalog_banks (company_id, name) VALUES ('${companyId}', '${name.replace(/'/g, "''")}') ON CONFLICT (company_id, name) DO NOTHING;\n`;
});

fs.writeFileSync('c:/Users/YEISON/Proyectos AI/krh-recursoshumanos/scratch/block1.sql', sql);
console.log('SQL for Block 1 generated in scratch/block1.sql');
