import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, Trash2, FileSignature, Eye, Download, List, FolderTree, CheckSquare } from 'lucide-react';
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
import type { TrainingCompletion } from '@/types/training';

export default function Evidencias() {
  const { data: completions = [] } = useTrainingCompletions();
  const { data: courses = [] } = useTrainingCourses();
  const deleteCompletion = useDeleteCompletion();
  const bulkDelete = useBulkDeleteCompletions();
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [signatureView, setSignatureView] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return (completions as TrainingCompletion[]).filter(c => {
      const matchSearch = c.operator_name.toLowerCase().includes(search.toLowerCase()) || (c.operator_cedula || '').includes(search);
      const matchCourse = filterCourse === 'all' || c.course_id === filterCourse;
      return matchSearch && matchCourse;
    });
  }, [completions, search, filterCourse]);

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(c => c.id)));

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

  const exportPdf = async (completion: TrainingCompletion) => {
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
      const logoH = 20;
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

    doc.save(`constancia-${completion.operator_name.replace(/\s+/g, '-')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Evidencias</h1><p className="text-muted-foreground">Registro de capacitaciones completadas con firma digital</p></div>
        <div className="flex gap-1 border rounded-lg p-1">
          <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('table')}><List className="h-4 w-4" /></Button>
          <Button variant={viewMode === 'tree' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('tree')}><FolderTree className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por nombre o cédula..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={filterCourse} onValueChange={setFilterCourse}><SelectTrigger className="w-48"><SelectValue placeholder="Capacitación" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
        {selected.size > 0 && <Button variant="destructive" size="sm" onClick={handleBulkDelete}><Trash2 className="h-4 w-4 mr-1" /> Eliminar ({selected.size})</Button>}
      </div>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></TableHead>
                <TableHead>Nombre</TableHead><TableHead>Cédula</TableHead><TableHead>Capacitación</TableHead><TableHead>Fecha</TableHead><TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay evidencias registradas</TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell><Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></TableCell>
                  <TableCell className="font-medium">{c.operator_name}</TableCell>
                  <TableCell>{c.operator_cedula || '-'}</TableCell>
                  <TableCell>{c.course?.name || '-'}</TableCell>
                  <TableCell>{format(parseISO(c.completed_at), 'dd/MM/yyyy HH:mm', { locale: es })}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setSignatureView(c.signature_data)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => exportPdf(c)}><Download className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!signatureView} onOpenChange={() => setSignatureView(null)}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Firma Digital</DialogTitle></DialogHeader>
          {signatureView && <div className="bg-white rounded-lg p-4 border"><img src={signatureView} alt="Firma" className="w-full" /></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
