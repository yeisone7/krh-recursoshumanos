import { useState, useMemo, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Eye, Download, Trash2, MapPin, Layers, Scale, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TrainingCompletion } from '@/types/training';

interface EvidenciasTreeViewProps {
  completions: TrainingCompletion[];
  onViewSignature: (signatureData: string | null) => void;
  onExportPdf: (completion: TrainingCompletion) => void;
  onDelete: (id: string) => void;
}

interface TreeNodeData {
  id: string;
  label: string;
  children?: TreeNodeData[];
  completion?: TrainingCompletion;
}

function TreeNode({
  node,
  depth = 0,
  selectedId,
  onSelect,
  expanded,
  onToggle,
  onViewSignature,
  onExportPdf,
  onDelete,
}: {
  node: TreeNodeData;
  depth?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onViewSignature: (s: string | null) => void;
  onExportPdf: (c: TrainingCompletion) => void;
  onDelete: (id: string) => void;
}) {
  const isFolder = !!node.children;
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = isFolder && node.children!.length > 0;

  return (
    <div className="select-none">
      {/* Node row */}
      <div
        className={cn(
          'flex items-center gap-1 py-[3px] px-1 rounded-sm cursor-pointer text-sm hover:bg-muted/60 transition-colors',
          isSelected && 'bg-primary/10 text-primary'
        )}
        style={{ paddingLeft: `${depth * 20 + 4}px` }}
        onClick={() => {
          onSelect(node.id);
          if (isFolder) onToggle(node.id);
        }}
      >
        {/* Expand/collapse caret */}
        {isFolder ? (
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {hasChildren ? (
              isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <span className="w-3.5" />
            )}
          </span>
        ) : (
          <span className="w-4" />
        )}

        {/* Icon */}
        {isFolder ? (
          isOpen ? <FolderOpen className="h-4 w-4 text-yellow-500 shrink-0" /> : <Folder className="h-4 w-4 text-yellow-500 shrink-0" />
        ) : (
          <FileText className="h-4 w-4 shrink-0" style={{ color: '#3b3a59' }} />
        )}

        {/* Label */}
        <span className={cn('truncate', isFolder && 'font-medium')}>{node.label}</span>

        {/* Leaf actions */}
        {node.completion && (
          <div className="flex gap-0.5 ml-auto shrink-0 opacity-0 group-hover/leaf:opacity-100" style={{ opacity: isSelected ? 1 : undefined }}>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); onViewSignature(node.completion!.signature_data); }}><Eye className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); onExportPdf(node.completion!); }}><Download className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={e => { e.stopPropagation(); onDelete(node.completion!.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        )}
      </div>

      {/* Children with tree lines */}
      {isFolder && isOpen && hasChildren && (
        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute top-0 bottom-2 border-l border-border"
            style={{ left: `${depth * 20 + 14}px` }}
          />
          {node.children!.map((child, idx) => (
            <div key={child.id} className="relative group/leaf">
              {/* Horizontal connector line */}
              <div
                className="absolute border-t border-border"
                style={{
                  left: `${depth * 20 + 14}px`,
                  width: '10px',
                  top: '14px',
                }}
              />
              <TreeNode
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
                expanded={expanded}
                onToggle={onToggle}
                onViewSignature={onViewSignature}
                onExportPdf={onExportPdf}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EvidenciasTreeView({ completions, onViewSignature, onExportPdf, onDelete }: EvidenciasTreeViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const onToggle = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const tree = useMemo<TreeNodeData[]>(() => {
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

    const nodes: TreeNodeData[] = [];
    for (const [center, catMap] of [...centerMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const catChildren: TreeNodeData[] = [];
      for (const [cat, legalMap] of [...catMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        const legalChildren: TreeNodeData[] = [];
        for (const [legal, areaMap] of [...legalMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
          const areaChildren: TreeNodeData[] = [];
          for (const [area, comps] of [...areaMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
            const leafs: TreeNodeData[] = comps.map(c => ({
              id: c.id,
              label: `${c.operator_name} — ${c.operator_cedula || 'Sin cédula'} — ${format(parseISO(c.completed_at), 'dd/MM/yyyy HH:mm', { locale: es })}${c.quiz_score != null ? ` — ${c.quiz_score}%` : ''}`,
              completion: c,
            }));
            areaChildren.push({ id: `${center}-${cat}-${legal}-${area}`, label: area, children: leafs });
          }
          legalChildren.push({ id: `${center}-${cat}-${legal}`, label: legal, children: areaChildren });
        }
        catChildren.push({ id: `${center}-${cat}`, label: cat, children: legalChildren });
      }
      nodes.push({ id: center, label: center, children: catChildren });
    }
    return nodes;
  }, [completions]);

  if (completions.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <Folder className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p>No hay evidencias registradas</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md bg-card p-2 font-mono text-[13px]">
      {tree.map(node => (
        <TreeNode
          key={node.id}
          node={node}
          selectedId={selectedId}
          onSelect={setSelectedId}
          expanded={expanded}
          onToggle={onToggle}
          onViewSignature={onViewSignature}
          onExportPdf={onExportPdf}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
