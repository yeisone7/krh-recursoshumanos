import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronDown, ChevronRight, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OrgChartNodeProps {
  position: {
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
  };
  children?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  hasChildren: boolean;
  level: number;
}

export function OrgChartNode({
  position,
  children,
  isExpanded,
  onToggle,
  hasChildren,
  level,
}: OrgChartNodeProps) {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const mainEmployee = position.employees[0];

  return (
    <div className="flex flex-col items-center">
      {level > 0 && <div className="w-px h-6 bg-border" />}

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "relative bg-card border border-border rounded-lg shadow-sm p-4 min-w-[220px] max-w-[280px]",
          "hover:shadow-md transition-shadow cursor-pointer",
          level === 0 && "border-primary/50 bg-primary/5"
        )}
        onClick={hasChildren ? onToggle : undefined}
      >
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

        {/* Position name */}
        <div className="text-center mb-2">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Briefcase className="w-3.5 h-3.5 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">{position.name}</h3>
          </div>
          {position.code && (
            <span className="text-xs text-muted-foreground">{position.code}</span>
          )}
          {position.areaName && (
            <p className="text-xs text-muted-foreground mt-0.5">{position.areaName}</p>
          )}
        </div>

        {/* Employee info */}
        {mainEmployee ? (
          <div className="flex items-center gap-3 pt-3 border-t border-border">
            <Avatar className="h-10 w-10">
              <AvatarImage src={mainEmployee.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {getInitials(mainEmployee.first_name, mainEmployee.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {mainEmployee.first_name} {mainEmployee.last_name}
              </p>
              {position.employees.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  +{position.employees.length - 1} más
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-3 border-t border-border text-muted-foreground">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs italic">Vacante</span>
          </div>
        )}

        {/* Employee count badge */}
        <div className="flex justify-center mt-3">
          <Badge variant="secondary" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            {position.employees.length} {position.employees.length === 1 ? 'persona' : 'personas'}
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
            <div className="w-px h-6 bg-border" />
            <div className="relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-border"
                style={{ width: 'calc(100% - 100px)' }} />
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
