import { Fragment, useState, useMemo, useEffect, useDeferredValue } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Search,
  Plus,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  Calendar,
  User,
  Loader2,
  CheckCircle2,
  XCircle,
  BriefcaseBusiness,
  Coins,
  FileClock,
  Handshake,
  Infinity as InfinityIcon,
  RotateCw,
  Info,
  MapPin,
  LayoutGrid,
  Table2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ContractFormDialog } from '@/components/contracts/ContractFormDialog';
import { ContractDetailDialog } from '@/components/contracts/ContractDetailDialog';
import { AutomaticExtensionRegularizationDialog, type AutomaticExtensionRegularizationItem } from '@/components/contracts/AutomaticExtensionRegularizationDialog';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { useBulkRegularizeAutomaticContractExtensions, useContracts } from '@/hooks/useContracts';
import { useContractTypes } from '@/hooks/useContractTypes';
import { useCompany, useOperationCenters } from '@/hooks/useCompanies';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { calculateInclusiveMonthSpan, parseDateOnly } from '@/lib/dateOnly';
import { calculateAutomaticExtensionRegularizationPlan } from '@/lib/contractExtensionRegularization';
import { downloadBulkPreavisoDocuments } from '@/lib/terminationPdfGenerator';
import { toast } from '@/hooks/use-toast';
import type { TerminationDocumentData } from '@/types/termination';

// Contract type is now dynamic (text in DB) - no longer using enum
type ContractStatus = 'active' | 'expiring' | 'expired' | 'terminated';
type ContractsViewMode = 'cards' | 'matrix';
type ContractListExtension = {
  extension_number?: number | null;
  start_date?: string | null;
  end_date: string;
};
type ContractListEmployee = {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  second_last_name?: string | null;
  document_number?: string | null;
  document_type?: string | null;
  is_active?: boolean | null;
  status?: string | null;
  position_name?: string | null;
  operation_center_id?: string | null;
  operation_centers?: { name?: string | null } | null;
};
type ContractListRow = {
  id: string;
  employees?: ContractListEmployee | null;
  contract_extensions?: ContractListExtension[] | null;
  contract_number?: string | null;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  salary?: number | string | null;
  is_terminated?: boolean | null;
  is_approved?: boolean | null;
  special_clauses?: string | null;
  work_labor_description?: string | null;
};

type ContractMatrixExportRow = {
  'Nombres': string;
  'Documento': string;
  'Cargo': string;
  'Fecha Ingreso': string;
  'Termino': string;
  'Fecha Terminacion': string;
  'Prorroga 1': string;
  'Prorroga 2': string;
  'Prorroga 3': string;
  'Estipulaciones Contractuales Adicionales': string;
};

type MonthlyExpirationRow = {
  contract: ContractListRow;
  employeeName: string;
  documentNumber: string;
  positionName: string;
  centerId: string;
  centerName: string;
  contractTypeLabel: string;
  effectiveEndDate: string;
  effectiveEndDateValue: Date;
  latestExtensionNumber: number;
  daysRemaining: number;
  preavisoDeadline: Date;
  preavisoExpired: boolean;
  canGeneratePreaviso: boolean;
};

type ContractCenterGroup<T extends ContractListRow> = {
  id: string;
  name: string;
  contracts: T[];
};

const monthOptions = [
  { value: 0, label: 'Enero' },
  { value: 1, label: 'Febrero' },
  { value: 2, label: 'Marzo' },
  { value: 3, label: 'Abril' },
  { value: 4, label: 'Mayo' },
  { value: 5, label: 'Junio' },
  { value: 6, label: 'Julio' },
  { value: 7, label: 'Agosto' },
  { value: 8, label: 'Septiembre' },
  { value: 9, label: 'Octubre' },
  { value: 10, label: 'Noviembre' },
  { value: 11, label: 'Diciembre' },
];

function normalizeOperationCenterName(value?: string | null): string | null {
  const normalized = value?.trim().replace(/\s+/g, ' ');
  return normalized || null;
}

function getOperationCenterGroup(contract: ContractListRow): { id: string; name: string } {
  const centerName = normalizeOperationCenterName(contract.employees?.operation_centers?.name);

  if (centerName) {
    return {
      id: `center-name:${centerName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()}`,
      name: centerName,
    };
  }

  const centerId = contract.employees?.operation_center_id;

  return {
    id: centerId ? `center-id:${centerId}` : 'unassigned',
    name: 'Sin centro asignado',
  };
}

