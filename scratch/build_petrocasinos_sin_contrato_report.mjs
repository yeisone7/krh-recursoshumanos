import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const cwd = process.cwd();
const inputPath = path.join(cwd, "scratch", "petrocasinos_empleados_sin_contrato.raw.json");
const outputDir = path.join(cwd, "outputs", "petrocasinos_sin_contrato_20260708");
const xlsxPath = path.join(outputDir, "petrocasinos_empleados_sin_contrato.xlsx");
const csvPath = path.join(outputDir, "petrocasinos_empleados_sin_contrato.csv");
const previewPath = path.join(outputDir, "preview_resumen.png");

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r;]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const rawText = await fs.readFile(inputPath, "utf8");
const raw = JSON.parse(rawText.replace(/^\uFEFF/, ""));
const rows = raw.rows || [];

const headers = [
  "Empresa",
  "Tipo Documento",
  "Documento",
  "Nombre Completo",
  "Estado",
  "Activo",
  "Cargo",
  "Centro de Operacion",
  "Area",
  "Creado En",
  "ID Empleado",
];

const dataRows = rows.map((row) => [
  row.empresa ?? "",
  row.document_type ?? "",
  row.document_number ?? "",
  row.nombre_completo ?? "",
  row.status ?? "",
  row.is_active ? "Si" : "No",
  row.position_name ?? "",
  row.centro_operacion ?? "",
  row.area ?? "",
  toDate(row.created_at),
  row.id ?? "",
]);

const total = rows.length;
const active = rows.filter((row) => row.is_active === true && row.status === "active").length;
const inactive = total - active;
const byStatus = [...rows.reduce((map, row) => {
  const key = row.status || "sin_estado";
  map.set(key, (map.get(key) || 0) + 1);
  return map;
}, new Map()).entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));

const workbook = Workbook.create();
const summary = workbook.worksheets.add("Resumen");
const data = workbook.worksheets.add("Sin contrato");

summary.showGridLines = false;
data.showGridLines = false;

summary.getRange("A1:F1").merge();
summary.getRange("A1").values = [["Petrocasinos - empleados sin contrato"]];
summary.getRange("A2:F2").merge();
summary.getRange("A2").values = [["Consulta generada desde Supabase remoto - 2026-07-08"]];

summary.getRange("A4:B7").values = [
  ["Empresa", "Petrocasinos S.A."],
  ["Total sin contrato", total],
  ["Activos sin contrato", active],
  ["No activos / retirados sin contrato", inactive],
];

summary.getRange("D4:E4").values = [["Estado", "Cantidad"]];
summary.getRangeByIndexes(4, 3, byStatus.length, 2).values = byStatus;

summary.getRange("A1:F1").format = {
  fill: "#0F766E",
  font: { bold: true, color: "#FFFFFF", size: 16 },
};
summary.getRange("A2:F2").format = {
  fill: "#E0F2F1",
  font: { color: "#334155", italic: true },
};
summary.getRange("A4:A7").format = {
  fill: "#F1F5F9",
  font: { bold: true, color: "#334155" },
};
summary.getRange("B5:B7").format = {
  font: { bold: true, color: "#0F766E" },
  numberFormat: "#,##0",
};
summary.getRange("D4:E4").format = {
  fill: "#0F766E",
  font: { bold: true, color: "#FFFFFF" },
};
summary.getRangeByIndexes(4, 4, byStatus.length, 1).format.numberFormat = "#,##0";
summary.getRange("A4:B7").format.borders = { preset: "all", style: "thin", color: "#CBD5E1" };
summary.getRangeByIndexes(3, 3, byStatus.length + 1, 2).format.borders = { preset: "all", style: "thin", color: "#CBD5E1" };
summary.getRange("A:F").format.autofitColumns();
summary.getRange("A:A").format.columnWidth = 34;
summary.getRange("B:B").format.columnWidth = 14;
summary.getRange("D:D").format.columnWidth = 14;
summary.getRange("E:E").format.columnWidth = 12;

data.getRangeByIndexes(0, 0, 1, headers.length).values = [headers];
if (dataRows.length > 0) {
  data.getRangeByIndexes(1, 0, dataRows.length, headers.length).values = dataRows;
}

const tableRange = `A1:K${dataRows.length + 1}`;
const table = data.tables.add(tableRange, true, "EmpleadosSinContrato");
table.style = "TableStyleMedium2";
table.showFilterButton = true;

data.getRange("A1:K1").format = {
  fill: "#0F766E",
  font: { bold: true, color: "#FFFFFF" },
};
data.getRange(`J2:J${dataRows.length + 1}`).format.numberFormat = "yyyy-mm-dd";
data.getRange(`A2:K${dataRows.length + 1}`).format = {
  font: { color: "#111827" },
};
data.getRange("A:K").format.autofitColumns();
data.getRange("D:D").format.columnWidth = 34;
data.getRange("G:G").format.columnWidth = 30;
data.getRange("H:H").format.columnWidth = 28;
data.getRange("K:K").format.columnWidth = 38;
data.freezePanes.freezeRows(1);

const csvLines = [
  headers.map(csvEscape).join(";"),
  ...dataRows.map((row) => row.map((value) => value instanceof Date ? value.toISOString().slice(0, 10) : value).map(csvEscape).join(";")),
];

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(csvPath, `\uFEFF${csvLines.join("\r\n")}`, "utf8");

const inspect = await workbook.inspect({
  kind: "table",
  sheetId: "Sin contrato",
  range: "A1:K8",
  include: "values",
  tableMaxRows: 8,
  tableMaxCols: 11,
  maxChars: 3000,
});
console.log(inspect.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
  maxChars: 1000,
});
console.log(errors.ndjson);

const preview = await workbook.render({
  sheetName: "Resumen",
  autoCrop: "all",
  scale: 1,
  format: "png",
});
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(xlsxPath);

console.log(JSON.stringify({ xlsxPath, csvPath, previewPath, total, active, inactive, byStatus }, null, 2));
