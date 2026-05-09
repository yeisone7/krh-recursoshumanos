const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = 'c:/Users/YEISON/Proyectos AI/krh-recursoshumanos/EmpleadosCosecharte.xlsx';
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet);

const catalogs = {
    cargos: new Set(),
    areas: new Set(),
    sedes: new Set(),
    eps: new Set(),
    afp: new Set(),
    arl: new Set(),
    ccf: new Set(),
    ips: new Set(),
    afc: new Set(),
    bancos: new Set(),
    tiposContrato: new Set(),
    tiposTurno: new Set(),
    generos: new Set(),
    tiposSangre: new Set(),
    estadosCiviles: new Set(),
    nivelesEducativos: new Set(),
    ciudades: new Set(),
    departamentos: new Set()
};

function safeAdd(set, val) {
    if (val !== undefined && val !== null) {
        set.add(String(val).trim());
    }
}

data.forEach(row => {
    safeAdd(catalogs.cargos, row['Cargo']);
    safeAdd(catalogs.areas, row['Área']);
    safeAdd(catalogs.sedes, row['Centro de Operaciones']);
    safeAdd(catalogs.eps, row['EPS']);
    safeAdd(catalogs.afp, row['AFP']);
    safeAdd(catalogs.arl, row['ARL']);
    safeAdd(catalogs.ccf, row['CCF']);
    safeAdd(catalogs.ips, row['IPS']);
    safeAdd(catalogs.afc, row['AFC']);
    safeAdd(catalogs.bancos, row['Banco']);
    safeAdd(catalogs.tiposContrato, row['Tipo de Contrato']);
    safeAdd(catalogs.tiposTurno, row['Tipo de Turno']);
    safeAdd(catalogs.generos, row['Sexo Biológico']);
    safeAdd(catalogs.tiposSangre, row['Tipo de Sangre']);
    safeAdd(catalogs.estadosCiviles, row['Estado Civil']);
    safeAdd(catalogs.nivelesEducativos, row['Nivel Educativo']);
    
    safeAdd(catalogs.ciudades, row['Ciudad de Nacimiento']);
    safeAdd(catalogs.ciudades, row['Ciudad de Recidencia']);
    safeAdd(catalogs.ciudades, row['Ciudad Donde Labora']);
    
    safeAdd(catalogs.departamentos, row['Departamento de Nacimiento']);
    safeAdd(catalogs.departamentos, row['Departamento de Recidencia']);
});

const result = {};
for (const [key, set] of Object.entries(catalogs)) {
    result[key] = Array.from(set).sort();
}

fs.writeFileSync('c:/Users/YEISON/Proyectos AI/krh-recursoshumanos/scratch/catalog_values.json', JSON.stringify(result, null, 2));
console.log('Catalog values written to scratch/catalog_values.json');
