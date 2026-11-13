import { useId, type ReactNode } from 'react';
import { BriefcaseBusiness, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { ChartEmployee, PositionNode } from './orgChartTree';

export function OrgPerson({ person }: { person: ChartEmployee }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar className="size-6 shrink-0">
        <AvatarImage src={person.avatar_url || undefined} className="object-cover" />
        <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
          {person.first_name.charAt(0)}{person.last_name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 break-words">{person.first_name} {person.last_name}</span>
    </span>
  );
}

interface OrgChartNodeProps {
  position: PositionNode;
  children?: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  root: boolean;
  matched: boolean;
  current: boolean;
}

export function OrgChartNode({ position, children, expanded, onToggle, onSelect, root, matched, current }: OrgChartNodeProps) {
  const groupId = useId();
  const person = position.employees[0];
  return (
    <li className="org-branch">
      <div className={cn(
        'relative z-10 w-[13.25rem] rounded-xl border border-border/90 bg-card shadow-[0_4px_14px_rgba(24,24,27,0.08)]',
        root && 'border-neutral-500 bg-neutral-600 text-white',
        matched && 'ring-2 ring-primary/60',
        current && 'ring-[3px] ring-primary',
      )} data-org-map-node={position.id}>
        <button type="button" onClick={onSelect} aria-label={`Ver cargo ${position.name}`}
          className="block w-full rounded-xl px-3 pb-4 pt-3 text-left transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <span className="flex items-start gap-2.5">
            <span className={cn('grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary', root && 'bg-white/10 text-neutral-100')}>
              <BriefcaseBusiness className="size-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block break-words text-sm font-semibold leading-tight">{position.name}</span>
              <span className={cn('mt-0.5 block break-words text-[11px]', root ? 'text-neutral-200' : 'text-muted-foreground')}>{position.areaName || 'Sin área'}</span>
            </span>
          </span>
          <span className={cn('mt-2.5 flex min-h-8 items-center justify-between gap-2 border-t pt-2 text-xs', root ? 'border-white/20 text-neutral-100' : 'text-muted-foreground')}>
            {person ? <OrgPerson person={person} /> : (
              <span className="flex items-center gap-2"><Users className="size-3.5" aria-hidden="true" />Sin asignación</span>
            )}
            {position.employees.length > 1 && <span className="shrink-0 font-semibold">+{position.employees.length - 1}</span>}
          </span>
        </button>
        {position.children.length > 0 && (
          <button type="button" aria-expanded={expanded} aria-controls={expanded ? groupId : undefined}
            aria-label={`${expanded ? 'Contraer' : 'Expandir'} subordinados de ${position.name}`}
            onClick={onToggle}
            className="absolute -bottom-3 left-1/2 flex h-6 -translate-x-1/2 items-center gap-1 rounded-md border border-neutral-400 bg-neutral-600 px-2 text-xs font-medium text-white shadow-sm hover:bg-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            {position.children.length}
          </button>
        )}
      </div>
      {expanded && position.children.length > 0 && <ul id={groupId} className="org-children">{children}</ul>}
    </li>
  );
}
