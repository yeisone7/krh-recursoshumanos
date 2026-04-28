import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OrgChart } from '@/components/organigrama';
import { useAreas, usePositions } from '@/hooks/useSystemConfig';
import { useEmployees } from '@/hooks/useEmployees';
import { Briefcase, Users, GitBranch } from 'lucide-react';

export default function Organigrama() {
  const { data: areas = [], isLoading: loadingAreas } = useAreas();
  const { data: positions = [], isLoading: loadingPositions } = usePositions();
  const { data: employees = [], isLoading: loadingEmployees } = useEmployees();

  const isLoading = loadingAreas || loadingPositions || loadingEmployees;

  const activePositions = positions.filter(p => p.is_active !== false);
  const positionsWithParent = activePositions.filter(p => p.parent_position_id).length;
  const rootPositions = activePositions.filter(p => !p.parent_position_id).length;

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
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Organigrama</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Visualización de la estructura organizacional por cargos
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
            <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
              <Briefcase className="w-4 h-4" />
              Total Cargos
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="text-2xl font-bold text-primary sm:text-3xl">{activePositions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
            <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
              <GitBranch className="w-4 h-4" />
              Con Cargo Superior
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="text-2xl font-bold text-success sm:text-3xl">{positionsWithParent}</div>
            <p className="text-xs text-muted-foreground">
              de {activePositions.length} cargos activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
            <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
              <Users className="w-4 h-4" />
              Cargos Raíz
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="text-2xl font-bold text-warning sm:text-3xl">{rootPositions}</div>
            <p className="text-xs text-muted-foreground">
              sin cargo superior asignado
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
          <CardTitle className="text-base sm:text-lg">Estructura Organizacional</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Haz clic en un cargo para expandir o contraer sus cargos subordinados
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-4 sm:px-6 sm:pb-6">
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
