import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const repoDir = "C:\\Users\\ASUS\\Programacion IA\\krh-recursoshumanos";
const workDir = path.join(repoDir, "outputs", "019ff0ec-fd58-7071-a30f-ba972dbb0e81", "work");
const outputDir = path.join(repoDir, "outputs", "019ff0ec-fd58-7071-a30f-ba972dbb0e81");
const outputPath = path.join(outputDir, "empleados_sin_sexo_por_centro.xlsx");
const supabaseCli = "C:\\Users\\ASUS\\AppData\\Roaming\\npm\\node_modules\\supabase\\dist\\supabase.js";
const companyId = "0a1a781e-e8ad-4ae6-a475-1f717c100304";
const companyName = "Petrocasinos S.A.";

const sql = `
with current_work as (
  select distinct on (employee_id)
    employee_id,
    operation_center_id,
    position_name,
    hire_date
  from public.employee_work_info
  where company_id = '${companyId}'
    and is_current = true
  order by employee_id, valid_from desc, updated_at desc
)
select
  coalesce(oc.name, 'Sin centro asignado') as operation_center,
  coalesce(oc.code, '') as operation_center_code,
  e.document_type::text as document_type,
  e.document_number,
  concat_ws(' ', e.first_name, nullif(e.middle_name, '')) as given_names,
  concat_ws(' ', e.last_name, nullif(e.second_last_name, '')) as surnames,
  coalesce(nullif(w.position_name, ''), 'Sin cargo registrado') as position_name,
  w.hire_date,
  e.status::text as employee_status
from public.employees_v2 e
left join current_work w on w.employee_id = e.id
left join public.operation_centers oc
  on oc.id = w.operation_center_id
 and oc.company_id = e.company_id
where e.company_id = '${companyId}'
  and e.is_active = true
  and e.gender is null
order by
  coalesce(oc.name, 'Sin centro asignado'),
  e.last_name,
  e.second_last_name nulls first,
  e.first_name,
  e.middle_name nulls first,
  e.document_number;
`;

function queryLinkedDatabase(query) {
  const result = spawnSync(
    process.execPath,
    [supabaseCli, "db", "query", "--linked", "--output", "json", query],
    {
      cwd: repoDir,
      encoding: "utf8",
      timeout: 90000,
      maxBuffer: 20 * 1024 * 1024,
      env: {
        ...process.env,
        NO_COLOR: "1",
        SUPABASE_NO_ANALYTICS: "1",
        DO_NOT_TRACK: "1",
      },
    },
  );

  const stdout = result.stdout || "";
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error(`No se pudo leer la respuesta de Supabase. ${result.stderr || ""}`);
  }
  const payload = JSON.parse(stdout.slice(start, end + 1));
  if (!Array.isArray(payload.rows)) {
    throw new Error("La consulta no devolvio una matriz de filas.");
  }
  return payload.rows;
}

function excelText(value) {
  return String(value ?? "").replaceAll('"', '""');
}

function asDate(value) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function mapStatus(value) {
  return value === "active" ? "Activo" : String(value ?? "");
}

const employees = queryLinkedDatabase(sql);
if (employees.length === 0) {
  throw new Error("No se encontraron empleados activos con sexo sin diligenciar.");
}

const countsByCenter = new Map();
for (const employee of employees) {
  countsByCenter.set(employee.operation_center, (countsByCenter.get(employee.operation_center) || 0) + 1);
}

