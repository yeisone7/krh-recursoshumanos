import { jsPDF } from "jspdf";
import {
  DAILY_STATUS,
  HOUR_CODES,
  SERVICE_LABELS,
  dailyDate,
  dailyHourTotals,
  dailyScheduleText,
  dailyTime,
  type DailyPublication,
  type DailyRow,
} from "./dailyReports";

export const DAILY_CONSENT =
  "Con la presente firma acredito que los tiempos expuestos en los días seleccionados de este reporte coinciden con las horas que laboré y confirmo los servicios informados.";

async function imageData(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(
      "No se pudo recuperar una firma o el logo. Actualice el reporte antes de exportar.",
    );
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
export async function buildDailyReportPdf(
  publication: DailyPublication,
  rows: DailyRow[],
  historical = false,
) {
  if (!rows.length) throw new Error("No hay días para exportar.");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const assets = new Map<string, string>();
  const urls = new Set(
    rows
      .flatMap((r) => [
        r.evidence?.employee_signature_url,
        r.evidence?.supervisor_signature_url,
      ])
      .filter((s): s is string => !!s),
  );
  if (publication.logo_url) urls.add(publication.logo_url);
  await Promise.all(
    [...urls].map(async (url) => assets.set(url, await imageData(url))),
  );
  const left = 9,
    width = 279;
  const columns = [18, 67, ...Array(12).fill(7), ...Array(5).fill(6), 36, 44];
  // Width 279: date, schedule, two blocks of six hour concepts, five services, signature, state.
  const scale = width / columns.reduce((a, b) => a + b, 0);
  const widths = columns.map((w) => w * scale);
  let y = 0,
    started = false;
  const text = (value: string, x: number, top: number, size = 7) => {
    doc.setFontSize(size);
    doc.text(value, x, top);
  };
  const image = (url: string, x: number, top: number, w: number, h: number) => {
    const data = assets.get(url);
    if (!data)
      throw new Error(
        "Falta una firma en el informe. Actualice y vuelva a exportar.",
      );
    const info = doc.getImageProperties(data);
    const ratio = Math.min(w / info.width, h / info.height);
    doc.addImage(
      data,
      x + (w - info.width * ratio) / 2,
      top + (h - info.height * ratio) / 2,
      info.width * ratio,
      info.height * ratio,
    );
  };
  function header(row: DailyRow, table = true) {
    if (started) doc.addPage();
    started = true;
    doc.setDrawColor(120);
    doc.setTextColor(25);
    doc.setFont("helvetica", "normal");
    doc.rect(left, 8, width, 22);
    if (publication.logo_url) image(publication.logo_url, left + 2, 10, 35, 18);
    text("REPORTE DE TIEMPO DIARIO", 113, 17, 11);
    text(publication.company_name, 113, 24, 8);
    text(`Código: ${publication.format_code}`, 243, 15, 7);
    text(`Versión: ${publication.format_version}`, 243, 21, 7);
    text(
      `Período: ${dailyDate(publication.start_date)} a ${dailyDate(publication.end_date)}`,
      left,
      36,
    );
    text(`Centro: ${publication.center_name}`, 163, 36);
    const employee = row.snapshot.employee;
    const name = doc.splitTextToSize(
      `Empleado: ${employee.name} · ${employee.document_type} ${employee.document}`,
      width,
    );
    doc.text(name, left, 42);
    y = 42 + name.length * 3.2;
    const position = doc.splitTextToSize(
      `Cargo: ${employee.position || "Sin dato"} · Edad al día reportado: ${employee.age ?? "Sin dato"} · Sexo: ${employee.gender || "Sin dato"}`,
      width,
    );
    doc.text(position, left, y + 2);
    y += position.length * 3.2 + 7;
    const complete = rows
      .filter((r) => r.employee_id === row.employee_id)
      .every((r) => r.status === "approved");
    text(
      `${historical ? "VERSIÓN HISTÓRICA · " : ""}${complete ? "INFORME APROBADO" : "INFORME PARCIAL · Consulte el estado de cada día"}`,
      left,
      y,
      7,
    );
    y += 4;
    if (table) {
      const labels = [
        "Fecha",
        "Horario / turno / novedades",
        ...HOUR_CODES,
        ...HOUR_CODES,
        "D",
        "A",
        "Co",
        "Ce",
        "T",
        "Firma trabajador",
        "Estado",
      ];
      doc.setFillColor(235, 239, 242);
      doc.rect(left, y, width, 16, "F");
      let x = left;
      const mainX = left + widths[0] + widths[1];
      text("Horas extra registradas", mainX + 1, y + 4, 6);
      text(
        "Novedades adicionales",
        mainX + widths.slice(2, 8).reduce((a, b) => a + b, 0) + 1,
        y + 4,
        6,
      );
      labels.forEach((label, i) => {
        doc.rect(
          x,
          i >= 2 && i <= 13 ? y + 6 : y,
          widths[i],
          i >= 2 && i <= 13 ? 10 : 16,
        );
        doc.setFontSize(i > 1 && i < 19 ? 5.5 : 6.5);
        doc.text(
          i > 1 && i < 19 ? label : doc.splitTextToSize(label, widths[i] - 2),
          x + 1,
          y + 10,
        );
        x += widths[i];
      });
      y += 16;
    }
  }
  const employees = [...new Set(rows.map((r) => r.employee_id))];
  for (const id of employees) {
    const employeeRows = rows
      .filter((r) => r.employee_id === id)
      .sort((a, b) => a.date.localeCompare(b.date));
    header(employeeRows[0]);
    for (const row of employeeRows) {
      const additional = row.snapshot.novelties
        .filter(
          (n) => !HOUR_CODES.includes(n.code as (typeof HOUR_CODES)[number]),
        )
        .map(
          (n) =>
            `${n.label}: ${n.quantity ?? n.hours} ${n.unit === "days" ? "días" : "h"}`,
        );
      doc.setFontSize(6.5);
      const scheduleLines: string[] = doc.splitTextToSize(
        [dailyScheduleText(row.snapshot), ...additional].join("\n"),
        widths[1] - 3,
      );
      const statusLines: string[] = doc.splitTextToSize(
        `${DAILY_STATUS[row.status]}${row.reason ? `\n${row.reason}` : ""}${row.evidence?.employee_signed_at ? `\nFirmó: ${dailyTime(row.evidence.employee_signed_at)}` : ""}`,
        widths.at(-1)! - 3,
      );
      // Wrap long notes onto continuation rows instead of clipping the report.
      const maxLines = 24;
      const chunks = Math.max(
        1,
        Math.ceil(
          Math.max(scheduleLines.length, statusLines.length) / maxLines,
        ),
      );
      for (let chunk = 0; chunk < chunks; chunk++) {
        const sl = scheduleLines.slice(
            chunk * maxLines,
            (chunk + 1) * maxLines,
          ),
          st = statusLines.slice(chunk * maxLines, (chunk + 1) * maxLines);
        const height = Math.max(12, Math.max(sl.length, st.length) * 3 + 3);
        if (y + height > 179) header(row);
        if (row.snapshot.special_day) {
          doc.setFillColor(255, 241, 233);
          doc.rect(left, y, width, height, "F");
        }
        const values = [
          dailyDate(row.date),
          sl,
          ...dailyHourTotals(row.snapshot.extras).map((v) =>
            v ? String(v) : "-",
          ),
          ...dailyHourTotals(row.snapshot.novelties).map((v) =>
            v ? String(v) : "-",
          ),
          ...Object.keys(SERVICE_LABELS).map((k) =>
            row.evidence?.employee_signature_url
              ? row.services[k as keyof typeof SERVICE_LABELS]
                ? "Sí"
                : "No"
              : "-",
          ),
          "",
          st,
        ];
        let x = left;
        values.forEach((value, i) => {
          doc.rect(x, y, widths[i], height);
          doc.setFontSize(6.5);
          if (i === 19 && row.evidence?.employee_signature_url)
            image(
              row.evidence.employee_signature_url,
              x + 1,
              y + 1,
              widths[i] - 2,
              12,
            );
          else if (chunk === 0 || i === 1 || i === 20)
            doc.text(value as string | string[], x + 1, y + 4);
          x += widths[i];
        });
        y += height;
      }
    }
    const groups = new Map<string, DailyRow[]>();
    employeeRows
      .filter((r) => r.evidence?.supervisor_signature_url)
      .forEach((r) => {
        const key = `${r.evidence!.supervisor_name}|${r.evidence!.supervisor_signed_at}|${r.evidence!.supervisor_signature_url}`;
        groups.set(key, [...(groups.get(key) || []), r]);
      });
    for (const approved of groups.values()) {
      doc.setFontSize(7);
      const lines: string[] = doc.splitTextToSize(
        `Días aprobados: ${approved.map((r) => dailyDate(r.date)).join(", ")}`,
        210,
      );
      const height = Math.max(25, 14 + lines.length * 3.5);
      if (y + height > 180) header(approved[0], false);
      doc.rect(left, y + 2, width, height - 2);
      text(
        `Supervisor: ${approved[0].evidence!.supervisor_name} · ${dailyTime(approved[0].evidence!.supervisor_signed_at)}`,
        left + 2,
        y + 8,
      );
      doc.text(lines, left + 2, y + 13);
      image(
        approved[0].evidence!.supervisor_signature_url!,
        244,
        y + 4,
        40,
        17,
      );
      y += height;
    }
  }
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page);
    doc.setFontSize(6.5);
    doc.text(doc.splitTextToSize(DAILY_CONSENT, width), left, 190);
    doc.text(
      "D: Desayuno · A: Almuerzo · Co: Comida · Ce: Cena · T: Transporte. Horas tomadas de registros aprobados de Nómina.",
      left,
      201,
    );
    doc.text(`Página ${page} de ${doc.getNumberOfPages()}`, 265, 206);
  }
  return doc;
}
export async function downloadDailyReport(
  publication: DailyPublication,
  rows: DailyRow[],
  historical = false,
) {
  const doc = await buildDailyReportPdf(publication, rows, historical);
  doc.save(
    `Reporte-Diario-${publication.start_date}-${publication.end_date}${historical ? "-historico" : ""}.pdf`,
  );
}
