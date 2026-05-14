const fs = require('fs');
const path = require('path');

const insertsPath = 'c:\\Users\\YEISON\\Proyectos AI\\krh-recursoshumanos\\scratch\\missing_inserts.sql';
const content = fs.readFileSync(insertsPath, 'utf8');

// The file starts with a header line
const lines = content.split('\n');
const sqlBody = lines.slice(2).join('\n');

const mismatchingDocs = ['1005332468','37544141','1193424581','63511398','91296123','28151909','1103740491'];
const petrocasinosId = '0a1a781e-e8ad-4ae6-a475-1f717c100304';

const recoveryScript = `
DO $$ 
DECLARE 
    emp_id UUID;
BEGIN
    -- 1. Correct company_id for 7 records found in El Limonal
    UPDATE public.employees_v2 
    SET company_id = '${petrocasinosId}'
    WHERE document_number IN (${mismatchingDocs.map(d => `'${d}'`).join(',')});

    -- 2. Insert 72 missing records
    ${sqlBody}
END $$;
`;

fs.writeFileSync('c:\\Users\\YEISON\\Proyectos AI\\krh-recursoshumanos\\scratch\\final_recovery.sql', recoveryScript, 'utf8');
console.log('Final recovery script generated at scratch/final_recovery.sql');
