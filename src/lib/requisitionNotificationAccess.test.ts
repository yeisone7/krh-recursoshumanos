import { expect, it } from 'vitest';
import { canReceiveRequisitionNotification, escapeRequisitionEmailText } from '../../supabase/functions/_shared/requisitionNotificationAccess';

const currentApprover = { privileged: false, hasCompanyCenterAssignments: false, assignedToRequisitionCenter: false, confidential: true, requester: false, currentApprover: true };
it('notifies an assigned approver with company-wide center scope', () => {
  expect(canReceiveRequisitionNotification(currentApprover)).toBe(true);
});
it('respects explicit center scope even for an approver', () => {
  expect(canReceiveRequisitionNotification({ ...currentApprover, hasCompanyCenterAssignments: true })).toBe(false);
  expect(canReceiveRequisitionNotification({ ...currentApprover, hasCompanyCenterAssignments: true, assignedToRequisitionCenter: true })).toBe(true);
});
it('does not disclose confidential requests to unrelated recipients', () => {
  expect(canReceiveRequisitionNotification({ ...currentApprover, currentApprover: false })).toBe(false);
  expect(canReceiveRequisitionNotification({ ...currentApprover, currentApprover: false, privileged: true })).toBe(true);
});
it('renders stage names as email text rather than markup', () => {
  expect(escapeRequisitionEmailText('Finanzas <Dirección> & "Control"')).toBe('Finanzas &lt;Dirección&gt; &amp; &quot;Control&quot;');
});
