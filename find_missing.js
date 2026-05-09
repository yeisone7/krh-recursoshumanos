import pkg from 'xlsx';
const { readFile, utils } = pkg;
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const companyId = '11a12ece-a130-4682-9a8a-cba4325dadf0';

async function run() {
  const workbook = readFile('EmpleadosCosecharte.xlsx');
  const excelData = utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  const excelDocs = excelData.map(row => String(row['Identidificación']));

  const { data: dbEmployees, error } = await supabase
    .from('employees_v2')
    .select('document_number')
    .eq('company_id', companyId);

  if (error) {
    console.error('Error fetching employees:', error);
    return;
  }

  const dbDocs = dbEmployees.map(e => String(e.document_number));

  const missingInDb = excelDocs.filter(doc => !dbDocs.includes(doc));
  const missingInExcel = dbDocs.filter(doc => !excelDocs.includes(doc));

  console.log('Missing in DB:', missingInDb);
  console.log('Missing in Excel:', missingInExcel);
  
  // Also check for duplicates in excelData itself
  const counts = {};
  excelDocs.forEach(doc => counts[doc] = (counts[doc] || 0) + 1);
  const excelDuplicates = Object.keys(counts).filter(doc => counts[doc] > 1);
  console.log('Duplicates in Excel:', excelDuplicates);
}

run();
