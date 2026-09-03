import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CopasstElectionSelect } from '@/components/copasst/CopasstElectionSelect';
import { CopasstKpis } from '@/components/copasst/CopasstKpis';
import { COPASST_PERMISSIONS, getCopasstCompliance, listCopasstElections, logCopasstExport } from '@/lib/copasst';
import type { CopasstElector } from '@/types/copasst';

export default function CopasstCompliance() {
  const { currentCompanyId, canExport } = useAuth();
  const [electionId, setElectionId] = useState('');
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('all');
  const elections = useQuery({ queryKey: ['copasst-elections', currentCompanyId], queryFn: () => listCopasstElections(currentCompanyId!), enabled: !!currentCompanyId });
  const compliance = useQuery({ queryKey: ['copasst-compliance', electionId], queryFn: () => getCopasstCompliance(electionId), enabled: !!electionId });
  const rows = useMemo(() => (compliance.data?.electors ?? []).filter((row) => {
    const haystack = `${row.display_name} ${row.document_number} ${row.operation_center_name} ${row.area_name} ${row.position_name}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (gender === 'all' || (row.gender ?? 'Sin dato') === gender);
  }), [compliance.data, search, gender]);
  const groupedRows = useMemo(() => rows.reduce<{ pending: CopasstElector[]; voted: CopasstElector[] }>((groups, row) => {
    groups[row.voted_at ? 'voted' : 'pending'].push(row);
    return groups;
  }, { pending: [], voted: [] }), [rows]);
  const genders = [...new Set((compliance.data?.electors ?? []).map((row) => row.gender ?? 'Sin dato'))];

  const exportExcel = async () => {
    if (!electionId) return;
    const XLSX = await import('xlsx');
    const data = (compliance.data?.electors ?? []).map((row) => ({ Empleado: row.display_name, Documento: row.document_number, Sexo: row.gender ?? 'Sin dato', Centro: row.operation_center_name ?? 'Sin dato', Área: row.area_name ?? 'Sin dato', Cargo: row.position_name ?? 'Sin dato', Participó: row.voted_at ? 'Sí' : 'No', 'Fecha participación': row.voted_at ? new Date(row.voted_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : '' }));
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(data), 'Censo'); XLSX.writeFile(book, 'cumplimiento-copasst.xlsx');
    await logCopasstExport(electionId, 'electorate_xlsx'); toast.success('Excel generado');
  };

  return <div className="space-y-6 p-4 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-bold">Cumplimiento COPASST</h1><p className="text-muted-foreground">Consulta quién participó y quién está pendiente, sin revelar preferencias.</p></div>{canExport(COPASST_PERMISSIONS.compliance) && <Button variant="outline" onClick={exportExcel} disabled={!compliance.data}><Download className="mr-2 h-4 w-4" />Exportar censo</Button>}</div>
    <CopasstElectionSelect elections={elections.data ?? []} value={electionId} onChange={setElectionId} />
    {compliance.data && <><CopasstKpis summary={compliance.data.summary} /><div className="grid gap-3 md:grid-cols-2"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Nombre, documento, centro, área o cargo" value={search} onChange={(e) => setSearch(e.target.value)} /></div><Select value={gender} onValueChange={setGender}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los sexos</SelectItem>{genders.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
      <Accordion type="multiple" defaultValue={['pending', 'voted']} className="space-y-3"><ComplianceGroup value="pending" title="Pendientes" icon={<Clock3 className="h-5 w-5 text-amber-600" />} rows={groupedRows.pending} /><ComplianceGroup value="voted" title="Participaron" icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} rows={groupedRows.voted} /></Accordion></>}
    {!electionId && <p className="rounded-md border border-dashed p-10 text-center text-muted-foreground">Selecciona una elección para consultar el censo congelado.</p>}
  </div>;
}

function ComplianceGroup({ value, title, icon, rows }: { value: string; title: string; icon: ReactNode; rows: CopasstElector[] }) {
  return <AccordionItem value={value} className="overflow-hidden rounded-lg border px-4"><AccordionTrigger className="hover:no-underline"><span className="flex items-center gap-2">{icon}<span>{title}</span><Badge variant="secondary" className="tabular-nums">{rows.length}</Badge></span></AccordionTrigger><AccordionContent className="-mx-4 pb-0"><ElectorsTable rows={rows} /></AccordionContent></AccordionItem>;
}

function ElectorsTable({ rows }: { rows: CopasstElector[] }) {
  return <Table><TableHeader><TableRow><TableHead>Empleado</TableHead><TableHead>Documento</TableHead><TableHead>Sexo</TableHead><TableHead>Centro</TableHead><TableHead>Área</TableHead><TableHead>Cargo</TableHead><TableHead>Estado</TableHead><TableHead>Fecha</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.display_name}</TableCell><TableCell>{row.document_number}</TableCell><TableCell>{row.gender ?? 'Sin dato'}</TableCell><TableCell>{row.operation_center_name ?? 'Sin dato'}</TableCell><TableCell>{row.area_name ?? 'Sin dato'}</TableCell><TableCell>{row.position_name ?? 'Sin dato'}</TableCell><TableCell><Badge variant={row.voted_at ? 'default' : 'secondary'}>{row.voted_at ? 'Participó' : 'Pendiente'}</Badge></TableCell><TableCell>{row.voted_at ? new Date(row.voted_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : '—'}</TableCell></TableRow>)}{rows.length === 0 ? <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No hay empleados en este estado con los filtros actuales.</TableCell></TableRow> : null}</TableBody></Table>;
}
