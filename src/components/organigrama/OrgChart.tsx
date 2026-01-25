import { useState, useMemo } from 'react';
import { OrgChartNode } from './OrgChartNode';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2 } from 'lucide-react';

interface Area {
  id: string;
  name: string;
  code?: string | null;
  parent_id?: string | null;
  manager_id?: string | null;
  is_active?: boolean | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  work_info?: {
    position_name?: string;
    area_id?: string;
  } | null;
}

interface OrgChartProps {
  areas: Area[];
  employees: Employee[];
  isLoading?: boolean;
}

interface AreaNode {
  id: string;
  name: string;
  code?: string;
  manager?: {
    id: string;
    first_name: string;
    last_name: string;
    position_name?: string;
    avatar_url?: string;
  } | null;
  employeeCount: number;
  children: AreaNode[];
}

export function OrgChart({ areas, employees, isLoading }: OrgChartProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Build tree structure from flat areas list
  const areaTree = useMemo(() => {
    const activeAreas = areas.filter(a => a.is_active !== false);
    
    // Create a map for quick lookup
    const areaMap = new Map<string, AreaNode>();
    
    // Initialize all areas
    activeAreas.forEach(area => {
      // Find manager from employees
      const manager = area.manager_id 
        ? employees.find(e => e.id === area.manager_id)
        : null;
      
      // Count employees in this area
      const employeeCount = employees.filter(
        e => e.work_info?.area_id === area.id
      ).length;

      areaMap.set(area.id, {
        id: area.id,
        name: area.name,
        code: area.code || undefined,
        manager: manager ? {
          id: manager.id,
          first_name: manager.first_name,
          last_name: manager.last_name,
          position_name: manager.work_info?.position_name,
          avatar_url: manager.avatar_url || undefined,
        } : null,
        employeeCount,
        children: [],
      });
    });

    // Build parent-child relationships
    const roots: AreaNode[] = [];
    
    activeAreas.forEach(area => {
      const node = areaMap.get(area.id);
      if (!node) return;

      if (area.parent_id && areaMap.has(area.parent_id)) {
        const parent = areaMap.get(area.parent_id);
        parent?.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Sort children alphabetically
    const sortChildren = (nodes: AreaNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach(node => sortChildren(node.children));
    };
    sortChildren(roots);

    return roots;
  }, [areas, employees]);

  // Initialize expanded state for root nodes
  useMemo(() => {
    if (areaTree.length > 0 && expandedNodes.size === 0) {
      const initialExpanded = new Set<string>();
      areaTree.forEach(root => initialExpanded.add(root.id));
      setExpandedNodes(initialExpanded);
    }
  }, [areaTree]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (nodes: AreaNode[]) => {
      nodes.forEach(node => {
        allIds.add(node.id);
        collectIds(node.children);
      });
    };
    collectIds(areaTree);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const renderNode = (node: AreaNode, level: number): React.ReactNode => {
    return (
      <OrgChartNode
        key={node.id}
        area={node}
        isExpanded={expandedNodes.has(node.id)}
        onToggle={() => toggleNode(node.id)}
        hasChildren={node.children.length > 0}
        level={level}
      >
        {node.children.map(child => renderNode(child, level + 1))}
      </OrgChartNode>
    );
  };

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

  if (areaTree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Building2 className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">No hay áreas configuradas</p>
        <p className="text-sm">
          Configura las áreas en el módulo de Configuración para ver el organigrama
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="flex justify-end gap-2 mb-6">
        <button
          onClick={expandAll}
          className="text-sm text-primary hover:underline"
        >
          Expandir todo
        </button>
        <span className="text-muted-foreground">|</span>
        <button
          onClick={collapseAll}
          className="text-sm text-primary hover:underline"
        >
          Contraer todo
        </button>
      </div>

      {/* Chart container with horizontal scroll */}
      <div className="overflow-x-auto pb-8">
        <div className="inline-flex flex-col items-center min-w-full px-8">
          {/* If multiple root nodes, show them horizontally */}
          {areaTree.length === 1 ? (
            renderNode(areaTree[0], 0)
          ) : (
            <div className="flex gap-12">
              {areaTree.map(root => renderNode(root, 0))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
