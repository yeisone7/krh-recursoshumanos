export const REPORT_VERSION = 2 as const;
export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;
export type FieldType = 'text' | 'number' | 'date' | 'datetime' | 'boolean';
export interface Field {
  key: string;
  label: string;
  type: FieldType;
  unit?: 'COP' | 'hours' | 'minutes' | 'days' | 'percent';
  permission?: string;
}
export interface Source {
  key: string;
  label: string;
  module: string;
  fields: Field[];
  dateField: string | null;
  endDateField: string | null;
  employeeField: string | null;
  centerField: string | null;
  description: string;
}
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'in'
  | 'is_null'
  | 'not_null';
export interface ReportFilter {
  field: string;
  op: FilterOperator;
  values: string[];
}
export interface Metric {
  field: string;
  op: 'count' | 'distinct' | 'sum' | 'avg' | 'min' | 'max';
  key: string;
}
export interface Dimension {
  field: string;
  grain: 'value' | 'day' | 'month' | 'year';
}
export interface RelatedFilter {
  source: string;
  mode: 'exists' | 'not_exists';
  filters: ReportFilter[];
}
export interface ReportPlan {
  source: string;
  columns: string[];
  dimensions: Dimension[];
  metrics: Metric[];
  filters: ReportFilter[];
  related: RelatedFilter[];
  order: { field: string; direction: 'asc' | 'desc' }[];
  chart: 'bar' | 'line' | 'donut' | 'none';
  limit: number | null;
  comparePrevious: boolean;
}
export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  centerIds?: string[];
}
export interface PlanningResponse {
  title: string;
  clarification: string | null;
  plan: ReportPlan | null;
}
export interface ReportResult {
  version: 2;
  id: string;
  title: string;
  question: string;
  createdAt: string;
  provider: string;
  context?: string[];
  plan: ReportPlan;
  filters: ReportFilters;
  effectiveFilters?: { label: string; value: string }[];
  sources: { key: string; label: string }[];
  columns: Field[];
  rows: Row[];
  totalRows: number;
  offset: number;
  pageSize: number;
  summary: string;
  indicators: { label: string; value: number; unit?: Field['unit'] }[];
  series: Row[];
  seriesTruncated: boolean;
  canExport: boolean;
  comparison?: {
    startDate: string;
    endDate: string;
    rows: Row[];
    totalRows: number;
  } | null;
}
export interface ReportListItem {
  id: string;
  title: string;
  question: string;
  createdAt: string;
  filters: ReportFilters;
  parentId?: string | null;
  favoriteId?: string | null;
  legacy?: boolean;
}
export interface Favorite {
  id: string;
  title: string;
  question: string;
  filters: ReportFilters;
  context: string[];
  createdAt: string;
}
export interface ReportBootstrap {
  version: 2;
  sources: Source[];
  centers: { id: string; name: string }[];
  recent: ReportListItem[];
  favorites: Favorite[];
  provider: string;
}
