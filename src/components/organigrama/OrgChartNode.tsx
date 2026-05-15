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
      {level > 0 && <div className="h-8 w-px bg-gradient-to-b from-primary/40 to-primary/10" />}

      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          borderColor: highlighted ? 'hsl(var(--primary))' : 'hsl(var(--border)/0.5)',
          boxShadow: highlighted ? '0 10px 40px -10px hsl(var(--primary)/0.3)' : '0 10px 30px rgba(0,0,0,0.02)',
        }}
        whileHover={{ y: -4, scale: 1.02 }}
        className={cn(
          "relative min-w-[240px] max-w-[300px] rounded-[2rem] border-2 bg-background p-6 transition-all duration-300",
          "hover:border-primary/30 cursor-pointer overflow-hidden group",
          level === 0 && !highlighted && "border-primary/20 shadow-primary/5 bg-primary/[0.02]",
          highlighted && "border-primary ring-4 ring-primary/10"
        )}
        onClick={hasChildren ? onToggle : undefined}
      >
        {/* Level accent line */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r transition-all duration-500",
          level === 0 ? "from-primary via-primary/80 to-primary/60" : "from-border/40 to-border/20",
          highlighted && "from-primary to-primary/40"
        )} />

        {hasChildren && (
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-2xl border-2 bg-background text-muted-foreground shadow-lg hover:text-primary hover:border-primary hover:scale-110 active:scale-95 transition-all duration-300"
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
        <div className="text-left mb-5 relative z-10">
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-500 group-hover:rotate-6 shadow-inner",
              highlighted || level === 0 ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground"
            )}>
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="break-words text-sm font-black leading-tight text-foreground uppercase tracking-wide group-hover:text-primary transition-colors">
                {position.name}
              </h3>
              {position.areaName && (
                <p className="mt-1 break-words text-[10px] uppercase tracking-[0.15em] font-black text-muted-foreground/60">{position.areaName}</p>
              )}
            </div>
          </div>
        </div>

        {/* Employee info */}
        {mainEmployee ? (
          <div className="flex min-w-0 items-center gap-4 border-t border-border/40 pt-4 relative z-10">
            <div className="relative">
              <Avatar className="h-12 w-12 shrink-0 border-2 border-background shadow-md">
                <AvatarImage src={mainEmployee.avatar_url} className="object-cover" />
                <AvatarFallback className="text-primary text-xs font-black uppercase tracking-tighter">
                  {getInitials(mainEmployee.first_name, mainEmployee.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background border-2 border-background shadow-sm flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-foreground truncate uppercase tracking-tight">
                {mainEmployee.first_name} {mainEmployee.last_name}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex items-center justify-center h-4 w-4 rounded-full bg-background text-muted-foreground">
                  <Users className="h-2.5 w-2.5" />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {position.employees.length} {position.employees.length === 1 ? 'Persona' : 'Personas'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 border-t border-border/40 pt-4 text-muted-foreground relative z-10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-background border-2 border-dashed border-border/40 transition-colors group-hover:border-primary/20">
              <Users className="h-5 w-5 opacity-40 group-hover:text-primary transition-colors" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Cargo Vacante</span>
              <span className="text-[9px] font-bold uppercase tracking-tighter opacity-60">Asignación pendiente</span>
            </div>
          </div>
        )}

        {/* Decorative background element */}
        <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none transform rotate-12 scale-150">
          <Briefcase className="h-24 w-24" />
        </div>
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex flex-col items-center w-full"
          >
            <div className="h-12 w-px bg-gradient-to-b from-primary/20 to-primary/5" />
            <div className="relative w-full">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent w-full" />
              <div className="flex gap-12 pt-0 sm:gap-24 justify-center">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
