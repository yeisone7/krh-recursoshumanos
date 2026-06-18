import { useState, useMemo, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, Trash2, Eye, Download, List, FolderTree, Files, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTrainingCompletions, useDeleteCompletion, useBulkDeleteCompletions, useTrainingCourses } from '@/hooks/useTraining';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import PizZip from 'pizzip';
import type { TrainingCompletion } from '@/types/training';
import EvidenciasTreeView from '@/components/training/EvidenciasTreeView';

export default function Evidencias() {
  const { data: completions = [] } = useTrainingCompletions();
  const { data: courses = [] } = useTrainingCourses();
  const deleteCompletion = useDeleteCompletion();
  const bulkDelete = useBulkDeleteCompletions();
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('tree');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [signatureView, setSignatureView] = useState<string | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkCenter, setBulkCenter] = useState('');
  const [bulkCourse, setBulkCourse] = useState('');
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  const filtered = useMemo(() => {
    return (completions as TrainingCompletion[]).filter(c => {
      const matchSearch = c.operator_name.toLowerCase().includes(search.toLowerCase()) || (c.operator_cedula || '').includes(search);
      const matchCourse = filterCourse === 'all' || c.course_id === filterCourse;
      return matchSearch && matchCourse;
    });
  }, [completions, search, filterCourse]);

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(c => c.id)));

  const getCompletionCenter = (completion: TrainingCompletion) => ({
    id: (completion as any).token?.center?.id || (completion as any).token?.operation_center_id || 'sin-centro',
    name: (completion as any).token?.center?.name || 'Sin centro',
  });

  const centerOptions = useMemo(() => {
    const map = new Map<string, string>();
    (completions as TrainingCompletion[]).forEach((completion) => {
      const center = getCompletionCenter(completion);
      map.set(center.id, center.name);
    });
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [completions]);

  const bulkCourseOptions = useMemo(() => {
    const source = (completions as TrainingCompletion[]).filter((completion) => {
      if (!bulkCenter) return true;
      return getCompletionCenter(completion).id === bulkCenter;
    });
    const map = new Map<string, string>();
    source.forEach((completion) => {
      map.set(completion.course_id, completion.course?.name || 'Sin capacitacion');
    });
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [bulkCenter, completions]);

  const bulkCandidates = useMemo(() => {
    if (!bulkCenter || !bulkCourse) return [];
    return (completions as TrainingCompletion[])
      .filter((completion) => getCompletionCenter(completion).id === bulkCenter && completion.course_id === bulkCourse)
      .sort((a, b) => a.operator_name.localeCompare(b.operator_name));
  }, [bulkCenter, bulkCourse, completions]);

  const selectedBulkCompletions = useMemo(
    () => bulkCandidates.filter((completion) => bulkSelected.has(completion.id)),
    [bulkCandidates, bulkSelected]
  );

  useEffect(() => {
    if (!bulkDialogOpen || !bulkCenter || bulkCourse || bulkCourseOptions.length === 0) return;
    setBulkCourse(bulkCourseOptions[0].id);
  }, [bulkCenter, bulkCourse, bulkCourseOptions, bulkDialogOpen]);

  useEffect(() => {
    if (!bulkDialogOpen || !bulkCourse) return;
    setBulkSelected(new Set(bulkCandidates.map((completion) => completion.id)));
  }, [bulkCandidates, bulkCourse, bulkDialogOpen]);

  const toggleBulkSelect = (id: string) => {
    setBulkSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleBulkAll = () => {
    setBulkSelected(prev => (
      bulkCandidates.length > 0 && prev.size === bulkCandidates.length
        ? new Set()
        : new Set(bulkCandidates.map((completion) => completion.id))
    ));
  };

  const handleDelete = async (id: string) => { try { await deleteCompletion.mutateAsync(id); toast.success('Eliminado'); } catch { toast.error('Error'); } };
  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    try { await bulkDelete.mutateAsync([...selected]); setSelected(new Set()); toast.success(`${selected.size} registros eliminados`); } catch { toast.error('Error'); }
  };

  const loadImageAsDataUrl = (src: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject();
      img.src = src;
    });
  };

  const buildCertificatePdf = async (completion: TrainingCompletion) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    // --- Navy blue header bar ---
    doc.setFillColor(15, 30, 60);
    doc.rect(0, 0, pageWidth, 38, 'F');

    // Orange accent line under header
    doc.setFillColor(237, 137, 54);
    doc.rect(0, 38, pageWidth, 3, 'F');

    // Logo top-right on header
    try {
      const logoDataUrl = await loadImageAsDataUrl('/images/petrocasinos-logo-white.png');
      const tmpImg = new Image();
      tmpImg.src = logoDataUrl;
      await new Promise(r => { tmpImg.onload = r; });
      const logoH = 14;
      const logoW = (tmpImg.naturalWidth / tmpImg.naturalHeight) * logoH;
      doc.addImage(logoDataUrl, 'PNG', pageWidth - margin - logoW, 9, logoW, logoH);
    } catch { /* skip logo */ }

    // Company name in header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('PETROCASINOS S.A.', margin, 18);

    // Document title in header
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 210, 230);
    doc.text('Constancia de Capacitación', margin, 28);

    // Document number / date on the right
    doc.setFontSize(9);
    doc.setTextColor(180, 190, 210);
    doc.text(`Fecha de generación: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - margin, 28, { align: 'right' });

    // --- Certificate title ---
    let y = 56;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 30, 60);
    doc.text('CONSTANCIA DE CAPACITACIÓN', pageWidth / 2, y, { align: 'center' });

    // Decorative line under title
    y += 4;
    doc.setDrawColor(237, 137, 54);
    doc.setLineWidth(1.5);
    doc.line(pageWidth / 2 - 45, y, pageWidth / 2 + 45, y);

    // --- Body text ---
    y += 14;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    const bodyText = `Se hace constar que el/la participante identificado(a) a continuación completó satisfactoriamente la capacitación indicada, cumpliendo con los requisitos de evaluación y asistencia establecidos.`;
    const bodyLines = doc.splitTextToSize(bodyText, contentWidth);
    doc.text(bodyLines, margin, y);
    y += bodyLines.length * 6 + 10;

    // --- Information card ---
    const cardStartY = y;
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentWidth, 60, 3, 3, 'FD');

    y += 10;
    const labelX = margin + 10;
    const valueX = margin + 55;

    const drawField = (label: string, value: string, yPos: number) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(100, 110, 130);
      doc.text(label, labelX, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(value, valueX, yPos);
    };

    drawField('Participante:', completion.operator_name, y);
    y += 10;
    drawField('Cédula:', completion.operator_cedula || 'N/A', y);
    y += 10;
    drawField('Capacitación:', completion.course?.name || 'N/A', y);
    y += 10;
    drawField('Fecha:', format(parseISO(completion.completed_at), "dd 'de' MMMM 'de' yyyy - HH:mm", { locale: es }), y);
    y += 10;
    if (completion.quiz_score !== null && completion.quiz_score !== undefined) {
      drawField('Calificación:', `${completion.quiz_score}%`, y);
    }

    y = cardStartY + 60 + 15;

    // --- Signature section ---
    if (completion.signature_data) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(100, 110, 130);
      doc.text('Firma del participante:', pageWidth / 2, y, { align: 'center' });
      y += 5;

      // Signature box
      const sigWidth = 100;
      const sigHeight = 40;
      const sigX = (pageWidth - sigWidth) / 2;
      doc.setDrawColor(200, 205, 215);
      doc.setLineWidth(0.3);
      doc.roundedRect(sigX, y, sigWidth, sigHeight, 2, 2, 'S');

      try {
        doc.addImage(completion.signature_data, 'PNG', sigX + 5, y + 2, sigWidth - 10, sigHeight - 4);
      } catch { /* skip */ }

      y += sigHeight + 5;
      // Name under signature
      doc.setDrawColor(80, 80, 80);
      doc.setLineWidth(0.5);
      doc.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(completion.operator_name, pageWidth / 2, y, { align: 'center' });
      y += 4;
      doc.text(`C.C. ${completion.operator_cedula || 'N/A'}`, pageWidth / 2, y, { align: 'center' });
    }

    // --- Footer ---
    // Orange line
    doc.setFillColor(237, 137, 54);
    doc.rect(0, pageHeight - 18, pageWidth, 2, 'F');

    // Footer text
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 140, 140);
    doc.text('Este documento es una constancia de capacitación generada electrónicamente por el sistema de gestión RRHH.', pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('PETROCASINOS S.A. — Sistema de Gestión de Capacitaciones', pageWidth / 2, pageHeight - 5, { align: 'center' });

    return doc;
  };

  const sanitizeFileName = (value: string) => (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'constancia'
  );

  const exportPdf = async (completion: TrainingCompletion) => {
    const doc = await buildCertificatePdf(completion);
    doc.save(`constancia-${sanitizeFileName(completion.operator_name)}.pdf`);
  };

  const handleOpenBulkDialog = () => {
    setBulkDialogOpen(true);
    if (!bulkCenter && centerOptions[0]) setBulkCenter(centerOptions[0].id);
  };

  const handleBulkGenerate = async () => {
    if (selectedBulkCompletions.length === 0) return;
    setIsBulkGenerating(true);
    try {
      const zip = new PizZip();
      for (const completion of selectedBulkCompletions) {
        const doc = await buildCertificatePdf(completion);
        const fileName = [
          'constancia',
          sanitizeFileName(completion.course?.name || 'capacitacion'),
          sanitizeFileName(completion.operator_name),
          sanitizeFileName(completion.operator_cedula || completion.id),
        ].join('-');
        zip.file(`${fileName}.pdf`, doc.output('arraybuffer'));
      }

      const blob = zip.generate({ type: 'blob', compression: 'DEFLATE' });
      const centerName = centerOptions.find((center) => center.id === bulkCenter)?.name || 'centro';
      const courseName = bulkCourseOptions.find((course) => course.id === bulkCourse)?.name || 'capacitacion';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `constancias-${sanitizeFileName(centerName)}-${sanitizeFileName(courseName)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`${selectedBulkCompletions.length} constancias generadas`);
      setBulkDialogOpen(false);
    } catch {
      toast.error('No se pudieron generar las constancias');
    } finally {
      setIsBulkGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-8 py-8 border border-border/50 rounded-[2rem] shadow-sm mb-8">
        
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Evidencias</h1>
            <p className="text-muted-foreground font-medium mt-1">Registro de capacitaciones completadas con firma digital</p>
          </div>
          <div className="flex gap-1 bg-background border border-border/50 rounded-xl p-1 shadow-inner shrink-0">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg" onClick={handleOpenBulkDialog} title="Generar constancias masivas"><Files className="h-4 w-4" /></Button>
            <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="icon" className={`h-10 w-10 rounded-lg ${viewMode === 'table' ? 'shadow-md' : ''}`} onClick={() => setViewMode('table')}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === 'tree' ? 'default' : 'ghost'} size="icon" className={`h-10 w-10 rounded-lg ${viewMode === 'tree' ? 'shadow-md' : ''}`} onClick={() => setViewMode('tree')}><FolderTree className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-background border border-border/50 rounded-[2rem] p-4 shadow-sm mb-6">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o cédula..." className="pl-12 h-12 rounded-xl border-border/50 bg-background shadow-inner text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCourse} onValueChange={setFilterCourse}>
          <SelectTrigger className="w-full sm:w-64 h-12 rounded-xl border-border/50 bg-background shadow-inner text-sm">
            <SelectValue placeholder="Capacitación" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">Todas</SelectItem>
            {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {selected.size > 0 && <Button variant="destructive" className="h-12 px-6 rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-destructive/20 w-full sm:w-auto" onClick={handleBulkDelete}><Trash2 className="h-4 w-4 mr-2" /> Eliminar ({selected.size})</Button>}
      </div>

      {viewMode === 'tree' ? (
        <EvidenciasTreeView
          completions={filtered}
          onViewSignature={setSignatureView}
          onExportPdf={exportPdf}
          onDelete={handleDelete}
        />
      ) : (
        <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-background">
                <TableRow>
                  <TableHead className="w-10 h-12"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground h-12">Nombre</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground h-12">Cédula</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground h-12">Capacitación</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground h-12">Fecha</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground h-12 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-16 h-32">No hay evidencias registradas</TableCell></TableRow>
                ) : filtered.map(c => (
                  <TableRow key={c.id} className="hover:bg-background /10 transition-colors">
                    <TableCell><Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></TableCell>
                    <TableCell className="font-bold text-sm">{c.operator_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground font-medium">{c.operator_cedula || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-primary border-primary/20">{c.course?.name || '-'}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{format(parseISO(c.completed_at), 'dd/MM/yyyy HH:mm', { locale: es })}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setSignatureView(c.signature_data)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" onClick={() => exportPdf(c)}><Download className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!signatureView} onOpenChange={() => setSignatureView(null)}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Firma Digital</DialogTitle></DialogHeader>
          {signatureView && <div className="bg-white rounded-lg p-4 border"><img src={signatureView} alt="Firma" className="w-full" /></div>}
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Generar constancias por centro y capacitacion</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                value={bulkCenter}
                onValueChange={(value) => {
                  setBulkCenter(value);
                  setBulkCourse('');
                  setBulkSelected(new Set());
                }}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Centro de operacion" />
                </SelectTrigger>
                <SelectContent>
                  {centerOptions.map((center) => (
                    <SelectItem key={center.id} value={center.id}>{center.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={bulkCourse}
                onValueChange={(value) => {
                  setBulkCourse(value);
                  setBulkSelected(new Set());
                }}
                disabled={!bulkCenter}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Capacitacion" />
                </SelectTrigger>
                <SelectContent>
                  {bulkCourseOptions.map((course) => (
                    <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-border/60">
              <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
                <div>
                  <p className="text-sm font-bold">Empleados capacitados</p>
                  <p className="text-xs text-muted-foreground">{selectedBulkCompletions.length} de {bulkCandidates.length} seleccionados</p>
                </div>
                <Button variant="outline" size="sm" onClick={toggleBulkAll} disabled={bulkCandidates.length === 0}>
                  {bulkSelected.size === bulkCandidates.length && bulkCandidates.length > 0 ? 'Limpiar' : 'Seleccionar todos'}
                </Button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {bulkCandidates.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Selecciona un centro y una capacitacion con evidencias registradas.
                  </div>
                ) : (
                  bulkCandidates.map((completion) => (
                    <label key={completion.id} className="flex cursor-pointer items-center gap-3 border-b border-border/40 px-4 py-3 last:border-b-0 hover:bg-muted/40">
                      <Checkbox checked={bulkSelected.has(completion.id)} onCheckedChange={() => toggleBulkSelect(completion.id)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{completion.operator_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {completion.operator_cedula || 'Sin cedula'} - {format(parseISO(completion.completed_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                          {completion.quiz_score != null ? ` - ${completion.quiz_score}%` : ''}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setBulkDialogOpen(false)} disabled={isBulkGenerating}>
                Cancelar
              </Button>
              <Button onClick={handleBulkGenerate} disabled={selectedBulkCompletions.length === 0 || isBulkGenerating}>
                {isBulkGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Generar ZIP ({selectedBulkCompletions.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
