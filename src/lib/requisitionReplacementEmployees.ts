interface ReplacementEmployeeCandidate {
  first_name: string;
  last_name: string;
  is_active: boolean;
}

export function buildReplacementEmployeeOptions(employees: ReplacementEmployeeCandidate[]) {
  return employees.map((employee) => {
      const fullName = `${employee.first_name} ${employee.last_name}`;
      return {
        label: fullName,
        value: fullName,
        ...(!employee.is_active && {
          badge: {
            label: 'Inactivo',
            className: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-50 dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-300',
          },
        }),
      };
    });
}
