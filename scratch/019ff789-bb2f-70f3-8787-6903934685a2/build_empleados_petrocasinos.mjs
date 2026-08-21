import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = "C:/Users/ASUS/Programacion IA/krh-recursoshumanos";
const sourcePath = path.join(root, "ImportarEmpPetro.csv");
const outputDir = path.join(root, "outputs/019ff789-bb2f-70f3-8787-6903934685a2");
const outputPath = path.join(outputDir, "empleados_petrocasinos_por_nivel_educativo.xlsx");

function parseDelimited(text, delimiter = ";") {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function clean(value) {
  const v = (value ?? "").trim();
  return v === "NULL" ? "" : v;
}

function canonicalLevel(value) {
  const v = clean(value);
  const fixes = new Map([
    ["D�cimo", "Décimo"],
    ["T�cnico", "Técnico"],
    ["T�cnico Laboral", "Técnico Laboral"],
    ["T�nico Laboral", "Técnico Laboral"],
    ["Bachiller Tecnico", "Bachiller Técnico"],
    ["Basica Primaria", "Básica Primaria"],
    ["Magister", "Magíster"],
    ["Septimo", "Séptimo"],
    ["Tecnologo", "Tecnólogo"],
  ]);
  return fixes.get(v) ?? (v || "Sin información");
}

const text = (await fs.readFile(sourcePath, "utf8")).replace(/^\uFEFF/, "");
const parsed = parseDelimited(text);
const headers = parsed[0];
const index = Object.fromEntries(headers.map((h, i) => [h.trim(), i]));
const identificationHeader = headers.find((h) => h.trim().startsWith("Identid"));

const required = [
  "Empresa",
  "Centro de Operaciones",
  "primerNombre",
  "segundoNombre",
  "primerApellido",
  "segundoApellido",
  "Nivel Educativo",
];
for (const header of required) {
  if (!(header in index)) throw new Error(`No se encontró la columna requerida: ${header}`);
}
if (!identificationHeader) throw new Error("No se encontró la columna de identificación");

const employees = parsed.slice(1)
  .filter((r) => clean(r[index.Empresa]).toLowerCase().includes("petrocasinos"))
  .map((r) => ({
    level: canonicalLevel(r[index["Nivel Educativo"]]),
    operationCenter: clean(r[index["Centro de Operaciones"]]) || "Sin información",
    names: [
      r[index.primerNombre],
      r[index.segundoNombre],
      r[index.primerApellido],
      r[index.segundoApellido],
    ].map(clean).filter(Boolean).join(" ").replace(/\s+/g, " "),
    identification: clean(r[index[identificationHeader]]),
  }))
  .sort((a, b) =>
    a.level.localeCompare(b.level, "es", { sensitivity: "base" }) ||
    a.operationCenter.localeCompare(b.operationCenter, "es", { sensitivity: "base" }) ||
    a.names.localeCompare(b.names, "es", { sensitivity: "base" })
  );

const levels = [...new Set(employees.map((e) => e.level))]
  .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

const workbook = Workbook.create();
const summary = workbook.worksheets.add("Resumen");
const data = workbook.worksheets.add("Empleados");

const navy = "#17365D";
const blue = "#1F4E78";
const lightBlue = "#D9EAF7";
const pale = "#F4F7FA";
const border = "#C9D3DD";
const white = "#FFFFFF";

summary.showGridLines = false;
summary.getRange("A1:B1").merge();
summary.getRange("A1").values = [["PETROCASINOS | NIVEL EDUCATIVO"]];
summary.getRange("A1:B1").format = {
  fill: navy,
  font: { bold: true, color: white, size: 14 },
  verticalAlignment: "center",
};
summary.getRange("A1:B1").format.rowHeight = 34;
summary.getRange("A2:B2").merge();
summary.getRange("A2").values = [["Resumen generado a partir del archivo ImportarEmpPetro.csv"]];
summary.getRange("A2:B2").format = {
  fill: lightBlue,
  font: { color: navy, italic: true },
  verticalAlignment: "center",
};
summary.getRange("A2:B2").format.rowHeight = 24;

summary.getRange("A4:B4").values = [["Nivel educativo", "Cantidad de empleados"]];
summary.getRange("A4:B4").format = {
  fill: blue,
  font: { bold: true, color: white },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  borders: { preset: "outside", style: "thin", color: border },
};

const summaryRows = levels.map((level) => [level, null]);
summary.getRangeByIndexes(4, 0, summaryRows.length, 2).values = summaryRows;
for (let i = 0; i < levels.length; i++) {
  const row = 5 + i;
  summary.getRange(`B${row}`).formulas = [[`=COUNTIF('Empleados'!$A$5:$A$${employees.length + 4},A${row})`]];
}
const totalRow = 5 + levels.length;
summary.getRange(`A${totalRow}:B${totalRow}`).values = [["TOTAL", null]];
summary.getRange(`B${totalRow}`).formulas = [[`=SUM(B5:B${totalRow - 1})`]];
summary.getRange(`A${totalRow}:B${totalRow}`).format = {
  fill: navy,
  font: { bold: true, color: white },
  borders: { preset: "outside", style: "medium", color: navy },
};
summary.getRange(`A5:B${totalRow - 1}`).format = {
  fill: pale,
  borders: {
    insideHorizontal: { style: "thin", color: border },
    bottom: { style: "thin", color: border },
    left: { style: "thin", color: border },
    right: { style: "thin", color: border },
  },
};
summary.getRange(`B5:B${totalRow}`).format = { horizontalAlignment: "center", numberFormat: "#,##0" };
summary.getRange("A:A").format.columnWidth = 26;
summary.getRange("B:B").format.columnWidth = 22;
summary.freezePanes.freezeRows(4);

data.showGridLines = false;
data.getRange("A1:D1").merge();
data.getRange("A1").values = [["LISTADO DE EMPLEADOS PETROCASINOS"]];
data.getRange("A1:D1").format = {
  fill: navy,
  font: { bold: true, color: white, size: 16 },
  verticalAlignment: "center",
};
data.getRange("A1:D1").format.rowHeight = 34;
data.getRange("A2:D2").merge();
data.getRange("A2").values = [["Ordenado por nivel educativo, centro de operación y nombres"]];
data.getRange("A2:D2").format = {
  fill: lightBlue,
  font: { color: navy, italic: true },
  verticalAlignment: "center",
};
data.getRange("A2:D2").format.rowHeight = 24;
data.getRange("A4:D4").values = [["Nivel Educativo", "Centro de Operación", "Nombres", "Identificación"]];
data.getRange("A4:D4").format = {
  fill: blue,
  font: { bold: true, color: white },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  borders: { preset: "outside", style: "thin", color: border },
};
data.getRange("A4:D4").format.rowHeight = 28;

const dataRows = employees.map((e) => [e.level, e.operationCenter, e.names, e.identification]);
data.getRangeByIndexes(4, 0, dataRows.length, 4).values = dataRows;
data.getRange(`A5:D${employees.length + 4}`).format = {
  borders: { preset: "inside", style: "thin", color: "#E4E9EE" },
  verticalAlignment: "center",
};
data.getRange(`A5:A${employees.length + 4}`).format.fill = pale;
data.getRange(`D5:D${employees.length + 4}`).format.numberFormat = "@";
data.getRange(`D5:D${employees.length + 4}`).format.horizontalAlignment = "center";
data.getRange("A:A").format.columnWidth = 22;
data.getRange("B:B").format.columnWidth = 26;
data.getRange("C:C").format.columnWidth = 40;
data.getRange("D:D").format.columnWidth = 19;
data.freezePanes.freezeRows(4);
data.tables.add(`A4:D${employees.length + 4}`, true, "EmpleadosPetrocasinos");

await fs.mkdir(outputDir, { recursive: true });

const inspectSummary = await workbook.inspect({
  kind: "table",
  range: `Resumen!A1:B${totalRow}`,
  include: "values,formulas",
  tableMaxRows: 30,
  tableMaxCols: 4,
});
console.log(inspectSummary.ndjson);

const inspectData = await workbook.inspect({
  kind: "table",
  range: "Empleados!A1:D12",
  include: "values,formulas",
  tableMaxRows: 12,
  tableMaxCols: 4,
});
console.log(inspectData.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

for (const [sheetName, fileName, range] of [
  ["Resumen", "preview_resumen.png", `A1:B${totalRow}`],
  ["Empleados", "preview_empleados.png", "A1:D25"],
]) {
  const preview = await workbook.render({ sheetName, range, scale: 1.4, format: "png" });
  await fs.writeFile(path.join(outputDir, fileName), new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(JSON.stringify({ outputPath, employeeCount: employees.length, levelCount: levels.length, totalRow }));
