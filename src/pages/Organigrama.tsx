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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Organigrama</h1>
        <p className="text-muted-foreground">
          Visualización de la estructura organizacional por cargos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Total Cargos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{activePositions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Con Cargo Superior
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{positionsWithParent}</div>
            <p className="text-xs text-muted-foreground">
              de {activePositions.length} cargos activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Cargos Raíz
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{rootPositions}</div>
            <p className="text-xs text-muted-foreground">
              sin cargo superior asignado
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estructura Organizacional</CardTitle>
          <CardDescription>
            Haz clic en un cargo para expandir o contraer sus cargos subordinados
          </CardDescription>
        </CardHeader>
        <CardContent>
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
