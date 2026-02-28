import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { FolderTree, FileText, Eye, Download, Trash2, ChevronRight, Layers, Scale, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { TrainingCompletion } from '@/types/training';

interface EvidenciasTreeViewProps {
  completions: TrainingCompletion[];
  onViewSignature: (signatureData: string | null) => void;
  onExportPdf: (completion: TrainingCompletion) => void;
  onDelete: (id: string) => void;
}

interface TreeNode {
  category: string;
  legalFrameworks: {
    name: string;
    areas: {
      name: string;
      completions: TrainingCompletion[];
    }[];
  }[];
}

export default function EvidenciasTreeView({ completions, onViewSignature, onExportPdf, onDelete }: EvidenciasTreeViewProps) {
  const tree = useMemo(() => {
    const categoryMap = new Map<string, Map<string, Map<string, TrainingCompletion[]>>>();

    for (const c of completions) {
      const category = c.course?.category || 'Sin categoría';
      const legal = (c.course as any)?.legal_framework || 'Sin marco legal';
      const area = (c.course as any)?.target_audience || 'Sin área';

      if (!categoryMap.has(category)) categoryMap.set(category, new Map());
      const legalMap = categoryMap.get(category)!;
      if (!legalMap.has(legal)) legalMap.set(legal, new Map());
      const areaMap = legalMap.get(legal)!;
      if (!areaMap.has(area)) areaMap.set(area, []);
      areaMap.get(area)!.push(c);
    }

    const result: TreeNode[] = [];
    for (const [category, legalMap] of categoryMap) {
      const legalFrameworks = [];
      for (const [legal, areaMap] of legalMap) {
        const areas = [];
        for (const [area, comps] of areaMap) {
          areas.push({ name: area, completions: comps });
        }
        areas.sort((a, b) => a.name.localeCompare(b.name));
        legalFrameworks.push({ name: legal, areas });
      }
      legalFrameworks.sort((a, b) => a.name.localeCompare(b.name));
      result.push({ category, legalFrameworks });
    }
    result.sort((a, b) => a.category.localeCompare(b.category));
    return result;
  }, [completions]);

  if (completions.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <FolderTree className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p>No hay evidencias registradas</p>
      </div>
    );
  }

  const totalCount = (node: TreeNode) =>
    node.legalFrameworks.reduce((sum, lf) => sum + lf.areas.reduce((s, a) => s + a.completions.length, 0), 0);

  const legalCount = (lf: TreeNode['legalFrameworks'][0]) =>
    lf.areas.reduce((s, a) => s + a.completions.length, 0);

  return (
    <Accordion type="multiple" className="space-y-2">
      {tree.map((node) => (
        <AccordionItem key={node.category} value={node.category} className="border rounded-lg px-1 bg-card">
          <AccordionTrigger className="hover:no-underline px-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span className="font-semibold">{node.category}</span>
              <Badge variant="secondary" className="ml-1">{totalCount(node)}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-2 pb-2">
            <Accordion type="multiple" className="space-y-1">
              {node.legalFrameworks.map((lf) => (
                <AccordionItem key={lf.name} value={`${node.category}-${lf.name}`} className="border rounded-md px-1 bg-muted/30">
                  <AccordionTrigger className="hover:no-underline px-3 py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <Scale className="h-3.5 w-3.5 text-amber-600" />
                      <span className="font-medium">{lf.name}</span>
                      <Badge variant="outline" className="ml-1 text-xs">{legalCount(lf)}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-2">
                    <Accordion type="multiple" className="space-y-1">
                      {lf.areas.map((area) => (
                        <AccordionItem key={area.name} value={`${node.category}-${lf.name}-${area.name}`} className="border rounded-md px-1 bg-background">
                          <AccordionTrigger className="hover:no-underline px-3 py-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-blue-600" />
                              <span>{area.name}</span>
                              <Badge variant="outline" className="ml-1 text-xs">{area.completions.length}</Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-1 pb-1">
                            <div className="space-y-1">
                              {area.completions.map((c) => (
                                <div key={c.id} className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <div className="min-w-0">
                                      <p className="font-medium truncate">{c.operator_name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {c.operator_cedula || 'Sin cédula'} · {c.course?.name} · {format(parseISO(c.completed_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                                        {c.quiz_score != null && ` · ${c.quiz_score}%`}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-0.5 shrink-0">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onViewSignature(c.signature_data)}><Eye className="h-3.5 w-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onExportPdf(c)}><Download className="h-3.5 w-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
