import { createContext, useContext, useEffect, useId, useState, useCallback, type SyntheticEvent } from 'react';

export interface WorkspacePaneValue {
  id: string;
  active: boolean;
  desktop: boolean;
  registerDirty: (source: string, dirty: boolean) => void;
  registerResume: (source: string, resume: (() => void) | null) => void;
}
export const WorkspacePaneContext = createContext<WorkspacePaneValue | null>(null);
export const WorkspaceVisibilityContext = createContext(true);
export const useWorkspacePane = () => useContext(WorkspacePaneContext);
export function useWorkspaceActive() {
  const pane = useWorkspacePane();
  const visible = useContext(WorkspaceVisibilityContext);
  return (pane?.active ?? true) && visible;
}

/** Register a controlled editor's pending changes. No effect outside the workspace. */
export function useWorkspaceDirty(dirty: boolean) {
  const register = useWorkspacePane()?.registerDirty;
  const id = useId();
  useEffect(() => { register?.(id, dirty); }, [register, id, dirty]);
  useEffect(() => () => register?.(id, false), [register, id]);
}

/** For editors backed by local state instead of react-hook-form. */
export function useWorkspaceEditor() {
  const [dirty, setDirty] = useState(false);
  useWorkspaceDirty(dirty);
  const markChanged = useCallback(() => setDirty(true), []);
  const markSaved = useCallback(() => setDirty(false), []);
  const onChangeCapture = (event: SyntheticEvent) => {
    if (!(event.target as HTMLElement).closest('[data-workspace-form]')) markChanged();
  };
  const onClickCapture = (event: SyntheticEvent) => {
    if ((event.target as HTMLElement).closest('[role="option"], [role="checkbox"], [role="switch"], [role="radio"]')) markChanged();
  };
  return { dirty, markChanged, markSaved, captureProps: { onChangeCapture, onClickCapture } };
}
