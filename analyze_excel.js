import pkg from 'xlsx';
const { readFile, utils } = pkg;

const filePath = 'c:\\Users\\YEISON\\Proyectos AI\\krh-recursoshumanos\\EmpleadosCosecharte.xlsx';

try {
  const workbook = readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = utils.sheet_to_json(worksheet);

  console.log('--- Resumen del archivo ---');
  console.log(`Hojas: ${workbook.SheetNames.join(', ')}`);
  console.log(`Total de filas: ${data.length}`);
  console.log('\n--- Primeros 10 registros ---');
  console.log(JSON.stringify(data.slice(0, 10), null, 2));
} catch (error) {
  console.error('Error al leer el archivo:', error.message);
}
