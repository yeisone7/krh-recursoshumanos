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

  const exportPdf = (completion: TrainingCompletion) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('CONSTANCIA DE CAPACITACIÓN', 105, 30, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Capacitación: ${completion.course?.name || 'N/A'}`, 20, 50);
    doc.text(`Participante: ${completion.operator_name}`, 20, 60);
    doc.text(`Cédula: ${completion.operator_cedula || 'N/A'}`, 20, 70);
    doc.text(`Fecha: ${format(parseISO(completion.completed_at), 'dd/MM/yyyy HH:mm', { locale: es })}`, 20, 80);
    if (completion.signature_data) {
      try { doc.addImage(completion.signature_data, 'PNG', 60, 100, 90, 40); } catch { /* skip */ }
      doc.text('Firma del participante', 105, 150, { align: 'center' });
    }
    doc.setFontSize(8);
    doc.text(`Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 105, 280, { align: 'center' });
    doc.save(`evidencia-${completion.operator_name.replace(/\s+/g, '-')}.pdf`);
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
