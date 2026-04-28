import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface MobileCardField {
  label: string;
  value: ReactNode;
  className?: string;
}

interface MobileCardItem {
  id: string;
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  fields?: MobileCardField[];
  onClick?: () => void;
  actions?: ReactNode;
  itemClassName?: string;
}

interface MobileCardListProps {
  items: MobileCardItem[];
  emptyMessage?: string;
  className?: string;
}

export function MobileCardList({ items, emptyMessage = 'No hay registros', className }: MobileCardListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "card-elevated min-w-0 p-4 space-y-3 transition-all",
            item.onClick && "cursor-pointer hover:border-primary/30 active:scale-[0.99]",
            item.itemClassName
          )}
          onClick={item.onClick}
        >
          {/* Header: title + badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="break-words font-medium text-foreground">{item.title}</div>
              {item.subtitle && (
                <div className="mt-0.5 break-words text-sm text-muted-foreground">{item.subtitle}</div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {item.badge}
              {item.onClick && !item.actions && (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Fields */}
          {item.fields && item.fields.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {item.fields.map((field, idx) => (
                <div key={idx} className={cn("min-w-0 text-sm", field.className)}>
                  <span className="text-muted-foreground text-xs">{field.label}</span>
                  <div className="break-words font-medium text-foreground">{field.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {item.actions && (
            <div className="flex items-center justify-stretch gap-2 border-t border-border pt-2 [&>*]:flex-1 sm:justify-end sm:[&>*]:flex-none">
              {item.actions}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
