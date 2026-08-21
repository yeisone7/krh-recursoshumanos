import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const sourcePath = new URL('./employees.json', import.meta.url);
const outputDir = new URL('../../outputs/sexo_faltante_20260717/', import.meta.url);
const outputDirPath = fileURLToPath(outputDir);
const rows = JSON.parse(await fs.readFile(sourcePath, 'utf8'));

const workbook = Workbook.create();

function addEmployeeSheet(name, title, subtitle, data, tableName) {
  const sheet = workbook.worksheets.add(name);
  sheet.showGridLines = false;

  sheet.getRange('A1:C1').merge();
  sheet.getRange('A1').values = [[title]];
  sheet.getRange('A2:C2').merge();
  sheet.getRange('A2').values = [[`${subtitle} · Total: ${data.length}`]];

  const values = [
    ['Centro de Operación', 'Identificación', 'Nombres y Apellidos'],
    ...data.map((employee) => [
      employee.operation_center,
      employee.identification,
      employee.full_name,
    ]),
  ];
  const lastRow = 3 + values.length;
  sheet.getRange(`A4:C${lastRow}`).values = values;

  sheet.getRange('A1:C1').format = {
    fill: '#1F4E78',
    font: { bold: true, color: '#FFFFFF', size: 16 },
    verticalAlignment: 'center',
  };
  sheet.getRange('A1:C1').format.rowHeight = 30;
  sheet.getRange('A2:C2').format = {
    fill: '#D9EAF7',
    font: { color: '#1F2937', italic: true, size: 10 },
    verticalAlignment: 'center',
  };
  sheet.getRange('A2:C2').format.rowHeight = 22;
  sheet.getRange('A4:C4').format = {
    fill: '#5B9BD5',
    font: { bold: true, color: '#FFFFFF' },
    verticalAlignment: 'center',
  };
  sheet.getRange('A4:C4').format.rowHeight = 24;
  sheet.getRange(`A5:C${lastRow}`).format = {
    font: { color: '#1F2937', size: 10 },
    verticalAlignment: 'center',
    borders: {
      insideHorizontal: { style: 'thin', color: '#E5E7EB' },
    },
  };
  sheet.getRange(`B5:B${lastRow}`).format.numberFormat = '@';
  sheet.getRange(`A5:A${lastRow}`).format.columnWidth = 29;
  sheet.getRange(`B5:B${lastRow}`).format.columnWidth = 18;
  sheet.getRange(`C5:C${lastRow}`).format.columnWidth = 38;
  sheet.getRange(`A5:C${lastRow}`).format.rowHeight = 19;

  const table = sheet.tables.add(`A4:C${lastRow}`, true, tableName);
  table.style = 'TableStyleMedium2';
  table.showFilterButton = true;
  table.showBandedRows = true;
  sheet.freezePanes.freezeRows(4);

  return sheet;
}

addEmployeeSheet(
  'Todos',
  'Empleados sin sexo diligenciado',
  'Incluye empleados activos e inactivos',
  rows,
  'EmpleadosSinSexoTodos',
);
addEmployeeSheet(
  'Activos',
  'Empleados activos sin sexo diligenciado',
  'Registros activos',
  rows.filter((employee) => employee.is_active),
  'EmpleadosSinSexoActivos',
);
addEmployeeSheet(
  'Inactivos',
  'Empleados inactivos sin sexo diligenciado',
  'Registros inactivos',
  rows.filter((employee) => !employee.is_active),
  'EmpleadosSinSexoInactivos',
);

await fs.mkdir(outputDir, { recursive: true });

for (const sheetName of ['Todos', 'Activos', 'Inactivos']) {
  const preview = await workbook.render({
    sheetName,
    range: `${sheetName}!A1:C18`,
    scale: 1,
    format: 'png',
  });
  await fs.writeFile(
    new URL(`preview_${sheetName.toLowerCase()}.png`, outputDir),
    new Uint8Array(await preview.arrayBuffer()),
  );
}

const inspection = await workbook.inspect({
  kind: 'table',
  range: 'Todos!A1:C12',
  include: 'values,formulas',
  tableMaxRows: 12,
  tableMaxCols: 3,
});
await fs.writeFile(new URL('inspection.ndjson', outputDir), inspection.ndjson, 'utf8');

const errors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 100 },
  summary: 'final formula error scan',
});
await fs.writeFile(new URL('formula_errors.ndjson', outputDir), errors.ndjson, 'utf8');

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDirPath}empleados_sin_sexo_20260717.xlsx`);

console.log(JSON.stringify({
  total: rows.length,
  activos: rows.filter((employee) => employee.is_active).length,
  inactivos: rows.filter((employee) => !employee.is_active).length,
}));
