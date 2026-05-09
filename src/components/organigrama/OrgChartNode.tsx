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
  highlighted?: boolean;
}

export function OrgChartNode({
  position,
  children,
  isExpanded,
  onToggle,
  hasChildren,
  level,
  highlighted = false,
}: OrgChartNodeProps) {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const mainEmployee = position.employees[0];

  return (
    <div className="flex flex-col items-center">
      {level > 0 && <div className="h-6 w-px bg-border/60" />}

      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          borderColor: highlighted ? 'hsl(var(--primary))' : 'hsl(var(--border))',
          boxShadow: highlighted ? '0 0 20px -5px hsl(var(--primary)/0.4)' : '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        }}
        className={cn(
          "relative min-w-[220px] max-w-[280px] rounded-xl border-2 bg-card p-4 transition-all",
          "hover:border-primary/40 hover:shadow-md cursor-pointer",
          level === 0 && !highlighted && "border-primary/20 bg-primary/5",
          highlighted && "border-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
        )}
        onClick={hasChildren ? onToggle : undefined}
      >
        {hasChildren && (
          <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 z-10">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-primary hover:border-primary transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </div>
        )}

        {/* Position name */}
        <div className="text-center mb-3">
          <div className="mb-1 flex min-w-0 items-start justify-center gap-1.5">
            <Briefcase className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", highlighted ? "text-primary" : "text-muted-foreground")} />
            <h3 className="break-words text-sm font-bold leading-tight text-foreground">{position.name}</h3>
          </div>
          {position.areaName && (
            <p className="mt-0.5 break-words text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/80">{position.areaName}</p>
          )}
        </div>

        {/* Employee info */}
        {mainEmployee ? (
          <div className="flex min-w-0 items-center gap-3 border-t border-border/50 pt-3">
            <Avatar className="h-10 w-10 shrink-0 border border-border/50">
              <AvatarImage src={mainEmployee.avatar_url} />
              <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                {getInitials(mainEmployee.first_name, mainEmployee.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {mainEmployee.first_name} {mainEmployee.last_name}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {position.employees.length} {position.employees.length === 1 ? 'Persona' : 'Personas'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 border-t border-border/50 pt-3 text-muted-foreground">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/50 border border-dashed border-border">
              <Users className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium italic">Cargo Vacante</span>
              <span className="text-[10px]">Sin personal asignado</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center"
          >
            <div className="h-8 w-px bg-border/60" />
            <div className="relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-border/60"
                style={{ width: 'calc(100% - 240px)' }} />
              <div className="flex gap-8 pt-0 sm:gap-16">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
