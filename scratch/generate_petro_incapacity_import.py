import json
import re
import unicodedata
from datetime import datetime
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
SOURCE_XLSX = Path(r"C:\Users\ASUS\Downloads\cosecharte 2026.xlsx")
SQL_OUT = ROOT / "scratch" / "import_cosecharte_incapacities.sql"
REPORT_OUT = ROOT / "scratch" / "import_cosecharte_incapacities_local_exceptions.json"


def clean_doc(value):
    if pd.isna(value):
        return None
    text = str(value).strip()
    if re.match(r"^\d+\.0$", text):
        text = text[:-2]
    return re.sub(r"\D", "", text) or None


def parse_date(value):
    if pd.isna(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.date().isoformat()
    if isinstance(value, datetime):
        return value.date().isoformat()
    text = str(value).strip()
    if not text or text == "---":
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y", "%d/%m/%y", "%d-%m-%Y"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            pass
    typo = re.match(r"^(\d{1,2})/(\d{3})/(\d{4})$", text)
    if typo:
        fixed = f"{typo.group(1)}/{typo.group(2)[1:]}/{typo.group(3)}"
        try:
            return datetime.strptime(fixed, "%d/%m/%Y").date().isoformat()
        except ValueError:
            pass
    return None


def number(value):
    if pd.isna(value):
        return None
    if isinstance(value, str) and value.strip() in ("", "---"):
        return None
    try:
        return float(value)
    except Exception:
        text = re.sub(r"[^0-9,.-]", "", str(value)).replace(",", ".")
        try:
            return float(text)
        except Exception:
            return None


def clean_text(value):
    if pd.isna(value):
        return None
    text = str(value).strip()
    return text if text and text != "---" else None


def origin_for(tipo):
    text = (tipo or "").lower()
    normalized = "".join(
        ch for ch in unicodedata.normalize("NFKD", text) if not unicodedata.combining(ch)
    )
    if "laboral" in normalized:
        return "laboral"
    if "maternidad" in normalized:
        return "licencia_maternidad"
    if "paternidad" in normalized:
        return "licencia_paternidad"
    if "accidente" in normalized and "tr" in normalized:
        return "accidente_transito"
    return "comun"


def build_records():
    df = pd.read_excel(SOURCE_XLSX, sheet_name="Hoja1", dtype=object)
    cie10 = json.loads((ROOT / "src" / "data" / "cie10-codes.json").read_text(encoding="utf-8"))

    records = []
    exceptions = []
    for idx, row in df.iterrows():
        excel_row = int(idx + 2)
        doc = clean_doc(row.iloc[0])
        tipo = clean_text(row.iloc[1])
        certificate = clean_text(row.iloc[2])
        days_value = number(row.iloc[3])
        days = int(days_value) if days_value is not None else None
        start = parse_date(row.iloc[4])
        end = parse_date(row.iloc[5])
        cie10_code = clean_text(row.iloc[6])
        if cie10_code:
            cie10_code = re.sub(r"[^A-Za-z0-9]", "", cie10_code).upper()
        prorroga = clean_text(row.iloc[7])
        filing = parse_date(row.iloc[8])
        employer_amount = number(row.iloc[9])
        payer_amount = number(row.iloc[10])
        recovered = number(row.iloc[11])
        paid_at = parse_date(row.iloc[12])

        date_issue = None
        if not doc or not start or not end or days is None:
            date_issue = "required_missing_or_bad_date"
        else:
            calculated_days = (datetime.fromisoformat(end) - datetime.fromisoformat(start)).days + 1
            if calculated_days != days:
                date_issue = f"days_mismatch_calc_{calculated_days}"

        recovery_status = "pendiente"
        if (recovered or 0) > 0 or paid_at:
            recovery_status = "pagado"
        elif filing or certificate:
            recovery_status = "radicado"

        diagnosis = cie10.get(cie10_code) if cie10_code else None
        if not diagnosis:
            diagnosis = f"Código CIE-10 {cie10_code}" if cie10_code else "Diagnóstico importado sin código CIE-10"

        record = {
            "excel_row": excel_row,
            "doc": doc,
            "tipo_original": tipo,
            "origin": origin_for(tipo),
            "certificate_number": certificate,
            "days": days,
            "start_date": start,
            "end_date": end,
            "cie10_code": cie10_code,
            "diagnosis": diagnosis,
            "is_extension": (prorroga or "").strip().upper() == "SI",
            "prorroga_original": prorroga,
            "filing_date": filing,
            "employer_amount": employer_amount,
            "payer_amount": payer_amount,
            "recovered_amount": recovered,
            "actual_payment_date": paid_at,
            "recovery_status": recovery_status,
            "valid_excel_dates": date_issue is None,
            "date_issue": date_issue,
        }
        records.append(record)
        if date_issue:
            exceptions.append(record)
    return records, exceptions


def build_sql(records):
    payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
    return f"""
with raw as (
  select *
  from jsonb_to_recordset($payload${payload}$payload$::jsonb) as r(
    excel_row int,
    doc text,
    tipo_original text,
    origin text,
    certificate_number text,
    days int,
    start_date text,
    end_date text,
    cie10_code text,
    diagnosis text,
    is_extension boolean,
    prorroga_original text,
    filing_date text,
    employer_amount numeric,
    payer_amount numeric,
    recovered_amount numeric,
    actual_payment_date text,
    recovery_status text,
    valid_excel_dates boolean,
    date_issue text
  )
), petro as (
  select id as company_id from public.companies where name = 'Cosecharte S.A.S.'
), employee_matches as (
  select
    raw.doc,
    count(e.id)::int as match_count,
    (array_agg(e.id) filter (where e.id is not null))[1] as employee_id
  from (select distinct doc from raw where doc is not null) raw
  left join public.employees_v2 e
    on regexp_replace(e.document_number, '\\D', '', 'g') = raw.doc
   and e.company_id = (select company_id from petro)
  group by raw.doc
), prepared as (
  select
    r.*,
    p.company_id,
    em.employee_id,
    em.match_count,
    ss.eps,
    ss.arl,
    ss.afp,
    case
      when not coalesce(r.valid_excel_dates, false) then 'invalid_dates_or_days'
      when coalesce(em.match_count, 0) = 0 then 'employee_not_found'
      when em.match_count > 1 then 'ambiguous_employee_document'
      else null
    end as skip_reason
  from raw r
  cross join petro p
  left join employee_matches em on em.doc = r.doc
  left join lateral (
    select eps, arl, afp
    from public.employee_social_security s
    where s.employee_id = em.employee_id
      and coalesce(s.is_current, false) = true
    order by s.updated_at desc nulls last, s.created_at desc nulls last
    limit 1
  ) ss on true
), insertable as (
  select p.*
  from prepared p
  where p.skip_reason is null
    and not exists (
      select 1
      from public.employee_incapacities ei
      where ei.company_id = p.company_id
        and ei.employee_id = p.employee_id
        and ei.start_date = p.start_date::date
        and ei.end_date = p.end_date::date
        and coalesce(ei.cie10_code, '') = coalesce(p.cie10_code, '')
        and coalesce(ei.certificate_number, '') = coalesce(p.certificate_number, '')
    )
), duplicated_existing as (
  select p.*
  from prepared p
  where p.skip_reason is null
    and exists (
      select 1
      from public.employee_incapacities ei
      where ei.company_id = p.company_id
        and ei.employee_id = p.employee_id
        and ei.start_date = p.start_date::date
        and ei.end_date = p.end_date::date
        and coalesce(ei.cie10_code, '') = coalesce(p.cie10_code, '')
        and coalesce(ei.certificate_number, '') = coalesce(p.certificate_number, '')
    )
), inserted as (
  insert into public.employee_incapacities (
    employee_id,
    company_id,
    origin,
    start_date,
    end_date,
    cie10_code,
    diagnosis,
    certificate_number,
    eps_name,
    arl_name,
    afp_name,
    employer_days,
    eps_days,
    arl_days,
    afp_days,
    employer_amount,
    eps_amount,
    arl_amount,
    afp_amount,
    total_amount,
    recovery_status,
    filing_date,
    filing_number,
    actual_payment_date,
    recovered_amount,
    recovery_notes,
    is_extension,
    parent_incapacity_id,
    extension_number,
    requires_reintegration_exam,
    observations
  )
  select
    employee_id,
    company_id,
    origin::public.incapacity_origin,
    start_date::date,
    end_date::date,
    nullif(cie10_code, ''),
    diagnosis,
    nullif(certificate_number, ''),
    eps,
    arl,
    afp,
    case when origin in ('comun', 'accidente_transito') then least(days, 2) else 0 end,
    case when origin in ('licencia_maternidad', 'licencia_paternidad') then days when origin in ('comun', 'accidente_transito') then greatest(days - least(days, 2), 0) else 0 end,
    case when origin = 'laboral' then days else 0 end,
    0,
    coalesce(employer_amount, 0),
    case when origin = 'laboral' then 0 else coalesce(payer_amount, 0) end,
    case when origin = 'laboral' then coalesce(payer_amount, 0) else 0 end,
    0,
    coalesce(employer_amount, 0) + coalesce(payer_amount, 0),
    recovery_status::public.recovery_status,
    filing_date::date,
    nullif(certificate_number, ''),
    actual_payment_date::date,
    coalesce(recovered_amount, 0),
    'Importado desde cosecharte 2026.xlsx. Fila Excel: ' || excel_row || '. Tipo original: ' || coalesce(tipo_original, '') || '. Prórroga Excel: ' || coalesce(prorroga_original, ''),
    coalesce(is_extension, false),
    null,
    0,
    days > 30,
    'Importado desde cosecharte 2026.xlsx. Fila Excel: ' || excel_row || '. Valores originales: empresa=' || coalesce(employer_amount::text, '0') || ', entidad=' || coalesce(payer_amount::text, '0') || ', pagado=' || coalesce(recovered_amount::text, '0')
  from insertable
  returning id
)
select jsonb_pretty(jsonb_build_object(
  'raw_rows', (select count(*) from raw),
  'inserted_rows', (select count(*) from inserted),
  'skipped_existing_duplicates', (select count(*) from duplicated_existing),
  'skipped_invalid_dates_or_days', (select count(*) from prepared where skip_reason = 'invalid_dates_or_days'),
  'skipped_employee_not_found', (select count(*) from prepared where skip_reason = 'employee_not_found'),
  'skipped_ambiguous_employee_document', (select count(*) from prepared where skip_reason = 'ambiguous_employee_document'),
  'exception_docs', (select coalesce(jsonb_agg(distinct doc order by doc) filter (where skip_reason in ('employee_not_found','ambiguous_employee_document')), '[]'::jsonb) from prepared),
  'invalid_date_rows', (select coalesce(jsonb_agg(jsonb_build_object('excel_row', excel_row, 'doc', doc, 'issue', date_issue) order by excel_row) filter (where skip_reason = 'invalid_dates_or_days'), '[]'::jsonb) from prepared)
)) as import_summary;
""".strip() + "\n"


def main():
    records, exceptions = build_records()
    SQL_OUT.write_text(build_sql(records), encoding="utf-8")
    REPORT_OUT.write_text(
        json.dumps({"total_rows": len(records), "local_date_exceptions": exceptions}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "sql": str(SQL_OUT),
                "report": str(REPORT_OUT),
                "rows": len(records),
                "date_exception_rows": len(exceptions),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