const centersAlphabetical = [...countsByCenter.keys()].sort((a, b) => a.localeCompare(b, "es"));
const centersByCount = [...countsByCenter.entries()].sort(
  (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"),
);

const workbook = Workbook.create();
const summary = workbook.worksheets.add("Resumen");
const grouped = workbook.worksheets.add("Listado agrupado");
const base = workbook.worksheets.add("Base filtrable");

const darkGreen = "#0B6B50";
const green = "#20B987";
const paleGreen = "#E8F7F1";
const deepSlate = "#213547";
const paleSlate = "#F3F6F8";
const orange = "#F59E0B";
const paleOrange = "#FFF4D6";
const white = "#FFFFFF";
const border = "#D7E2E0";
const bodyFont = "Aptos";

for (const sheet of [summary, grouped, base]) {
  sheet.showGridLines = false;
}

// Base filtrable: fuente de detalle y soporte de las formulas del resumen.
base.getRange("A1:J1").merge();
base.getRange("A1").values = [["Base filtrable · empleados activos sin sexo diligenciado"]];
base.getRange("A2:J2").merge();
base.getRange("A2").values = [[`${companyName} · Corte: 11 de agosto de 2026`]];
base.getRange("A3:J3").merge();
base.getRange("A3").values = [["Use los filtros de los encabezados para buscar por centro, documento, nombre o cargo."]];

const baseHeaders = [
  "Centro de operación",
  "Código",
  "Tipo doc.",
  "Número de documento",
  "Nombres",
  "Apellidos",
  "Cargo actual",
  "Fecha de ingreso",
  "Estado",
  "Sexo",
];
base.getRange("A4:J4").values = [baseHeaders];
const baseData = employees.map((employee) => [
  employee.operation_center,
  employee.operation_center_code,
  employee.document_type,
  employee.document_number,
  employee.given_names,
  employee.surnames,
  employee.position_name,
  asDate(employee.hire_date),
  mapStatus(employee.employee_status),
  "Sin diligenciar",
]);
const baseFirstRow = 5;
const baseLastRow = baseFirstRow + baseData.length - 1;
base.getRange(`A${baseFirstRow}:J${baseLastRow}`).values = baseData;
base.getRange(`D${baseFirstRow}:D${baseLastRow}`).format.numberFormat = "@";
base.getRange(`H${baseFirstRow}:H${baseLastRow}`).format.numberFormat = "yyyy-mm-dd";
base.getRange(`A${baseFirstRow}:J${baseLastRow}`).format.font = { name: bodyFont, size: 10, color: deepSlate };
base.getRange(`C${baseFirstRow}:D${baseLastRow}`).format.horizontalAlignment = "center";
base.getRange(`H${baseFirstRow}:J${baseLastRow}`).format.horizontalAlignment = "center";
base.getRange(`A${baseFirstRow}:J${baseLastRow}`).format.rowHeight = 20;

base.getRange("A1:J1").format = {
  fill: darkGreen,
  font: { name: bodyFont, size: 18, bold: true, color: white },
  verticalAlignment: "center",
};
base.getRange("A1:J1").format.rowHeight = 32;
base.getRange("A2:J2").format = {
  fill: paleGreen,
  font: { name: bodyFont, size: 11, bold: true, color: darkGreen },
};
base.getRange("A3:J3").format = {
  fill: white,
  font: { name: bodyFont, size: 10, italic: true, color: deepSlate },
};
base.getRange("A4:J4").format = {
  fill: green,
  font: { name: bodyFont, size: 10, bold: true, color: white },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "outside", style: "thin", color: darkGreen },
};
base.getRange("A4:J4").format.rowHeight = 30;
base.getRange(`A${baseFirstRow}:J${baseLastRow}`).format.borders = {
  insideHorizontal: { style: "thin", color: border },
};
base.getRange(`J${baseFirstRow}:J${baseLastRow}`).conditionalFormats.add("containsText", {
  text: "Sin diligenciar",
  format: { fill: paleOrange, font: { bold: true, color: "#9A5B00" } },
});

const baseTable = base.tables.add(`A4:J${baseLastRow}`, true, "EmpleadosSinSexoTable");
baseTable.style = "TableStyleMedium4";
baseTable.showBandedRows = true;
baseTable.showFilterButton = true;
base.freezePanes.freezeRows(4);
base.getRange(`A1:J${baseLastRow}`).format.font.name = bodyFont;

const baseWidths = [34, 12, 11, 19, 25, 25, 34, 16, 12, 19];
for (let col = 0; col < baseWidths.length; col += 1) {
  base.getRangeByIndexes(0, col, baseLastRow, 1).format.columnWidth = baseWidths[col];
}

// Resumen formula-driven por centro.
summary.getRange("A1:E1").merge();
summary.getRange("A1").values = [["Empleados activos sin sexo diligenciado"]];
summary.getRange("A2:E2").merge();
summary.getRange("A2").values = [[`${companyName} · Agrupación por centro de operación`]];
summary.getRange("A1:G3").format.font.name = bodyFont;
summary.getRange("A1:E1").format = {
  fill: darkGreen,
  font: { name: bodyFont, size: 20, bold: true, color: white },
  verticalAlignment: "center",
};
summary.getRange("A1:E1").format.rowHeight = 34;
summary.getRange("A2:E2").format = {
  fill: paleGreen,
  font: { name: bodyFont, size: 11, bold: true, color: darkGreen },
};

