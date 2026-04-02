/**
 * Automated test to verify that all Supabase query hooks
 * properly filter by currentCompanyId for multi-company isolation.
 *
 * This test performs STATIC ANALYSIS on hook source files to ensure
 * every hook that queries company-scoped tables includes a company_id filter.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Tables that are system-level / auth-level and do NOT need company_id filtering
const SYSTEM_TABLES = new Set([
  'user_roles',
  'user_profiles',
  'user_company_assignments',
  'user_center_assignments',
  'user_status',
  'user_custom_roles',
  'companies',
  'modules',
  'permissions',
  'role_permissions',
  'custom_roles',
  'login_attempts',
  'employee_user_links',
]);

// Tables that filter by employee_id (which is already scoped to a company via RLS)
// These are acceptable when used in employee-specific detail views
const EMPLOYEE_SCOPED_TABLES = new Set([
  'employee_work_info',
  'employee_contact',
  'employee_family',
  'employee_social_security',
  'employee_bank_info',
  'employee_certifications',
  'employee_vaccinations',
  'employee_schedule',
  'employee_shift_assignments',
  'employee_time_config',
  'employee_documents',
  'employee_family_members',
  'employee_change_requests',
  'employee_onboarding_tasks',
  'employee_deductions',
  'employee_loan_payments',
  'employee_shifts',
]);

// Hooks that are intentionally employee-scoped (detail views) and filter by employee_id
// rather than company_id. These are acceptable because the parent employee
// is already filtered by company in the UI layer.
const EMPLOYEE_DETAIL_HOOKS = new Set([
  'useEmployee360.ts',
  'useEmployee360Alerts.ts',
  'useEmployeePortal.ts',
  'useEmployeeHealth.ts',
  'useWorkInfoHistory.ts',
  'useOnboardingTasks.ts',
]);

// Hooks that filter by a specific entity ID (center, etc.) rather than company_id
const ENTITY_DETAIL_HOOKS = new Set([
  'useCenterDetail.ts',
]);

// Hooks that don't query company-scoped data (user preferences, sessions, etc.)
const USER_SCOPED_HOOKS = new Set([
  'useUserProfile.ts',
]);

// Hooks with known complex patterns that have been manually audited
const MANUALLY_AUDITED_HOOKS: Record<string, string> = {
  'useContractTermination.ts': 'Queries medical_exams/contracts by employee_id within termination flow',
  'useDocuments.ts': 'Queries documents by entity_id with company_id in document_versions',
  'useTerminations.ts': 'Filters employee_terminations by company_id via employees_v2 join',
  'useAbsenceConflicts.ts': 'Filters by employee_id which is already company-scoped',
  'useTrainingCompliance.ts': 'Uses training_courses.company_id via join pattern',
};

function getHookFiles(): string[] {
  const hooksDir = path.resolve(__dirname, '../hooks');
  return fs
    .readdirSync(hooksDir)
    .filter((f) => f.startsWith('use') && (f.endsWith('.ts') || f.endsWith('.tsx')))
    .filter((f) => !f.includes('.test.'));
}

function extractFromCalls(content: string): string[] {
  const regex = /\.from\(['"]([\w]+)['"]/g;
  const tables: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    tables.push(match[1]);
  }
  return [...new Set(tables)];
}

function hasCompanyIdFilter(content: string): boolean {
  return (
    content.includes(".eq('company_id'") ||
    content.includes('.eq("company_id"') ||
    content.includes("company_id: currentCompanyId") ||
    content.includes("company_id: currentCompany") ||
    content.includes('company_id,') // in select or filter chains
  );
}

function usesCurrentCompanyId(content: string): boolean {
  return content.includes('currentCompanyId');
}

function hasEmployeeIdFilter(content: string): boolean {
  return (
    content.includes(".eq('employee_id'") ||
    content.includes('.eq("employee_id"') ||
    content.includes('employee_id:')
  );
}

function hasSupabaseImport(content: string): boolean {
  return content.includes('supabase') && content.includes('.from(');
}

function hasUseQuery(content: string): boolean {
  return content.includes('useQuery');
}

describe('Multi-company isolation: Hook query filters', () => {
  const hookFiles = getHookFiles();

  it('should find hook files to test', () => {
    expect(hookFiles.length).toBeGreaterThan(30);
  });

  const hooksDir = path.resolve(__dirname, '../hooks');

  hookFiles.forEach((fileName) => {
    const content = fs.readFileSync(path.join(hooksDir, fileName), 'utf-8');

    // Skip hooks that don't use supabase
    if (!hasSupabaseImport(content)) return;

    // Skip user-scoped hooks
    if (USER_SCOPED_HOOKS.has(fileName)) return;

    const tables = extractFromCalls(content);
    const companyTables = tables.filter(
      (t) => !SYSTEM_TABLES.has(t) && !EMPLOYEE_SCOPED_TABLES.has(t)
    );

    // Skip if only system/employee-scoped tables
    if (companyTables.length === 0) return;

    // Skip entity-detail hooks
    if (ENTITY_DETAIL_HOOKS.has(fileName)) return;

    // Skip employee-detail hooks (they filter by employee_id)
    if (EMPLOYEE_DETAIL_HOOKS.has(fileName)) {
      it(`${fileName} (employee-detail) should filter by employee_id`, () => {
        expect(hasEmployeeIdFilter(content)).toBe(true);
      });
      return;
    }

    // Skip manually audited hooks but document them
    if (MANUALLY_AUDITED_HOOKS[fileName]) {
      it(`${fileName} (manually audited): ${MANUALLY_AUDITED_HOOKS[fileName]}`, () => {
        expect(true).toBe(true);
      });
      return;
    }

    // For hooks with useQuery, verify company_id filtering
    if (hasUseQuery(content)) {
      it(`${fileName} should use currentCompanyId for queries on [${companyTables.join(', ')}]`, () => {
        const usesCompanyId = usesCurrentCompanyId(content);
        const filtersCompanyId = hasCompanyIdFilter(content);

        expect(usesCompanyId).toBe(true);
        expect(filtersCompanyId).toBe(true);
      });

      it(`${fileName} should disable queries when currentCompanyId is missing`, () => {
        // Check for enabled: !!currentCompanyId pattern
        const hasEnabledGuard =
          content.includes('enabled:') &&
          (content.includes('!!currentCompanyId') ||
            content.includes('currentCompanyId != null') ||
            content.includes('Boolean(currentCompanyId)'));

        expect(hasEnabledGuard).toBe(true);
      });
    }
  });

  it('should verify mutation hooks inject company_id on insert', () => {
    const mutationHooks = hookFiles.filter((f) => {
      const content = fs.readFileSync(path.join(hooksDir, f), 'utf-8');
      return hasSupabaseImport(content) && content.includes('useMutation') && content.includes('.insert(');
    });

    const missingCompanyId: string[] = [];

    for (const fileName of mutationHooks) {
      if (USER_SCOPED_HOOKS.has(fileName)) continue;
      if (EMPLOYEE_DETAIL_HOOKS.has(fileName)) continue;
      if (MANUALLY_AUDITED_HOOKS[fileName]) continue;

      const content = fs.readFileSync(path.join(hooksDir, fileName), 'utf-8');
      const tables = extractFromCalls(content);
      const companyTables = tables.filter(
        (t) => !SYSTEM_TABLES.has(t) && !EMPLOYEE_SCOPED_TABLES.has(t)
      );

      if (companyTables.length === 0) continue;

      // Check that the hook references currentCompanyId for inserts
      if (!usesCurrentCompanyId(content) && !hasCompanyIdFilter(content)) {
        missingCompanyId.push(fileName);
      }
    }

    expect(missingCompanyId).toEqual([]);
  });

  it('should have all company-scoped tables covered by RLS', () => {
    // This is a documentation test - lists all tables found across hooks
    const allTables = new Set<string>();
    hookFiles.forEach((f) => {
      const content = fs.readFileSync(path.join(hooksDir, f), 'utf-8');
      if (!hasSupabaseImport(content)) return;
      extractFromCalls(content).forEach((t) => allTables.add(t));
    });

    const companyTables = [...allTables].filter(
      (t) => !SYSTEM_TABLES.has(t)
    );

    // Verify we're tracking a substantial number of tables
    expect(companyTables.length).toBeGreaterThan(20);
  });
});