function groupContractsByOperationCenter<T extends ContractListRow>(contracts: T[]): ContractCenterGroup<T>[] {
  const groups = new Map<string, ContractCenterGroup<T>>();

  contracts.forEach((contract) => {
    const center = getOperationCenterGroup(contract);

    if (!groups.has(center.id)) {
      groups.set(center.id, { ...center, contracts: [] });
    }

    groups.get(center.id)?.contracts.push(contract);
  });

  return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

const statusConfig: Record<ContractStatus, { label: string; class: string; icon: typeof CheckCircle }> = {
  active: { label: 'Vigente', class: 'bg-success-light text-success border-success/20', icon: CheckCircle },
  expiring: { label: 'Por vencer', class: 'bg-warning-light text-warning-foreground border-warning/20', icon: Clock },
  expired: { label: 'Vencido', class: 'bg-destructive-light text-destructive border-destructive/20', icon: AlertTriangle },
  terminated: { label: 'Terminado', class: 'bg-background text-muted-foreground border-border', icon: FileText },
};

function getContractStatus(contract: { 
  contract_type: string; 
  end_date: string | null; 
  is_terminated: boolean | null;
  contract_extensions?: Array<{ end_date: string }>;
}): ContractStatus {
  if (contract.is_terminated) return 'terminated';
  if (contract.contract_type === 'indefinido') return 'active';
  
  // Get effective end date (latest extension or original)
  let effectiveEndDate = contract.end_date;
  if (contract.contract_extensions && contract.contract_extensions.length > 0) {
    const sortedExtensions = [...contract.contract_extensions].sort(
      (a, b) => (parseDateOnly(b.end_date)?.getTime() ?? 0) - (parseDateOnly(a.end_date)?.getTime() ?? 0)
    );
    effectiveEndDate = sortedExtensions[0].end_date;
  }
  
  if (!effectiveEndDate) return 'active';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = parseDateOnly(effectiveEndDate) ?? new Date(effectiveEndDate);
  endDate.setHours(0, 0, 0, 0);
  
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'expiring';
  return 'active';
}

function calculateDaysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = parseDateOnly(endDate) ?? new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function parseContractDate(date: string): Date {
  return parseDateOnly(date) ?? new Date(date);
}

function formatContractDate(date: string | null): string {
  if (!date) return 'Indefinido';
  return parseContractDate(date).toLocaleDateString('es-CO');
}

function formatMatrixDate(date: string | null): string {
  if (!date) return '';
  return formatContractDate(date);
}

function getEmployeeFullName(employee: ContractListEmployee | null | undefined): string {
  return [
    employee?.first_name,
    employee?.middle_name,
    employee?.last_name,
    employee?.second_last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Sin nombre';
}

function getMatrixDurationLabel(startDate: string, endDate: string | null): string {
  if (!endDate) return 'INDEFINIDO';
  const label = getContractDurationLabel(startDate, endDate);
  return label.replace('Duración ', '').toUpperCase();
}

function getSortedExtensions(contract: {
  contract_extensions?: Array<{
    end_date: string;
    extension_number?: number | null;
  }>;
}) {
  return [...(contract.contract_extensions || [])].sort((a, b) => {
    const numberA = Number(a.extension_number || 0);
    const numberB = Number(b.extension_number || 0);

    if (numberA !== numberB) return numberA - numberB;

    return (parseDateOnly(a.end_date)?.getTime() ?? 0) - (parseDateOnly(b.end_date)?.getTime() ?? 0);
  });
}

function getLatestContractExtension(contract: {
  contract_extensions?: Array<{
    end_date: string;
    extension_number?: number | null;
  }>;
}) {
  if (!contract.contract_extensions?.length) return null;

  return [...contract.contract_extensions].sort((a, b) => {
    const numberA = Number(a.extension_number || 0);
    const numberB = Number(b.extension_number || 0);

    if (numberA !== numberB) return numberB - numberA;

    return (parseDateOnly(b.end_date)?.getTime() ?? 0) - (parseDateOnly(a.end_date)?.getTime() ?? 0);
  })[0];
}

function getAdditionalContractTerms(contract: {
  special_clauses?: string | null;
  work_labor_description?: string | null;
}) {
  return [contract.special_clauses, contract.work_labor_description]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(' | ');
}

function getContractDurationLabel(startDate: string, endDate: string | null): string {
  if (!endDate) return 'Duración indefinida';

  const start = parseContractDate(startDate);
  const end = parseContractDate(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 'Duración no disponible';
  }

  const months = calculateInclusiveMonthSpan(start, end);

  if (months >= 1) {
    return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  }

  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  return `${days} ${days === 1 ? 'día' : 'días'}`;
}

function getEffectiveEndDate(contract: { 
  end_date: string | null; 
  contract_extensions?: Array<{ end_date: string; extension_number?: number | null }>;
}): string | null {
  const latestExtension = getLatestContractExtension(contract);
  if (latestExtension) return latestExtension.end_date;

  return contract.end_date;
}

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(year, month + 1, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function addCalendarDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatYearMonth(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function sanitizeFilenameSegment(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 60) || 'Centro';
}

function getContractTypeIcon(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes('indefin')) return InfinityIcon;
  if (normalized.includes('obra') || normalized.includes('labor')) return BriefcaseBusiness;
  if (normalized.includes('aprendiz')) return Handshake;
  if (normalized.includes('fijo')) return FileClock;
  return FileText;
}

function getContractTypeTone(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes('indefin')) return 'bg-success-light text-success border-success/20';
  if (normalized.includes('obra') || normalized.includes('labor')) return 'bg-accent-light text-accent border-accent/20';
  if (normalized.includes('aprendiz')) return 'bg-secondary text-secondary-foreground border-border';
  if (normalized.includes('fijo')) return 'bg-warning-light text-warning-foreground border-warning/20';
  return 'bg-primary-light text-primary border-primary/20';
}

function getExportTimestamp() {
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function buildContractMatrixRows(contracts: ContractListRow[]): ContractMatrixExportRow[] {
  return contracts.map((contract) => {
    const extensions = getSortedExtensions(contract);
    return {
      'Nombres': getEmployeeFullName(contract.employees).toUpperCase(),
      'Documento': contract.employees?.document_number || '',
      'Cargo': (contract.employees?.position_name || 'Sin cargo').toUpperCase(),
      'Fecha Ingreso': formatMatrixDate(contract.start_date),
      'Termino': getMatrixDurationLabel(contract.start_date, contract.end_date),
      'Fecha Terminacion': formatMatrixDate(contract.end_date),
      'Prorroga 1': formatMatrixDate(extensions[0]?.end_date || null),
      'Prorroga 2': formatMatrixDate(extensions[1]?.end_date || null),
      'Prorroga 3': formatMatrixDate(extensions[2]?.end_date || null),
      'Estipulaciones Contractuales Adicionales': getAdditionalContractTerms(contract),
    };
  });
}

function exportContractMatrixToExcel(contracts: ContractListRow[]) {
  const rows = buildContractMatrixRows(contracts);
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 34 },
    { wch: 18 },
    { wch: 32 },
    { wch: 16 },
    { wch: 16 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 52 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Matriz Contratos');
  XLSX.writeFile(wb, `matriz_contratos_${getExportTimestamp()}.xlsx`);
}

function exportContractMatrixToPDF(contracts: ContractListRow[]) {
  const rows = buildContractMatrixRows(contracts);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  const headers: Array<keyof ContractMatrixExportRow> = [
    'Nombres',
    'Documento',
    'Cargo',
    'Fecha Ingreso',
    'Termino',
    'Fecha Terminacion',
    'Prorroga 1',
    'Prorroga 2',
    'Prorroga 3',
    'Estipulaciones Contractuales Adicionales',
  ];
  const widths = [36, 20, 32, 20, 18, 23, 20, 20, 20, 52];
  const rowHeight = 11;
  const headerHeight = 12;
  let y = 28;

  const drawHeader = () => {
    doc.setFillColor(25, 151, 201);
    doc.rect(0, 0, pageWidth, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Matriz de Contratos', margin, 10);

    doc.setTextColor(95, 111, 130);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Generado: ${new Date().toLocaleString('es-CO')} | Registros: ${rows.length}`, margin, 22);

    let x = margin;
    doc.setFillColor(217, 217, 217);
    doc.setDrawColor(190, 196, 205);
    doc.setTextColor(20, 28, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);

    headers.forEach((header, index) => {
      doc.rect(x, y, widths[index], headerHeight, 'FD');
      doc.text(String(header).toUpperCase(), x + 1.5, y + 5, { maxWidth: widths[index] - 3 });
      x += widths[index];
    });
    y += headerHeight;
  };

  drawHeader();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);

  rows.forEach((row) => {
    if (y + rowHeight > pageHeight - margin) {
      doc.addPage();
      y = 28;
      drawHeader();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
    }

    let x = margin;
    headers.forEach((header, index) => {
      const value = String(row[header] || '');
      const lines = doc.splitTextToSize(value, widths[index] - 3).slice(0, 2) as string[];
      if (lines.length === 2 && value.length > lines.join(' ').length) {
        lines[1] = `${lines[1].slice(0, Math.max(0, lines[1].length - 3))}...`;
      }
      doc.setDrawColor(220, 224, 230);
      doc.setTextColor(25, 33, 48);
      doc.rect(x, y, widths[index], rowHeight, 'S');
      doc.text(lines, x + 1.5, y + 4, { lineHeightFactor: 1.1 });
      x += widths[index];
    });
    y += rowHeight;
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setTextColor(95, 111, 130);
    doc.setFontSize(7);
    doc.text(`Pagina ${page} de ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
  }

  doc.save(`matriz_contratos_${getExportTimestamp()}.pdf`);
}

function ContractMatrixView({
  contracts,
  onOpenContract,
  groupByCenter = false,
}: {
  contracts: ContractListRow[];
  onOpenContract: (contractId: string) => void;
  groupByCenter?: boolean;
}) {
  const displayGroups = useMemo(() => {
    if (!groupByCenter) {
      return [{ id: 'all', name: 'Todos los contratos', contracts }];
    }

    return groupContractsByOperationCenter(contracts);
  }, [contracts, groupByCenter]);

  return (
    <div className="max-h-[calc(100vh-220px)] overflow-auto bg-white dark:bg-card">
      <table className="min-w-[1500px] w-full border-collapse text-sm">
        <thead className="sticky top-0 z-[1]">
          <tr className="bg-[#d9d9d9] text-black dark:bg-muted dark:text-foreground">
            {[
              'NOMBRES',
              'DOCUMENTO',
              'CARGO',
              'FECHA INGRESO',
              'TÉRMINO',
              'FECHA TERMINACIÓN',
              'PRÓRROGA 1',
              'PRÓRROGA 2',
              'PRÓRROGA 3',
              'Estipulaciones Contractuales Adicionales',
            ].map((header) => (
              <th
                key={header}
                className={cn(
                  'border border-[#c9c9c9] px-2 py-2 text-left text-xs font-semibold uppercase whitespace-nowrap dark:border-border',
                  header === 'Estipulaciones Contractuales Adicionales' && 'normal-case',
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayGroups.map((group) => (
            <Fragment key={group.id}>
              {groupByCenter && (
                <tr className="bg-primary/10 text-primary dark:bg-primary/15">
                  <td colSpan={10} className="border border-[#dddddd] px-2 py-2 text-xs font-bold uppercase tracking-wide dark:border-border">
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      {group.name}
                      <Badge variant="outline" className="h-5 rounded-md bg-background px-1.5 text-[10px]">
                        {group.contracts.length}
                      </Badge>
                    </span>
                  </td>
                </tr>
              )}
              {group.contracts.map((contract) => {
                const extensions = getSortedExtensions(contract);
                const additionalTerms = getAdditionalContractTerms(contract);

                return (
                  <tr
                    key={contract.id}
                    onClick={() => onOpenContract(contract.id)}
                    className="cursor-pointer bg-white text-black transition-colors hover:bg-primary/5 dark:bg-card dark:text-foreground dark:hover:bg-primary/10"
                  >
                    <td className="min-w-[260px] border border-[#dddddd] px-2 py-1.5 font-medium uppercase dark:border-border">
                      {getEmployeeFullName(contract.employees)}
                    </td>
                    <td className="min-w-[170px] border border-[#dddddd] px-2 py-1.5 text-right tabular-nums dark:border-border">
                      {contract.employees?.document_number || ''}
                    </td>
                    <td className="min-w-[270px] border border-[#dddddd] px-2 py-1.5 uppercase dark:border-border">
                      {contract.employees?.position_name || 'Sin cargo'}
                    </td>
                    <td className="min-w-[140px] border border-[#dddddd] px-2 py-1.5 text-right tabular-nums dark:border-border">
                      {formatMatrixDate(contract.start_date)}
                    </td>
                    <td className="min-w-[115px] border border-[#dddddd] px-2 py-1.5 uppercase dark:border-border">
                      {getMatrixDurationLabel(contract.start_date, contract.end_date)}
                    </td>
                    <td className="min-w-[175px] border border-[#dddddd] px-2 py-1.5 text-right tabular-nums dark:border-border">
                      {formatMatrixDate(contract.end_date)}
                    </td>
                    {[0, 1, 2].map((index) => (
                      <td
                        key={`${contract.id}-extension-${index}`}
                        className="min-w-[125px] border border-[#dddddd] px-2 py-1.5 text-right tabular-nums dark:border-border"
                      >
                        {formatMatrixDate(extensions[index]?.end_date || null)}
                      </td>
                    ))}
                    <td className="min-w-[310px] max-w-[460px] border border-[#dddddd] px-2 py-1.5 text-xs dark:border-border">
                      <span className="line-clamp-2" title={additionalTerms}>
                        {additionalTerms}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Contratos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [centerFilter, setCenterFilter] = useState('all');
  const [showExpiredContracts, setShowExpiredContracts] = useState(false);
  const [groupByOperationCenter, setGroupByOperationCenter] = useState(false);
  const [viewMode, setViewMode] = useState<ContractsViewMode>('cards');
  const [isBulkRegularizationOpen, setIsBulkRegularizationOpen] = useState(false);
  const [bulkRegularizationDate, setBulkRegularizationDate] = useState(() => new Date());
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isKpiGroupOpen, setIsKpiGroupOpen] = useState(false);
  const [isMonthlyExpirationsOpen, setIsMonthlyExpirationsOpen] = useState(false);
  const [expirationMonth, setExpirationMonth] = useState(() => new Date().getMonth());
  const [expirationYear, setExpirationYear] = useState(() => new Date().getFullYear());
  const [expirationCenterFilter, setExpirationCenterFilter] = useState('all');
  const [isGeneratingBulkPreavisos, setIsGeneratingBulkPreavisos] = useState(false);

  const { currentCompanyId, hasPermission, canView, canCreate, canUpdate, isAdmin, isRRHH, isSuperAdmin } = useAuth();
  const canViewContractCompensation =
    canView('salarios') ||
    hasPermission('salarios', 'view') ||
    canView('compensaciones') ||
    hasPermission('compensaciones', 'view');
  const isMobile = useIsMobile();
  const { data: contracts, isLoading, refetch } = useContracts();
  const bulkRegularizeAutomaticExtensions = useBulkRegularizeAutomaticContractExtensions();
  const { data: contractTypesConfig } = useContractTypes();
  const { data: operationCenters } = useOperationCenters();
  const { data: company } = useCompany(currentCompanyId || undefined);
  const { data: systemConfig } = useSystemConfig();
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const canCreateContracts = isAdmin || isRRHH || isSuperAdmin || canCreate('contratos');
  const canManageContractExtensions = isAdmin || isRRHH || isSuperAdmin || canUpdate('contratos');

  // Helper to get contract type label from catalog
  const getContractTypeLabel = (type: string) => {
    const config = contractTypesConfig?.find(ct => ct.contract_type === type);
    return config?.display_name || type;
  };

  // Handle deep link from dashboard alerts
  useEffect(() => {
    const detailId = searchParams.get('detail');
    if (detailId && contracts) {
      const contractExists = contracts.some(c => c.id === detailId);
      if (contractExists) {
        setSelectedContractId(detailId);
        setIsDetailOpen(true);
        // Clear the query param after opening
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, contracts, setSearchParams]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Filter contracts
  const filteredContracts = useMemo(() => {
    if (!contracts) return [];
    const normalizedSearch = deferredSearchQuery.trim().toLowerCase();
    
    return contracts.filter((contract) => {
      const searchableText = [
        contract.employees?.first_name,
        contract.employees?.middle_name,
        contract.employees?.last_name,
        contract.employees?.second_last_name,
        contract.employees?.document_number,
        contract.employees?.operation_centers?.name,
        contract.contract_number,
      ].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
      const matchesType = typeFilter === 'all' || contract.contract_type === typeFilter;
      const matchesCenter = centerFilter === 'all' || contract.employees?.operation_center_id === centerFilter;
      const status = getContractStatus(contract);
      const matchesExpiredVisibility = showExpiredContracts || status !== 'expired';
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      return matchesSearch && matchesType && matchesCenter && matchesExpiredVisibility && matchesStatus;
    });
  }, [contracts, deferredSearchQuery, typeFilter, centerFilter, showExpiredContracts, statusFilter]);

  const {
    visibleItems: visibleContracts,
    hasMore,
    sentinelRef,
    visibleCount,
    totalCount,
  } = useInfiniteScroll({
    items: filteredContracts,
    pageSize: isMobile ? 12 : 40,
  });

  const displayContractGroups = useMemo(() => {
    if (!groupByOperationCenter) {
      return [{ id: 'all', name: 'Todos los contratos', contracts: visibleContracts }];
    }

    return groupContractsByOperationCenter(visibleContracts);
  }, [visibleContracts, groupByOperationCenter]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!contracts) return { total: 0, active: 0, expiring: 0, expired: 0, withExtensions: 0 };
    
    return contracts.reduce((acc, contract) => {
      const status = getContractStatus(contract);
      acc.total += 1;
      if (status === 'active') acc.active += 1;
      if (status === 'expiring') acc.expiring += 1;
      if (status === 'expired') acc.expired += 1;
      if (contract.contract_extensions && contract.contract_extensions.length > 0) acc.withExtensions += 1;
      return acc;
    }, { total: 0, active: 0, expiring: 0, expired: 0, withExtensions: 0 });
  }, [contracts]);

  const bulkRegularizationItems = useMemo<AutomaticExtensionRegularizationItem[]>(() => {
    if (!contracts) return [];

    return contracts
      .map((contract) => {
        const employeeIsActive =
          contract.employees?.is_active === true &&
          (contract.employees?.status || 'active') === 'active';
        const effectiveEndDate = getEffectiveEndDate(contract);
        const extensions = ((contract.contract_extensions || []) as ContractListExtension[]).map((extension) => ({
          extensionNumber: Number(extension.extension_number || 0),
          startDate: parseContractDate(extension.start_date || extension.end_date),
          endDate: parseContractDate(extension.end_date),
        }));
        const plan = calculateAutomaticExtensionRegularizationPlan({
          id: contract.id,
          contractType: contract.contract_type,
          isApproved: contract.is_approved,
          isEmployeeActive: employeeIsActive,
          isTerminated: contract.is_terminated,
          startDate: parseContractDate(contract.start_date),
          originalEndDate: contract.end_date ? parseContractDate(contract.end_date) : null,
          currentEndDate: effectiveEndDate ? parseContractDate(effectiveEndDate) : null,
          extensions,
        }, bulkRegularizationDate);

        if (!plan.eligible || plan.extensions.length === 0) return null;

        return {
          contractId: contract.id,
          employeeName: getEmployeeFullName(contract.employees),
          currentEndDate: effectiveEndDate ? parseContractDate(effectiveEndDate) : null,
          extensions: plan.extensions,
        };
      })
      .filter((item): item is AutomaticExtensionRegularizationItem => item !== null);
  }, [contracts, bulkRegularizationDate]);

  const monthlyExpirationRows = useMemo<MonthlyExpirationRow[]>(() => {
    if (!contracts) return [];

    const { start, end } = getMonthRange(expirationYear, expirationMonth);

    return contracts
      .map((contract) => {
        const employeeIsActive =
          contract.employees?.is_active === true &&
          (contract.employees?.status || 'active') === 'active';

        if (!contract.is_approved || contract.is_terminated || !employeeIsActive) return null;

        const effectiveEndDate = getEffectiveEndDate(contract);
        const effectiveEndDateValue = effectiveEndDate ? parseDateOnly(effectiveEndDate) : null;

        if (!effectiveEndDate || !effectiveEndDateValue) return null;
        if (effectiveEndDateValue < start || effectiveEndDateValue > end) return null;

        const latestExtension = getLatestContractExtension(contract);
        const preavisoDeadline = addCalendarDays(effectiveEndDateValue, -30);

        return {
          contract,
          employeeName: getEmployeeFullName(contract.employees),
          documentNumber: contract.employees?.document_number || 'SIN-DOC',
          positionName: contract.employees?.position_name || 'Sin cargo',
          centerId: contract.employees?.operation_center_id || 'unassigned',
          centerName: contract.employees?.operation_centers?.name || 'Sin centro asignado',
          contractTypeLabel: getContractTypeLabel(contract.contract_type),
          effectiveEndDate,
          effectiveEndDateValue,
          latestExtensionNumber: Number(latestExtension?.extension_number || 0),
          daysRemaining: calculateDaysRemaining(effectiveEndDate) ?? 0,
          preavisoDeadline,
          preavisoExpired: preavisoDeadline < new Date(),
          canGeneratePreaviso: contract.contract_type === 'fijo',
        };
      })
      .filter((row): row is MonthlyExpirationRow => row !== null)
      .sort((a, b) => a.effectiveEndDateValue.getTime() - b.effectiveEndDateValue.getTime());
  }, [contracts, expirationMonth, expirationYear, contractTypesConfig]);

  const visibleMonthlyExpirationRows = useMemo(() => {
    if (expirationCenterFilter === 'all') return monthlyExpirationRows;
    return monthlyExpirationRows.filter((row) => row.centerId === expirationCenterFilter);
  }, [monthlyExpirationRows, expirationCenterFilter]);

  const monthlyCenterSummaries = useMemo(() => {
    const groups = new Map<string, {
      id: string;
      name: string;
      count: number;
      preavisoExpired: number;
      earliestDate: Date | null;
    }>();

    monthlyExpirationRows.forEach((row) => {
      if (!groups.has(row.centerId)) {
        groups.set(row.centerId, {
          id: row.centerId,
          name: row.centerName,
          count: 0,
          preavisoExpired: 0,
          earliestDate: null,
        });
      }

      const group = groups.get(row.centerId)!;
      group.count += 1;
      if (row.preavisoExpired) group.preavisoExpired += 1;
      if (!group.earliestDate || row.effectiveEndDateValue < group.earliestDate) {
        group.earliestDate = row.effectiveEndDateValue;
      }
    });

    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [monthlyExpirationRows]);

  const selectedCenterName = expirationCenterFilter === 'all'
    ? 'Todos los centros'
    : operationCenters?.find((center) => center.id === expirationCenterFilter)?.name || 'Centro seleccionado';

  const bulkPreavisoRows = useMemo(() => {
    if (expirationCenterFilter === 'all') return [];
    return visibleMonthlyExpirationRows.filter((row) => row.canGeneratePreaviso && row.centerId !== 'unassigned');
  }, [visibleMonthlyExpirationRows, expirationCenterFilter]);

  const handleBulkRegularization = async (selectedItems: AutomaticExtensionRegularizationItem[]) => {
    try {
      await bulkRegularizeAutomaticExtensions.mutateAsync(selectedItems);

      const totalExtensions = selectedItems.reduce((total, item) => total + item.extensions.length, 0);
      toast({
        title: 'Regularizacion completada',
        description: `Se registraron ${totalExtensions} prorrogas automaticas en ${selectedItems.length} contratos.`,
      });

      setIsBulkRegularizationOpen(false);
    } catch (error) {
      console.error('Error regularizing automatic extensions in bulk:', error);
      toast({
        title: 'Error',
        description: 'No se pudo completar la regularizacion masiva. Intente nuevamente.',
        variant: 'destructive',
      });
    }
  };

  const handleContractClick = (contractId: string) => {
    setSelectedContractId(contractId);
    setIsDetailOpen(true);
  };

  const handleExportMatrixExcel = () => {
    if (filteredContracts.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay contratos para exportar con los filtros actuales.',
      });
      return;
    }

    exportContractMatrixToExcel(filteredContracts);
    toast({
      title: 'Excel generado',
      description: 'La matriz de contratos fue exportada correctamente.',
    });
  };

  const handleExportMatrixPDF = () => {
    if (filteredContracts.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay contratos para exportar con los filtros actuales.',
      });
      return;
    }

    exportContractMatrixToPDF(filteredContracts);
    toast({
      title: 'PDF generado',
      description: 'La matriz de contratos fue exportada correctamente.',
    });
  };

  const handleGenerateBulkPreavisos = async () => {
    if (expirationCenterFilter === 'all') {
      toast({
        title: 'Selecciona un centro',
        description: 'El PDF masivo se genera por centro de operación.',
        variant: 'destructive',
      });
      return;
    }

    if (bulkPreavisoRows.length === 0) {
      toast({
        title: 'Sin preavisos para generar',
        description: 'No hay contratos a término fijo elegibles en el centro y mes seleccionados.',
      });
      return;
    }

    if (!company) {
      toast({
        title: 'Empresa no disponible',
        description: 'No se pudo cargar la información de la empresa para generar los preavisos.',
        variant: 'destructive',
      });
      return;
    }

    const signatureConfig = systemConfig?.legal_signature_config;
    const documentDate = new Date();
    const documentCity = company.city || 'Bucaramanga';
    const preavisoData: TerminationDocumentData[] = bulkPreavisoRows.map((row) => ({
      companyName: company.name || 'Empresa',
      companyNit: company.nit || '',
      companyAddress: company.address || undefined,
      companyCity: company.city || undefined,
      companyPhone: company.phone || undefined,
      employeeFullName: row.employeeName,
      employeeDocumentType: row.contract.employees?.document_type || 'C.C.',
      employeeDocumentNumber: row.documentNumber,
      employeePosition: row.positionName,
      employeeOperationCenter: row.centerName,
      contractType: row.contractTypeLabel,
      contractStartDate: parseContractDate(row.contract.start_date),
      contractEndDate: row.effectiveEndDateValue,
      salary: Number(row.contract.salary || 0),
      terminationType: 'preaviso',
      terminationDate: documentDate,
      effectiveDate: row.effectiveEndDateValue,
      hrManagerName: signatureConfig?.signer_name || 'Representante Legal',
      hrManagerPosition: signatureConfig?.signer_position || 'Líder de Talento Humano',
      representativeSignatureUrl: signatureConfig?.signature_url || undefined,
      documentDate,
      documentCity,
    }));

    try {
      setIsGeneratingBulkPreavisos(true);
      await downloadBulkPreavisoDocuments(
        preavisoData,
        `Preavisos_${sanitizeFilenameSegment(selectedCenterName)}_${formatYearMonth(expirationYear, expirationMonth)}.pdf`
      );
      toast({
        title: 'Preavisos generados',
        description: `Se generó un PDF con ${bulkPreavisoRows.length} preaviso(s).`,
      });
    } catch (error) {
      console.error('Error generating bulk preavisos:', error);
      toast({
        title: 'Error',
        description: 'No se pudo generar el PDF masivo de preavisos. Intente nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingBulkPreavisos(false);
    }
  };

  if (!currentCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <FileText className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sin empresa asignada</h2>
        <p className="text-muted-foreground">
          Contacta al administrador para que te asigne a una empresa.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="bg-card border-none shadow-sm rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1 w-10 bg-primary rounded-full" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Módulo de Talento</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Contratos Laborales
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl leading-relaxed font-medium">
              Gestión centralizada de vinculaciones, prórrogas y estados contractuales.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              variant="outline"
              className="h-11 rounded-xl border-primary/20 text-primary shadow-sm hover:bg-primary/5"
              onClick={() => setIsMonthlyExpirationsOpen(true)}
            >
              <Calendar className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Vencimientos mensuales</span>
              <span className="sm:hidden">Vencimientos</span>
            </Button>
            {canManageContractExtensions && bulkRegularizationItems.length > 0 && (
              <Button
                variant="outline"
                className="h-11 rounded-xl border-emerald-200 text-emerald-700 shadow-sm hover:bg-emerald-50"
                onClick={() => setIsBulkRegularizationOpen(true)}
                disabled={bulkRegularizeAutomaticExtensions.isPending}
              >
                {bulkRegularizeAutomaticExtensions.isPending ? (
                  <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                ) : (
                  <RotateCw className="h-4 w-4 sm:mr-2" />
                )}
                <span className="hidden sm:inline">Regularizacion general ({bulkRegularizationItems.length})</span>
                <span className="sm:hidden">Regularizar</span>
              </Button>
            )}
            {canCreateContracts && (
              <Button className="h-11 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95" onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Nuevo Contrato</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <Collapsible open={isKpiGroupOpen} onOpenChange={setIsKpiGroupOpen} className="rounded-2xl border border-border bg-card shadow-sm">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-background/70 sm:px-5"
            aria-expanded={isKpiGroupOpen}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CheckCircle className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black uppercase tracking-wide text-foreground">Indicadores de contratos</span>
                <span className="block truncate text-xs font-medium text-muted-foreground">
                  {stats.active} vigentes · {stats.expiring} por vencer · {stats.expired} vencidos · {stats.withExtensions} con prorrogas
                </span>
              </span>
            </span>
            <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isKpiGroupOpen && 'rotate-180')} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
          <div className="grid grid-cols-2 gap-4 border-t border-border p-4 md:grid-cols-4">
        {[
          { label: 'Vigentes', value: stats.active, desc: 'Contratos activos', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Por Vencer', value: stats.expiring, desc: 'Próximos 30 días', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Vencidos', value: stats.expired, desc: 'Requieren acción', icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
          { label: 'Con Prórrogas', value: stats.withExtensions, desc: 'Historial de cambios', icon: RotateCw, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        ].map((kpi, i) => (
          <Card key={i} className="border-none shadow-sm bg-card hover:shadow-md transition-all duration-300 group rounded-2xl overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${kpi.bg} group-hover:scale-110 transition-transform shrink-0`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-black tracking-tight truncate leading-none mb-1">{kpi.value}</p>
                  <p className="text-[11px] font-bold text-foreground/80 leading-tight uppercase tracking-widest">{kpi.label}</p>
                  <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">{kpi.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="sticky top-0 z-10 bg-background/80 pb-2 backdrop-blur-md">
        <div className="grid gap-2 lg:grid-cols-[minmax(260px,1fr)_auto_auto_auto_auto]">
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <button
              type="button"
              onClick={() => setIsFiltersOpen((value) => !value)}
              className="flex h-10 w-full items-center justify-between gap-3 px-4 text-left"
              aria-expanded={isFiltersOpen}
            >
              <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Filter className="h-4 w-4 text-primary" />
                Filtros de contratos
              </span>
              <span className="flex items-center gap-2">
                <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                  {viewMode === 'matrix' ? totalCount : visibleCount < totalCount ? `${visibleCount}/${totalCount}` : totalCount}
                </span>
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isFiltersOpen && 'rotate-180')} />
              </span>
            </button>
          </div>

          <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 shadow-sm">
            <Switch
              id="show-expired-contracts"
              checked={showExpiredContracts}
              onCheckedChange={setShowExpiredContracts}
              aria-label="Mostrar contratos vencidos"
            />
            <label
              htmlFor="show-expired-contracts"
              className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
            >
              Vencidos
            </label>
          </div>

          <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 shadow-sm">
            <Switch
              id="group-contracts-by-center"
              checked={groupByOperationCenter}
              onCheckedChange={setGroupByOperationCenter}
              aria-label="Agrupar contratos por centro de operacion"
            />
            <label
              htmlFor="group-contracts-by-center"
              className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
            >
              Centros
            </label>
          </div>

          <div className="flex h-10 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-sm">
            <Button
              type="button"
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="h-8 rounded-lg px-3 text-[11px] font-bold uppercase tracking-wide"
            >
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
              Tarjetas
            </Button>
            <Button
              type="button"
              variant={viewMode === 'matrix' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('matrix')}
              className="h-8 rounded-lg px-3 text-[11px] font-bold uppercase tracking-wide"
            >
              <Table2 className="mr-1.5 h-3.5 w-3.5" />
              Matriz
            </Button>
          </div>

          {viewMode === 'matrix' && (
            <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card p-1 shadow-sm">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleExportMatrixExcel}
                className="h-8 rounded-lg px-3 text-[11px] font-bold uppercase tracking-wide"
              >
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                Excel
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleExportMatrixPDF}
                className="h-8 rounded-lg px-3 text-[11px] font-bold uppercase tracking-wide"
              >
                <Download className="mr-1.5 h-3.5 w-3.5 text-primary" />
                PDF
              </Button>
            </div>
          )}
        </div>

        {isFiltersOpen && (
          <div className="mt-2 rounded-xl border border-border bg-card p-3 shadow-sm">
              <div className="grid gap-2 xl:grid-cols-[minmax(220px,1fr)_180px_210px_140px]">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    placeholder="Buscar por empleado..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-10 rounded-xl border-none bg-background pl-11 shadow-sm focus-visible:ring-primary/20"
                  />
                </div>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-none bg-background shadow-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <Filter className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <SelectValue placeholder="Tipo" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-background rounded-xl">
                    <SelectItem value="all" className="rounded-lg">Todos los tipos</SelectItem>
                    {contractTypesConfig?.filter(ct => ct.is_active).map((ct) => (
                      <SelectItem key={ct.contract_type} value={ct.contract_type} className="rounded-lg">
                        {ct.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={centerFilter} onValueChange={setCenterFilter}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-none bg-background shadow-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <SelectValue placeholder="Centro" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-background rounded-xl">
                    <SelectItem value="all" className="rounded-lg">Todos los centros</SelectItem>
                    {operationCenters?.map((center) => (
                      <SelectItem key={center.id} value={center.id} className="rounded-lg">
                        {center.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-none bg-background shadow-sm">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-background rounded-xl">
                    <SelectItem value="all" className="rounded-lg">Todos</SelectItem>
                    <SelectItem value="active" className="rounded-lg">Vigentes</SelectItem>
                    <SelectItem value="expiring" className="rounded-lg">Por vencer</SelectItem>
                    <SelectItem value="expired" className="rounded-lg">Vencidos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
          </div>
        )}
      </div>

      {/* Contracts Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="card-elevated overflow-hidden"
      >
        {filteredContracts.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay contratos</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || typeFilter !== 'all' || centerFilter !== 'all' || statusFilter !== 'all' || !showExpiredContracts
                ? 'No se encontraron contratos con los filtros seleccionados'
                : 'Comienza agregando tu primer contrato'}
            </p>
            {!searchQuery && typeFilter === 'all' && centerFilter === 'all' && statusFilter === 'all' && showExpiredContracts && canCreateContracts && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Contrato
              </Button>
            )}
          </div>
        ) : viewMode === 'matrix' ? (
          <ContractMatrixView
            contracts={filteredContracts}
            onOpenContract={handleContractClick}
            groupByCenter={groupByOperationCenter}
          />
        ) : isMobile ? (
          <div className="p-3">
            <PullToRefresh onRefresh={async () => { await refetch(); }}>
              <div className="space-y-3">
                {displayContractGroups.map((group) => (
                  <section key={group.id} className="space-y-3">
                    {groupByOperationCenter && (
                      <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        <span className="flex min-w-0 items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="truncate">{group.name}</span>
                        </span>
                        <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
                          {group.contracts.length}
                        </Badge>
                      </div>
                    )}
                    {group.contracts.map((contract, index) => {
                      const status = getContractStatus(contract);
                      const effectiveEndDate = getEffectiveEndDate(contract);
                      const daysRemaining = calculateDaysRemaining(effectiveEndDate);
                      const durationLabel = getContractDurationLabel(contract.start_date, effectiveEndDate);
                      const StatusIcon = statusConfig[status].icon;
                      const ContractTypeIcon = getContractTypeIcon(contract.contract_type);
                      const extensionsCount = contract.contract_extensions?.length || 0;

                      return (
                        <motion.button
                          key={contract.id}
                          type="button"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.16, delay: Math.min(index * 0.01, 0.12) }}
                          onClick={() => handleContractClick(contract.id)}
                          className="w-full overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm transition-all active:scale-[0.99]"
                        >
                      <div className={cn('h-1 w-full', status === 'expired' ? 'bg-destructive' : status === 'expiring' ? 'bg-warning' : status === 'terminated' ? 'bg-background -foreground' : 'bg-success')} />
                      <div className="space-y-4 p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border', getContractTypeTone(contract.contract_type))}>
                            <ContractTypeIcon className="h-6 w-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-foreground">
                                  {contract.employees?.first_name} {contract.employees?.last_name}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">CC {contract.employees?.document_number}</p>
                              </div>
                              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                            </div>
                            <TooltipProvider delayDuration={150}>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      onClick={(event) => event.stopPropagation()}
                                      className={cn('gap-1', statusConfig[status].class)}
                                    >
                                      <StatusIcon className="h-3 w-3" />
                                      {statusConfig[status].label}
                                      {daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30 && <span>({daysRemaining}d)</span>}
                                      <Info className="h-3 w-3 opacity-70" />
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-[240px] text-xs">
                                    Indica si el contrato está vigente, próximo a vencer, vencido o terminado según sus fechas.
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      onClick={(event) => event.stopPropagation()}
                                      className={cn('gap-1', contract.is_approved ? 'bg-success-light text-success border-success/20' : 'bg-warning-light text-warning-foreground border-warning/20')}
                                    >
                                      {contract.is_approved ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                      {contract.is_approved ? 'Aprobado' : 'Pendiente'}
                                      <Info className="h-3 w-3 opacity-70" />
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-[240px] text-xs">
                                    Indica si el contrato ya fue validado en el flujo interno de aprobación.
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          </div>
                        </div>

                        <div className="rounded-lg border border-border bg-background p-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="truncate">{getContractTypeLabel(contract.contract_type)}</span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Inicio</p>
                              <p className="mt-0.5 font-medium text-foreground">{formatContractDate(contract.start_date)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Vigencia</p>
                              <p className="mt-0.5 font-medium text-foreground">{formatContractDate(effectiveEndDate)}</p>
                              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                                <Clock className="h-3 w-3 text-primary/60" />
                                {durationLabel}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Salario</p>
                              <p className="mt-0.5 font-medium text-foreground">
                                {canViewContractCompensation ? formatCurrency(Number(contract.salary)) : '••••••'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Prórrogas</p>
                              <p className="mt-0.5 flex items-center gap-1 font-medium text-foreground">
                                <RotateCw className="h-3.5 w-3.5 text-accent" />
                                {extensionsCount > 0 ? `${extensionsCount} registrada${extensionsCount > 1 ? 's' : ''}` : 'Sin prórrogas'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <Coins className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{contract.contract_number || 'Sin consecutivo'}</span>
                          </span>
                          {status === 'expiring' && daysRemaining !== null && (
                            <span className="shrink-0 font-medium text-warning-foreground">Vence en {daysRemaining} días</span>
                          )}
                        </div>
                      </div>
                        </motion.button>
                      );
                    })}
                  </section>
                ))}
                {hasMore && (
                  <div ref={sentinelRef} className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
            </PullToRefresh>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="contracts-matrix-table w-full table-fixed">
              <colgroup>
                <col className="hidden w-[15%] md:table-column" />
                <col className="w-[22%]" />
                <col className="hidden w-[16%] sm:table-column" />
                <col className="hidden w-[12%] lg:table-column" />
                <col className="hidden w-[13%] lg:table-column" />
                <col className="w-[13%]" />
                <col className="w-[3%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="text-left p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground hidden md:table-cell">Nº Contrato</th>
                  <th className="text-left p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Empleado</th>
                  <th className="text-left p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Tipo</th>
                  <th className="text-left p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Vigencia</th>
                  <th className="text-left p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Aprobación</th>
                  <th className="text-left p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Estado</th>
                  <th className="text-right p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {displayContractGroups.map((group) => (
                  <Fragment key={group.id}>
                    {groupByOperationCenter && (
                      <tr className="bg-background/80">
                        <td colSpan={7} className="px-4 py-2">
                          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            <span className="flex min-w-0 items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                              <span className="truncate">{group.name}</span>
                            </span>
                            <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
                              {group.contracts.length}
                            </Badge>
                          </div>
                        </td>
                      </tr>
                    )}
                    {group.contracts.map((contract, index) => {
                      const status = getContractStatus(contract);
                      const effectiveEndDate = getEffectiveEndDate(contract);
                      const daysRemaining = calculateDaysRemaining(effectiveEndDate);
                      const durationLabel = getContractDurationLabel(contract.start_date, effectiveEndDate);
                      const StatusIcon = statusConfig[status].icon;
                      const extensionsCount = contract.contract_extensions?.length || 0;
                      const ContractTypeIcon = getContractTypeIcon(contract.contract_type);
                      
                      return (
                        <motion.tr
                          key={contract.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.12, delay: Math.min(index * 0.006, 0.08) }}
                          onClick={() => handleContractClick(contract.id)}
                          className="group hover:bg-primary/[0.02] transition-colors cursor-pointer"
                        >
                      <td className="hidden p-3 md:table-cell">
                        <div className="flex items-center gap-2">
                          <Coins className="w-3.5 h-3.5 text-primary/40" />
                          <span className="whitespace-nowrap text-sm font-mono font-semibold text-primary/70">
                            {contract.contract_number || 'S/C'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-transform group-hover:scale-105">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <span className="block truncate font-bold text-foreground">
                              {contract.employees?.first_name} {contract.employees?.last_name}
                            </span>
                            <p className="truncate text-[11px] font-medium uppercase tracking-tight text-muted-foreground">CC {contract.employees?.document_number}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden p-3 sm:table-cell">
                        <div className="flex min-w-0 items-center gap-2">
                          <ContractTypeIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm font-medium text-foreground/80">{getContractTypeLabel(contract.contract_type)}</span>
                        </div>
                      </td>
                      <td className="hidden p-3 lg:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5 text-primary/60" />
                            {formatContractDate(contract.start_date)}
                          </div>
                          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            <Clock className="h-3 w-3 text-primary/60" />
                            {durationLabel}
                          </p>
                          <p className="text-[11px] font-medium text-foreground/60">
                            → {formatContractDate(effectiveEndDate)}
                          </p>
                          {extensionsCount > 0 && (
                            <p className="flex items-center gap-1 text-[10px] font-bold uppercase text-accent">
                              <RotateCw className="h-2.5 w-2.5" /> {extensionsCount} prórrogas
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="hidden p-3 lg:table-cell">
                        {contract.is_approved ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-[10px] font-bold uppercase py-0 px-2">
                            <CheckCircle2 className="w-3 h-3" />
                            Aprobado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-[10px] font-bold uppercase py-0 px-2">
                            <XCircle className="w-3 h-3" />
                            Pendiente
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={cn("max-w-full gap-1 whitespace-nowrap text-[10px] font-bold uppercase py-0.5 px-2 border-border shadow-sm", statusConfig[status].class)}>
                          <StatusIcon className="h-3 w-3 shrink-0" />
                          {statusConfig[status].label}
                          {daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30 && (
                            <span className="ml-1 opacity-70">({daysRemaining}d)</span>
                          )}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
                           <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:bg-primary/10 hover:text-primary">
                             <ChevronRight className="w-4 h-4" />
                           </Button>
                        </div>
                      </td>
                        </motion.tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {hasMore && (
              <div ref={sentinelRef} className="flex items-center justify-center gap-2 border-t border-border py-4 text-xs font-medium text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Cargando más contratos
              </div>
            )}
          </div>
        )}
      </motion.div>

      <ContractFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
      />

      <Dialog open={isMonthlyExpirationsOpen} onOpenChange={setIsMonthlyExpirationsOpen}>
        <DialogContent className="flex max-h-[92vh] max-w-6xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-lg font-black">
              <Calendar className="h-5 w-5 text-primary" />
              Vencimientos mensuales
            </DialogTitle>
            <DialogDescription>
              Consulta contratos y prórrogas con fecha de vencimiento efectiva en el mes seleccionado.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="grid gap-3 lg:grid-cols-[180px_140px_minmax(240px,1fr)_auto]">
              <Select value={String(expirationMonth)} onValueChange={(value) => setExpirationMonth(Number(value))}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={String(month.value)}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                min={2000}
                max={2100}
                value={expirationYear}
                onChange={(event) => setExpirationYear(Number(event.target.value) || new Date().getFullYear())}
                className="h-11 rounded-xl"
                aria-label="Año de vencimiento"
              />

              <Select value={expirationCenterFilter} onValueChange={setExpirationCenterFilter}>
                <SelectTrigger className="h-11 rounded-xl">
                  <div className="flex min-w-0 items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <SelectValue placeholder="Centro de operación" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los centros</SelectItem>
                  {operationCenters?.map((center) => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                className="h-11 rounded-xl"
                onClick={handleGenerateBulkPreavisos}
                disabled={expirationCenterFilter === 'all' || bulkPreavisoRows.length === 0 || isGeneratingBulkPreavisos}
                title={expirationCenterFilter === 'all' ? 'Selecciona un centro de operación' : undefined}
              >
                {isGeneratingBulkPreavisos ? (
                  <Loader2 className="h-4 w-4 animate-spin lg:mr-2" />
                ) : (
                  <Download className="h-4 w-4 lg:mr-2" />
                )}
                <span className="hidden lg:inline">Generar preavisos PDF</span>
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Card className="rounded-xl border-border shadow-sm">
                <CardContent className="p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Vencimientos visibles</p>
                  <p className="mt-1 text-2xl font-black">{visibleMonthlyExpirationRows.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedCenterName}</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl border-border shadow-sm">
                <CardContent className="p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Preavisos en PDF</p>
                  <p className="mt-1 text-2xl font-black">{bulkPreavisoRows.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Solo contratos a término fijo</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl border-border shadow-sm">
                <CardContent className="p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Preaviso vencido</p>
                  <p className="mt-1 text-2xl font-black">
                    {visibleMonthlyExpirationRows.filter((row) => row.preavisoExpired).length}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Fecha límite anterior a hoy</p>
                </CardContent>
              </Card>
            </div>

            {monthlyCenterSummaries.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">Resumen por centro</p>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {monthlyCenterSummaries.map((summary) => (
                    <button
                      key={summary.id}
                      type="button"
                      onClick={() => summary.id !== 'unassigned' && setExpirationCenterFilter(summary.id)}
                      className={cn(
                        'rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-colors hover:bg-background',
                        expirationCenterFilter === summary.id && 'border-primary bg-primary/5',
                        summary.id === 'unassigned' && 'cursor-default opacity-80'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{summary.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Próximo: {summary.earliestDate ? summary.earliestDate.toLocaleDateString('es-CO') : 'N/A'}
                          </p>
                        </div>
                        <Badge variant="outline" className="rounded-md">
                          {summary.count}
                        </Badge>
                      </div>
                      {summary.preavisoExpired > 0 && (
                        <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {summary.preavisoExpired} con preaviso vencido
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-border">
              <div className="max-h-[46vh] overflow-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="sticky top-0 z-[1] bg-background">
                    <tr className="border-b border-border text-left text-[11px] font-black uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-3">Empleado</th>
                      <th className="px-3 py-3">Centro</th>
                      <th className="px-3 py-3">Tipo</th>
                      <th className="px-3 py-3">Inicio</th>
                      <th className="px-3 py-3">Vencimiento</th>
                      <th className="px-3 py-3">Días</th>
                      <th className="px-3 py-3">Preaviso límite</th>
                      <th className="px-3 py-3">Prórroga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMonthlyExpirationRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">
                          No hay contratos aprobados y activos que venzan en el mes seleccionado.
                        </td>
                      </tr>
                    ) : (
                      visibleMonthlyExpirationRows.map((row) => (
                        <tr
                          key={row.contract.id}
                          className="border-b border-border/60 transition-colors hover:bg-background/70"
                        >
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => handleContractClick(row.contract.id)}
                              className="max-w-[220px] text-left"
                            >
                              <span className="block truncate font-semibold text-primary">{row.employeeName}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {row.documentNumber} · {row.positionName}
                              </span>
                            </button>
                          </td>
                          <td className="px-3 py-3">
                            <span className="block max-w-[180px] truncate">{row.centerName}</span>
                          </td>
                          <td className="px-3 py-3">{row.contractTypeLabel}</td>
                          <td className="px-3 py-3">{formatContractDate(row.contract.start_date)}</td>
                          <td className="px-3 py-3 font-semibold">{formatContractDate(row.effectiveEndDate)}</td>
                          <td className="px-3 py-3">
                            <Badge variant="outline" className={cn('rounded-md', row.daysRemaining < 0 && 'border-destructive text-destructive')}>
                              {row.daysRemaining}
                            </Badge>
                          </td>
                          <td className="px-3 py-3">
                            <span className={cn(row.preavisoExpired && 'font-semibold text-destructive')}>
                              {row.preavisoDeadline.toLocaleDateString('es-CO')}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {row.latestExtensionNumber > 0 ? `#${row.latestExtensionNumber}` : 'Contrato inicial'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border px-5 py-4">
            <Button variant="outline" onClick={() => setIsMonthlyExpirationsOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedContractId && (
        <ContractDetailDialog
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          contractId={selectedContractId}
        />
      )}

      <AutomaticExtensionRegularizationDialog
        open={isBulkRegularizationOpen}
        onOpenChange={setIsBulkRegularizationOpen}
        items={bulkRegularizationItems}
        selectable
        regularizationDate={bulkRegularizationDate}
        onRegularizationDateChange={setBulkRegularizationDate}
        isSubmitting={bulkRegularizeAutomaticExtensions.isPending}
        onConfirm={handleBulkRegularization}
      />
    </div>
  );
}
