interface ReplacementEmployeeCandidate {
  first_name: string;
  last_name: string;
  is_active: boolean;
}

export function buildReplacementEmployeeOptions(employees: ReplacementEmployeeCandidate[]) {
  return employees.map((employee) => {
      const fullName = `${employee.first_name} ${employee.last_name}`;
      return {
        label: employee.is_active ? fullName : `${fullName} (Inactivo)`,
        value: fullName,
      };
    });
}