const logoPath = path.join(repoDir, "src", "assets", "petrocasinos-logo-full.png");
const logoData = await fs.readFile(logoPath);
summary.images.add({
  dataUrl: `data:image/png;base64,${logoData.toString("base64")}`,
  anchor: { from: { row: 0, col: 5 }, extent: { widthPx: 76, heightPx: 76 } },
});

summary.getRange("A5:B5").merge();
summary.getRange("A5").values = [["TOTAL PENDIENTES"]];
summary.getRange("A6:B7").merge();
summary.getRange("A6").formulas = [[`=COUNTA('Base filtrable'!$A$${baseFirstRow}:$A$${baseLastRow})`]];
summary.getRange("C5:D5").merge();
summary.getRange("C5").values = [["CENTROS CON PENDIENTES"]];
summary.getRange("C6:D7").merge();
summary.getRange("C6").values = [[centersAlphabetical.length]];
summary.getRange("E5:G5").merge();
summary.getRange("E5").values = [["SIN CENTRO ASIGNADO"]];
summary.getRange("E6:G7").merge();
summary.getRange("E6").formulas = [[`=COUNTIF('Base filtrable'!$A$${baseFirstRow}:$A$${baseLastRow},"Sin centro asignado")`]];

for (const rangeAddress of ["A5:B5", "C5:D5", "E5:G5"]) {
  summary.getRange(rangeAddress).format = {
    fill: deepSlate,
    font: { name: bodyFont, size: 10, bold: true, color: white },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
}
for (const rangeAddress of ["A6:B7", "C6:D7", "E6:G7"]) {
  summary.getRange(rangeAddress).format = {
    fill: paleGreen,
    font: { name: bodyFont, size: 24, bold: true, color: darkGreen },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    borders: { preset: "outside", style: "thin", color: green },
    numberFormat: "#,##0",
  };
}
summary.getRange("E6:G7").format.fill = paleOrange;
summary.getRange("E6:G7").format.font = { name: bodyFont, size: 24, bold: true, color: "#9A5B00" };

summary.getRange("A9:G9").merge();
summary.getRange("A9").values = [[
  "Criterio: empleados activos de Petrocasinos S.A. con el campo sexo en NULL. El centro corresponde al centro principal de la ficha laboral vigente.",
]];
summary.getRange("A9:G9").format = {
  fill: paleSlate,
  font: { name: bodyFont, size: 10, italic: true, color: deepSlate },
  wrapText: true,
  verticalAlignment: "center",
  borders: { preset: "outside", style: "thin", color: border },
};
summary.getRange("A9:G9").format.rowHeight = 36;

summary.getRange("A11:C11").values = [["Centro de operación", "Pendientes", "% del total"]];
summary.getRange("A11:C11").format = {
  fill: green,
  font: { name: bodyFont, size: 10, bold: true, color: white },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  borders: { preset: "outside", style: "thin", color: darkGreen },
};
summary.getRange("A11:C11").format.rowHeight = 26;

const summaryFirstRow = 12;
const summaryLastRow = summaryFirstRow + centersByCount.length - 1;
summary.getRange(`A${summaryFirstRow}:A${summaryLastRow}`).values = centersByCount.map(([center]) => [center]);
summary.getRange(`B${summaryFirstRow}:B${summaryLastRow}`).formulas = centersByCount.map(([center]) => [
  `=COUNTIF('Base filtrable'!$A$${baseFirstRow}:$A$${baseLastRow},"${excelText(center)}")`,
]);
summary.getRange(`C${summaryFirstRow}:C${summaryLastRow}`).formulas = centersByCount.map((_, index) => [
  `=B${summaryFirstRow + index}/$B$${summaryLastRow + 1}`,
]);
summary.getRange(`A${summaryFirstRow}:C${summaryLastRow}`).format = {
  font: { name: bodyFont, size: 10, color: deepSlate },
  borders: { insideHorizontal: { style: "thin", color: border } },
};
summary.getRange(`B${summaryFirstRow}:B${summaryLastRow}`).format = {
  horizontalAlignment: "center",
  numberFormat: "#,##0",
};
summary.getRange(`C${summaryFirstRow}:C${summaryLastRow}`).format = {
  horizontalAlignment: "center",
  numberFormat: "0.0%",
};
summary.getRange(`B${summaryFirstRow}:B${summaryLastRow}`).conditionalFormats.add("dataBar", {
  color: green,
  gradient: true,
});

const summaryTotalRow = summaryLastRow + 1;
summary.getRange(`A${summaryTotalRow}:C${summaryTotalRow}`).format = {
  fill: darkGreen,
  font: { name: bodyFont, size: 10, bold: true, color: white },
  borders: { preset: "outside", style: "thin", color: darkGreen },
};
summary.getRange(`A${summaryTotalRow}`).values = [["TOTAL"]];
summary.getRange(`B${summaryTotalRow}`).formulas = [[`=SUM(B${summaryFirstRow}:B${summaryLastRow})`]];
summary.getRange(`C${summaryTotalRow}`).formulas = [[`=SUM(C${summaryFirstRow}:C${summaryLastRow})`]];
summary.getRange(`B${summaryTotalRow}`).format.numberFormat = "#,##0";
summary.getRange(`C${summaryTotalRow}`).format.numberFormat = "0.0%";
summary.getRange(`B${summaryTotalRow}:C${summaryTotalRow}`).format.horizontalAlignment = "center";
summary.getRange(`A1:G${summaryTotalRow}`).format.font.name = bodyFont;
summary.getRange(`A${summaryFirstRow}:C${summaryLastRow}`).format.rowHeight = 20;
summary.getRange("A1:A1").format.columnWidth = 38;
summary.getRange("B1:B1").format.columnWidth = 16;
summary.getRange("C1:C1").format.columnWidth = 16;
summary.getRange("D1:D1").format.columnWidth = 14;
summary.getRange("E1:E1").format.columnWidth = 16;
summary.getRange("F1:F1").format.columnWidth = 12;
summary.getRange("G1:G1").format.columnWidth = 12;
summary.freezePanes.freezeRows(11);

// Listado visual por secciones de centro.
grouped.getRange("A1:H1").merge();
grouped.getRange("A1").values = [["Listado agrupado por centro de operación"]];
grouped.getRange("A2:H2").merge();
grouped.getRange("A2").values = [[`${companyName} · ${employees.length} empleados activos sin sexo diligenciado`]];
grouped.getRange("A4:H4").merge();
grouped.getRange("A4").values = [["Los centros se presentan en orden alfabético. Para aplicar filtros o búsquedas, use la hoja “Base filtrable”."]];
grouped.getRange("A1:H1").format = {
  fill: darkGreen,
  font: { name: bodyFont, size: 18, bold: true, color: white },
  verticalAlignment: "center",
};
grouped.getRange("A1:H1").format.rowHeight = 32;
grouped.getRange("A2:H2").format = {
  fill: paleGreen,
  font: { name: bodyFont, size: 11, bold: true, color: darkGreen },
};
grouped.getRange("A4:H4").format = {
  fill: paleSlate,
  font: { name: bodyFont, size: 10, italic: true, color: deepSlate },
  wrapText: true,
  borders: { preset: "outside", style: "thin", color: border },
};
grouped.getRange("A4:H4").format.rowHeight = 30;

const groupedHeaders = ["Tipo doc.", "Número de documento", "Nombres", "Apellidos", "Cargo actual", "Fecha de ingreso", "Estado", "Sexo"];
let groupedRow = 6;
const rowsByCenter = new Map(centersAlphabetical.map((center) => [center, []]));
for (const employee of employees) rowsByCenter.get(employee.operation_center).push(employee);

for (const center of centersAlphabetical) {
  const sectionRow = groupedRow;
  grouped.getRange(`A${sectionRow}:H${sectionRow}`).merge();
  grouped.getRange(`A${sectionRow}`).formulas = [[
    `="${excelText(center).toUpperCase()} · "&COUNTIF('Base filtrable'!$A$${baseFirstRow}:$A$${baseLastRow},"${excelText(center)}")&" empleado(s) pendiente(s)"`,
  ]];
  grouped.getRange(`A${sectionRow}:H${sectionRow}`).format = {
    fill: darkGreen,
    font: { name: bodyFont, size: 11, bold: true, color: white },
    verticalAlignment: "center",
    borders: { preset: "outside", style: "thin", color: darkGreen },
  };
  grouped.getRange(`A${sectionRow}:H${sectionRow}`).format.rowHeight = 24;
  groupedRow += 1;

  grouped.getRange(`A${groupedRow}:H${groupedRow}`).values = [groupedHeaders];
  grouped.getRange(`A${groupedRow}:H${groupedRow}`).format = {
    fill: paleGreen,
    font: { name: bodyFont, size: 10, bold: true, color: darkGreen },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "outside", style: "thin", color: green },
  };
  grouped.getRange(`A${groupedRow}:H${groupedRow}`).format.rowHeight = 27;
  groupedRow += 1;

  const sectionEmployees = rowsByCenter.get(center);
  const sectionDataFirstRow = groupedRow;
  const sectionData = sectionEmployees.map((employee) => [
    employee.document_type,
    employee.document_number,
    employee.given_names,
    employee.surnames,
    employee.position_name,
    asDate(employee.hire_date),
    mapStatus(employee.employee_status),
    "Sin diligenciar",
  ]);
  const sectionDataLastRow = sectionDataFirstRow + sectionData.length - 1;
  grouped.getRange(`A${sectionDataFirstRow}:H${sectionDataLastRow}`).values = sectionData;
  grouped.getRange(`A${sectionDataFirstRow}:H${sectionDataLastRow}`).format = {
    font: { name: bodyFont, size: 10, color: deepSlate },
    borders: { insideHorizontal: { style: "thin", color: border } },
  };
  grouped.getRange(`A${sectionDataFirstRow}:B${sectionDataLastRow}`).format.horizontalAlignment = "center";
  grouped.getRange(`B${sectionDataFirstRow}:B${sectionDataLastRow}`).format.numberFormat = "@";
  grouped.getRange(`F${sectionDataFirstRow}:F${sectionDataLastRow}`).format.numberFormat = "yyyy-mm-dd";
  grouped.getRange(`F${sectionDataFirstRow}:H${sectionDataLastRow}`).format.horizontalAlignment = "center";
  grouped.getRange(`H${sectionDataFirstRow}:H${sectionDataLastRow}`).format = {
    fill: paleOrange,
    font: { name: bodyFont, size: 10, bold: true, color: "#9A5B00" },
    horizontalAlignment: "center",
  };
  grouped.getRange(`A${sectionDataFirstRow}:H${sectionDataLastRow}`).format.rowHeight = 20;
  groupedRow = sectionDataLastRow + 2;
}

