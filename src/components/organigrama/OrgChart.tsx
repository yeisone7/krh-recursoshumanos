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
      <div className="flex flex-col items-center gap-6 p-8">
        <Skeleton className="h-32 w-64" />
        <div className="flex gap-8">
          <Skeleton className="h-32 w-48" />
          <Skeleton className="h-32 w-48" />
          <Skeleton className="h-32 w-48" />
        </div>
      </div>
    );
  }

  if (positionTree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Briefcase className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">No hay cargos configurados</p>
        <p className="text-sm">
          Configura los cargos y asigna cargos superiores en Configuración para ver el organigrama
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-end gap-2 mb-6">
        <button onClick={expandAll} className="text-sm text-primary hover:underline">
          Expandir todo
        </button>
        <span className="text-muted-foreground">|</span>
        <button onClick={collapseAll} className="text-sm text-primary hover:underline">
          Contraer todo
        </button>
      </div>

      <div className="overflow-x-auto pb-8">
        <div className="inline-flex flex-col items-center min-w-full px-8">
          {positionTree.length === 1 ? (
            renderNode(positionTree[0], 0)
          ) : (
            <div className="flex gap-12">
              {positionTree.map(root => renderNode(root, 0))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
