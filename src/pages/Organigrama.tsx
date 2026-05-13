import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OrgChart } from '@/components/organigrama';
import { useAreas, usePositions } from '@/hooks/useSystemConfig';
import { useEmployees } from '@/hooks/useEmployees';
import { Briefcase } from 'lucide-react';

export default function Organigrama() {
  const { data: areas = [], isLoading: loadingAreas } = useAreas();
  const { data: positions = [], isLoading: loadingPositions } = usePositions();
  const { data: employees = [], isLoading: loadingEmployees } = useEmployees();

  const isLoading = loadingAreas || loadingPositions || loadingEmployees;

  const employeesForChart = employees.map(emp => ({
    id: emp.id,
    first_name: emp.first_name,
    last_name: emp.last_name,
    avatar_url: emp.avatar_url,
    work_info: emp.work_info ? {
      position_id: emp.work_info.position_id,
    } : null,
  }));

  const areasForChart = areas.map(a => ({ id: a.id, name: a.name }));

  return (
    <div className="flex h-full min-h-0 flex-col space-y-6 sm:space-y-8">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent p-8 sm:p-10 border border-primary/10 shadow-sm">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary shadow-lg shadow-primary/20">
            <Briefcase className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl text-foreground uppercase">
              Estructura <span className="text-primary">Organizacional</span>
            </h1>
            <p className="mt-2 text-sm font-medium text-muted-foreground sm:text-lg max-w-2xl leading-relaxed">
              Visualiza la jerarquía y distribución de cargos de tu empresa. Navega de forma interactiva a través de las diferentes áreas y niveles.
            </p>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-primary/5 rounded-full blur-2xl" />
      </div>

      <Card className="flex-1 min-h-0 rounded-[2.5rem] border-border/50 shadow-[0_20px_50px_rgba(0,0,0,0.02)] overflow-hidden">
        <CardHeader className="px-8 pt-8 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black uppercase tracking-widest text-foreground/80">Organigrama Dinámico</CardTitle>
              <CardDescription className="text-sm font-medium">
                Interactúa con los nodos para explorar la estructura subordinada
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <OrgChart
            positions={positions}
            areas={areasForChart}
            employees={employeesForChart}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