const groupedLastRow = groupedRow - 2;
const groupedWidths = [11, 19, 25, 25, 35, 16, 12, 19];
for (let col = 0; col < groupedWidths.length; col += 1) {
  grouped.getRangeByIndexes(0, col, groupedLastRow, 1).format.columnWidth = groupedWidths[col];
}
grouped.getRange(`A1:H${groupedLastRow}`).format.font.name = bodyFont;
grouped.freezePanes.freezeRows(4);

// Verificación compacta, render visual de todas las hojas y exportación final.
await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(workDir, { recursive: true });

const summaryInspect = await workbook.inspect({
  kind: "table",
  range: `Resumen!A1:G${Math.min(summaryTotalRow, 20)}`,
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 7,
  maxChars: 8000,
});
const baseInspect = await workbook.inspect({
  kind: "table",
  range: `Base filtrable!A1:J${Math.min(baseLastRow, 12)}`,
  include: "values,formulas",
  tableMaxRows: 12,
  tableMaxCols: 10,
  maxChars: 8000,
});
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
  maxChars: 5000,
});

for (const [sheetName, fileName] of [
  ["Resumen", "preview_resumen.png"],
  ["Listado agrupado", "preview_listado.png"],
  ["Base filtrable", "preview_base.png"],
]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(path.join(workDir, fileName), new Uint8Array(await preview.arrayBuffer()));
}

const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save(outputPath);

console.log(JSON.stringify({
  outputPath,
  employeeCount: employees.length,
  centerCount: centersAlphabetical.length,
  noCenterCount: countsByCenter.get("Sin centro asignado") || 0,
  summaryInspect: summaryInspect.ndjson,
  baseInspect: baseInspect.ndjson,
  formulaErrors: errors.ndjson,
  previewPaths: [
    path.join(workDir, "preview_resumen.png"),
    path.join(workDir, "preview_listado.png"),
    path.join(workDir, "preview_base.png"),
  ],
}, null, 2));
