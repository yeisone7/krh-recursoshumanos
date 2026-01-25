import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OrgChart } from '@/components/organigrama';
import { useAreas } from '@/hooks/useSystemConfig';
import { useEmployees } from '@/hooks/useEmployees';
import { Building2, Users, GitBranch } from 'lucide-react';

export default function Organigrama() {
  const { data: areas = [], isLoading: loadingAreas } = useAreas();
  const { data: employees = [], isLoading: loadingEmployees } = useEmployees();

  const isLoading = loadingAreas || loadingEmployees;

  // Stats
  const activeAreas = areas.filter(a => a.is_active !== false);
  const areasWithManager = activeAreas.filter(a => a.manager_id).length;
  const rootAreas = activeAreas.filter(a => !a.parent_id).length;

  // Transform employees data for org chart
  const employeesForChart = employees.map(emp => ({
    id: emp.id,
    first_name: emp.first_name,
    last_name: emp.last_name,
    avatar_url: emp.avatar_url,
    work_info: emp.work_info ? {
      position_name: emp.work_info.position_name,
      area_id: emp.work_info.area_id,
    } : null,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Organigrama</h1>
        <p className="text-muted-foreground">
          Visualización de la estructura organizacional de la empresa
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Total Áreas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{activeAreas.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Áreas con Responsable
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{areasWithManager}</div>
            <p className="text-xs text-muted-foreground">
              de {activeAreas.length} áreas activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Áreas Raíz
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{rootAreas}</div>
            <p className="text-xs text-muted-foreground">
              departamentos principales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Org Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Estructura Organizacional</CardTitle>
          <CardDescription>
            Haz clic en un área para expandir o contraer sus subdepartamentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgChart
            areas={areas}
            employees={employeesForChart}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
