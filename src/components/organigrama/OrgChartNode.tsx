import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OrgChartNodeProps {
  area: {
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
  };
  children?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  hasChildren: boolean;
  level: number;
}

export function OrgChartNode({
  area,
  children,
  isExpanded,
  onToggle,
  hasChildren,
  level,
}: OrgChartNodeProps) {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="flex flex-col items-center">
      {/* Connector line from parent */}
      {level > 0 && (
        <div className="w-px h-6 bg-border" />
      )}
      
      {/* Node card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "relative bg-card border border-border rounded-lg shadow-sm p-4 min-w-[200px] max-w-[280px]",
          "hover:shadow-md transition-shadow cursor-pointer",
          level === 0 && "border-primary/50 bg-primary/5"
        )}
        onClick={hasChildren ? onToggle : undefined}
      >
        {/* Expand/collapse indicator */}
        {hasChildren && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-background border border-border rounded-full p-0.5 shadow-sm">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        )}

        {/* Area name */}
        <div className="text-center mb-3">
          <h3 className="font-semibold text-foreground text-sm">{area.name}</h3>
          {area.code && (
            <span className="text-xs text-muted-foreground">{area.code}</span>
          )}
        </div>

        {/* Manager info */}
        {area.manager ? (
          <div className="flex items-center gap-3 pt-3 border-t border-border">
            <Avatar className="h-10 w-10">
              <AvatarImage src={area.manager.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {getInitials(area.manager.first_name, area.manager.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {area.manager.first_name} {area.manager.last_name}
              </p>
              {area.manager.position_name && (
                <p className="text-xs text-muted-foreground truncate">
                  {area.manager.position_name}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-3 border-t border-border text-muted-foreground">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs italic">Sin responsable asignado</span>
          </div>
        )}

        {/* Employee count badge */}
        <div className="flex justify-center mt-3">
          <Badge variant="secondary" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            {area.employeeCount} empleados
          </Badge>
        </div>
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col items-center"
          >
            {/* Vertical connector to children */}
            <div className="w-px h-6 bg-border" />
            
            {/* Horizontal connector and children container */}
            <div className="relative">
              {/* Horizontal line spanning all children */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-border" 
                style={{ width: 'calc(100% - 100px)' }} />
              
              {/* Children nodes */}
              <div className="flex gap-8 pt-0">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
