import { useState, useMemo, useRef, useEffect } from 'react';
import { OrgChartNode } from './OrgChartNode';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, Search, Plus, Minus, Maximize, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Position {
  id: string;
  name: string;
  code?: string | null;
  area_id?: string | null;
  parent_position_id?: string | null;
  level?: number | null;
  is_active?: boolean | null;
}

interface Area {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  work_info?: {
    position_id?: string;
  } | null;
}

interface OrgChartProps {
  positions: Position[];
  areas: Area[];
  employees: Employee[];
  isLoading?: boolean;
}

interface PositionNode {
  id: string;
  name: string;
  code?: string;
  areaName?: string;
  level?: number;
  employees: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  }[];
  children: PositionNode[];
}

export function OrgChart({ positions, areas, employees, isLoading }: OrgChartProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Motion values for pan
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const areaMap = useMemo(() => {
    const map = new Map<string, string>();
    areas.forEach(a => map.set(a.id, a.name));
    return map;
  }, [areas]);

  const positionTree = useMemo(() => {
    const activePositions = positions.filter(p => p.is_active !== false);
    const nodeMap = new Map<string, PositionNode>();

    activePositions.forEach(pos => {
      const posEmployees = employees
        .filter(e => e.work_info?.position_id === pos.id)
        .map(e => ({
          id: e.id,
          first_name: e.first_name,
          last_name: e.last_name,
          avatar_url: e.avatar_url || undefined,
        }));

      nodeMap.set(pos.id, {
        id: pos.id,
        name: pos.name,
        code: pos.code || undefined,
        areaName: pos.area_id ? areaMap.get(pos.area_id) : undefined,
        level: pos.level || undefined,
        employees: posEmployees,
        children: [],
      });
    });

    const roots: PositionNode[] = [];
    activePositions.forEach(pos => {
      const node = nodeMap.get(pos.id);
      if (!node) return;
      if (pos.parent_position_id && nodeMap.has(pos.parent_position_id)) {
        nodeMap.get(pos.parent_position_id)?.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortChildren = (nodes: PositionNode[]) => {
      nodes.sort((a, b) => (a.level || 99) - (b.level || 99) || a.name.localeCompare(b.name));
      nodes.forEach(n => sortChildren(n.children));
    };
    sortChildren(roots);

    return roots;
  }, [positions, employees, areaMap]);

  // Initial expand
  useEffect(() => {
    if (positionTree.length > 0 && expandedNodes.size === 0) {
      const initial = new Set<string>();
      positionTree.forEach(r => initial.add(r.id));
      setExpandedNodes(initial);
    }
  }, [positionTree]);

  // Handle Search & Auto-expand
  useEffect(() => {
    if (searchQuery.length < 2) return;
    
    const newExpanded = new Set(expandedNodes);
    const query = searchQuery.toLowerCase();
    
    const findAndExpand = (nodes: PositionNode[], parentIds: string[] = []): boolean => {
      let foundInBranch = false;
      nodes.forEach(node => {
        const matches = 
          node.name.toLowerCase().includes(query) || 
          node.employees.some(e => `${e.first_name} ${e.last_name}`.toLowerCase().includes(query));
        
        if (matches) {
          parentIds.forEach(id => newExpanded.add(id));
          foundInBranch = true;
        }
        
        if (findAndExpand(node.children, [...parentIds, node.id])) {
          foundInBranch = true;
        }
      });
      return foundInBranch;
    };
    
    findAndExpand(positionTree);
    setExpandedNodes(newExpanded);
  }, [searchQuery]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collect = (nodes: PositionNode[]) => {
      nodes.forEach(n => { allIds.add(n.id); collect(n.children); });
    };
    collect(positionTree);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => setExpandedNodes(new Set());

  const resetView = () => {
    setZoom(1);
    x.set(0);
    y.set(0);
  };

  const renderNode = (node: PositionNode, level: number): React.ReactNode => {
    const isMatched = searchQuery.length >= 2 && (
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.employees.some(e => `${e.first_name} ${e.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
      <OrgChartNode
        key={node.id}
        position={node}
        isExpanded={expandedNodes.has(node.id)}
        onToggle={() => toggleNode(node.id)}
        hasChildren={node.children.length > 0}
        level={level}
        highlighted={isMatched}
      >
        {node.children.map(child => renderNode(child, level + 1))}
      </OrgChartNode>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 p-4 sm:gap-6 sm:p-8">
        <Skeleton className="h-28 w-full max-w-64 sm:h-32" />
        <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-8">
          <Skeleton className="h-28 w-full sm:h-32" />
          <Skeleton className="h-28 w-full sm:h-32" />
          <Skeleton className="h-28 w-full sm:h-32" />
        </div>
      </div>
    );
  }

  if (positionTree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center text-muted-foreground sm:py-16">
        <Briefcase className="w-12 h-12 mb-4 opacity-50 sm:h-16 sm:w-16" />
        <p className="text-base font-medium sm:text-lg">No hay cargos configurados</p>
        <p className="max-w-md text-sm">
          Configura los cargos y asigna cargos superiores en Configuración para ver el organigrama
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl border bg-muted/20" style={{ height: '700px' }}>
      {/* Search and Global Controls */}
      <div className="absolute left-4 top-4 z-20 flex flex-col gap-2 sm:flex-row sm:items-center w-full max-w-[calc(100%-2rem)] pointer-events-none">
        <div className="relative w-full sm:w-80 pointer-events-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cargo o empleado..."
            className="pl-9 bg-background/80 backdrop-blur-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 pointer-events-auto">
          <Button variant="secondary" size="sm" onClick={expandAll} className="h-9 px-3 gap-2">
            <ChevronDown className="h-4 w-4" /> Expandir Todo
          </Button>
          <Button variant="secondary" size="sm" onClick={collapseAll} className="h-9 px-3 gap-2">
            <ChevronUp className="h-4 w-4" /> Contraer Todo
          </Button>
        </div>
      </div>

      {/* Navigation Controls (Zoom/Reset) */}
      <div className="absolute right-4 bottom-4 z-20 flex flex-col gap-2">
        <div className="flex flex-col overflow-hidden rounded-lg border bg-background/80 shadow-lg backdrop-blur-sm">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-none border-b" onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-none" onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.4))}>
            <Minus className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="secondary" size="icon" className="h-10 w-10 rounded-lg shadow-lg" onClick={resetView} title="Resetear vista">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute left-4 bottom-4 z-20 bg-background/80 px-2 py-1 rounded border text-[10px] font-mono shadow-sm">
        {Math.round(zoom * 100)}%
      </div>

      {/* The Canvas */}
      <div className="h-full w-full cursor-grab active:cursor-grabbing overflow-hidden" ref={containerRef}>
        <motion.div
          drag
          dragMomentum={false}
          style={{ x, y, scale: zoom }}
          className="flex min-w-max flex-col items-center p-32 origin-top"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="inline-flex flex-col items-center">
            {positionTree.length === 1 ? (
              renderNode(positionTree[0], 0)
            ) : (
              <div className="flex gap-12 sm:gap-24">
                {positionTree.map(root => renderNode(root, 0))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
