import { useMemo } from 'react';
import { AlertTriangle, UserX, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useEmployees } from '@/hooks/useEmployees';
import { useEmployeeTimeConfigs } from '@/hooks/useSchedules';
import { getEmployeeFullName } from '@/types/employee';

interface MissingConfigAlertProps {
  onAssignClick?: () => void;
}

export function MissingConfigAlert({ onAssignClick }: MissingConfigAlertProps) {
  const { data: employees = [] } = useEmployees();
  const { data: timeConfigs = [] } = useEmployeeTimeConfigs();

  const employeesWithoutConfig = useMemo(() => {
    const configuredIds = new Set(
      timeConfigs
        .filter(tc => tc.is_active)
        .map(tc => tc.employee_id)
    );
    return employees.filter(e => e.is_active && !configuredIds.has(e.id));
  }, [employees, timeConfigs]);

  if (employeesWithoutConfig.length === 0) {
    return null;
  }

  return (
    <div className="border border-warning/30 bg-warning/10 rounded-md px-3 py-2">
      <Collapsible>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
            <span className="text-warning-foreground text-sm">
              <strong>{employeesWithoutConfig.length}</strong> empleado(s) activo(s) no tienen modalidad de tiempo asignada.
            </span>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-warning-foreground hover:bg-warning/20 h-7 px-2">
              Ver lista
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-2">
          <div className="flex flex-wrap gap-2 mb-3">
            {employeesWithoutConfig.slice(0, 10).map((emp) => (
              <Link key={emp.id} to={`/empleados/${emp.id}/360`}>
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-warning/20 border-warning/50 text-warning-foreground"
                >
                  <UserX className="w-3 h-3 mr-1" />
                  {getEmployeeFullName(emp)}
                </Badge>
              </Link>
            ))}
            {employeesWithoutConfig.length > 10 && (
              <Badge variant="secondary">
                +{employeesWithoutConfig.length - 10} más
              </Badge>
            )}
          </div>
          {onAssignClick && (
            <Button size="sm" variant="outline" onClick={onAssignClick} className="border-warning/50 text-warning-foreground hover:bg-warning/20">
              Asignar modalidad
            </Button>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
