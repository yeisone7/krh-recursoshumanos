import { useState, useMemo } from 'react';
import { OrgChartNode } from './OrgChartNode';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase } from 'lucide-react';

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

  useMemo(() => {
    if (positionTree.length > 0 && expandedNodes.size === 0) {
      const initial = new Set<string>();
      positionTree.forEach(r => initial.add(r.id));
      setExpandedNodes(initial);
    }
  }, [positionTree]);

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

  const renderNode = (node: PositionNode, level: number): React.ReactNode => (
    <OrgChartNode
      key={node.id}
      position={node}
      isExpanded={expandedNodes.has(node.id)}
      onToggle={() => toggleNode(node.id)}
      hasChildren={node.children.length > 0}
      level={level}
    >
      {node.children.map(child => renderNode(child, level + 1))}
    </OrgChartNode>
  );

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
    <div className="w-full min-w-0">
      <div className="mb-4 flex flex-wrap justify-end gap-2 px-4 sm:mb-6 sm:px-0">
        <button onClick={expandAll} className="text-sm text-primary hover:underline">
          Expandir todo
        </button>
        <span className="text-muted-foreground">|</span>
        <button onClick={collapseAll} className="text-sm text-primary hover:underline">
          Contraer todo
        </button>
      </div>

      <div className="overflow-x-auto overscroll-x-contain pb-6 [scrollbar-width:none] sm:pb-8 [&::-webkit-scrollbar]:hidden">
        <div className="inline-flex min-w-max flex-col items-center px-4 sm:min-w-full sm:px-8">
          {positionTree.length === 1 ? (
            renderNode(positionTree[0], 0)
          ) : (
            <div className="flex gap-6 sm:gap-12">
              {positionTree.map(root => renderNode(root, 0))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
