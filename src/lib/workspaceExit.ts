/** A cancelable UI event keeps authentication independent from the workspace tree. */
export function confirmWorkspaceExit(reason: string) {
  return window.dispatchEvent(new CustomEvent('empatiq:workspace-exit', { cancelable: true, detail: { reason } }));
}
