export function canReceiveRequisitionNotification(access: {
  privileged: boolean;
  hasCompanyCenterAssignments: boolean;
  assignedToRequisitionCenter: boolean;
  confidential: boolean;
  requester: boolean;
  currentApprover: boolean;
}): boolean {
  if (!access.privileged && access.hasCompanyCenterAssignments && !access.assignedToRequisitionCenter) return false;
  return !access.confidential || access.privileged || access.requester || access.currentApprover;
}

export function escapeRequisitionEmailText(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
