import { Bell, Search, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function Header() {
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar empleados, contratos, vacantes..."
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Company selector */}
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <Select defaultValue="acme">
            <SelectTrigger className="w-[200px] h-9 text-sm border-0 bg-muted/50 hover:bg-muted focus:ring-1 focus:ring-primary/20">
              <SelectValue placeholder="Seleccionar empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="acme">ACME Corporation</SelectItem>
              <SelectItem value="tech">TechCorp S.A.S</SelectItem>
              <SelectItem value="global">Global Services</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-muted"
        >
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-semibold rounded-full flex items-center justify-center">
            5
          </span>
        </Button>
      </div>
    </header>
  );
}