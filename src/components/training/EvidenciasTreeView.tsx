import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { FolderTree, FileText, Eye, Download, Trash2, Layers, Scale, Building2, MapPin } from 'lucide-react';
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
  center: string;
  categories: {
    name: string;
    legalFrameworks: {
      name: string;
      areas: {
        name: string;
        completions: TrainingCompletion[];
      }[];
    }[];
  }[];
}

export default function EvidenciasTreeView({ completions, onViewSignature, onExportPdf, onDelete }: EvidenciasTreeViewProps) {
  const tree = useMemo(() => {
    const centerMap = new Map<string, Map<string, Map<string, Map<string, TrainingCompletion[]>>>>();

    for (const c of completions) {
      const center = (c as any).token?.center?.name || 'Sin centro';
      const category = c.course?.category || 'Sin categoría';
      const legal = (c.course as any)?.legal_framework || 'Sin marco legal';
      const area = (c.course as any)?.target_audience || 'Sin área';

      if (!centerMap.has(center)) centerMap.set(center, new Map());
      const catMap = centerMap.get(center)!;
      if (!catMap.has(category)) catMap.set(category, new Map());
      const legalMap = catMap.get(category)!;
      if (!legalMap.has(legal)) legalMap.set(legal, new Map());
      const areaMap = legalMap.get(legal)!;
      if (!areaMap.has(area)) areaMap.set(area, []);
      areaMap.get(area)!.push(c);
    }

    const result: TreeNode[] = [];
    for (const [center, catMap] of centerMap) {
      const categories = [];
      for (const [category, legalMap] of catMap) {
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
        categories.push({ name: category, legalFrameworks });
      }
      categories.sort((a, b) => a.name.localeCompare(b.name));
      result.push({ center, categories });
    }
    result.sort((a, b) => a.center.localeCompare(b.center));
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

  const centerCount = (node: TreeNode) =>
    node.categories.reduce((s1, cat) => s1 + cat.legalFrameworks.reduce((s2, lf) => s2 + lf.areas.reduce((s3, a) => s3 + a.completions.length, 0), 0), 0);

  const catCount = (cat: TreeNode['categories'][0]) =>
    cat.legalFrameworks.reduce((s, lf) => s + lf.areas.reduce((s2, a) => s2 + a.completions.length, 0), 0);

  const legalCount = (lf: TreeNode['categories'][0]['legalFrameworks'][0]) =>
    lf.areas.reduce((s, a) => s + a.completions.length, 0);

  return (
    <Accordion type="multiple" className="space-y-2">
      {tree.map((node) => (
        <AccordionItem key={node.center} value={node.center} className="border rounded-lg px-1 bg-card">
          <AccordionTrigger className="hover:no-underline px-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <span className="font-semibold">{node.center}</span>
              <Badge variant="secondary" className="ml-1">{centerCount(node)}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-2 pb-2">
            <Accordion type="multiple" className="space-y-1">
              {node.categories.map((cat) => (
                <AccordionItem key={cat.name} value={`${node.center}-${cat.name}`} className="border rounded-md px-1 bg-muted/30">
                  <AccordionTrigger className="hover:no-underline px-3 py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium">{cat.name}</span>
                      <Badge variant="outline" className="ml-1 text-xs">{catCount(cat)}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-2">
                    <Accordion type="multiple" className="space-y-1">
                      {cat.legalFrameworks.map((lf) => (
                        <AccordionItem key={lf.name} value={`${node.center}-${cat.name}-${lf.name}`} className="border rounded-md px-1 bg-background">
                          <AccordionTrigger className="hover:no-underline px-3 py-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Scale className="h-3.5 w-3.5 text-amber-600" />
                              <span>{lf.name}</span>
                              <Badge variant="outline" className="ml-1 text-xs">{legalCount(lf)}</Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-2 pb-2">
                            <Accordion type="multiple" className="space-y-1">
                              {lf.areas.map((area) => (
                                <AccordionItem key={area.name} value={`${node.center}-${cat.name}-${lf.name}-${area.name}`} className="border rounded-md px-1 bg-muted/20">
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
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
