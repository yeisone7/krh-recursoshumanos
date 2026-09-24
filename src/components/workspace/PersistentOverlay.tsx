import { createContext, useCallback, useContext, useEffect, useId, useState, type ComponentType, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PanelsTopLeft } from 'lucide-react';
import { useWorkspaceActive, useWorkspaceDirty, useWorkspacePane, WorkspaceVisibilityContext } from './WorkspacePaneContext';

interface OpenProps { open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; children?: ReactNode }
interface OverlayState { open: boolean; visible: boolean; suspend: () => void }
const OverlayContext = createContext<OverlayState | null>(null);
type OutsideInteraction = Event & { detail: { originalEvent: Event } };
type GuardOutsideInteraction = <E extends OutsideInteraction>(handler?: (event: E) => void) => (event: E) => void;

/** Keep the logical open state separate from Radix's focus/scroll-lock lifecycle. */
export function createPersistentOverlayRoot<P extends OpenProps>(Root: ComponentType<P>) {
  function PersistentRoot(props: P) {
    const pane = useWorkspacePane();
    const parentOverlay = useContext(OverlayContext);
    const active = useWorkspaceActive();
    const [localOpen, setLocalOpen] = useState(props.defaultOpen ?? false);
    const [suspended, setSuspended] = useState(false);
    const id = useId();
    const open = props.open ?? localOpen;
    const visible = active && !suspended;
    const resume = useCallback(() => setSuspended(false), []);
    const register = pane?.registerResume;
    useEffect(() => { if (active || !open) setSuspended(false); }, [active, open, pane?.desktop]);
    useEffect(() => {
      register?.(id, open && suspended ? resume : null);
      return () => register?.(id, null);
    }, [register, id, open, suspended, resume]);
    const change = (next: boolean) => {
      if (!active || suspended) return;
      setLocalOpen(next); props.onOpenChange?.(next);
    };
    return <OverlayContext.Provider value={pane ? { open, visible, suspend: () => { setSuspended(true); parentOverlay?.suspend(); } } : null}>
      <Root {...props} open={pane ? open && visible : props.open} onOpenChange={pane ? change : props.onOpenChange} />
    </OverlayContext.Provider>;
  }
  PersistentRoot.displayName = 'PersistentOverlayRoot';
  return PersistentRoot;
}

/**
 * Children always use the same portal/DOM host while logically open. Only the
 * Radix shell unmounts when suspended, releasing modal focus and body locks.
 * This preserves RHF state, uncontrolled inputs and file selections as well.
 */
export function PersistentOverlay({ children, renderShell }: { children: ReactNode; renderShell: (body: ReactNode, guardOutsideInteraction: GuardOutsideInteraction) => ReactNode }) {
  const pane = useWorkspacePane();
  const overlay = useContext(OverlayContext);
  const [host] = useState(() => { const node = document.createElement('div'); node.style.display = 'contents'; return node; });
  const [dirty, setDirty] = useState(false);
  const [internalEvents] = useState(() => new WeakSet<Event>());
  // The stable body is a sibling of the Radix shell in React's tree. Nested
  // portals (calendars/selects) therefore bypass the shell's capture handlers.
  // Track the original event through our React subtree, including those portals,
  // without blocking real outside interactions or another dialog's events.
  const guardOutsideInteraction: GuardOutsideInteraction = handler => event => {
    if (internalEvents.has(event.detail.originalEvent)) event.preventDefault();
    else handler?.(event);
  };
  const mount = useCallback((node: HTMLDivElement | null) => { if (node) node.appendChild(host); }, [host]);
  useWorkspaceDirty(!!overlay?.open && dirty);
  useEffect(() => { if (!overlay?.open) setDirty(false); }, [overlay?.open]);
  if (!pane || !overlay) return <>{renderShell(children, guardOutsideInteraction)}</>;
  if (!overlay.open) return null;
  return <>
    {createPortal(<WorkspaceVisibilityContext.Provider value={overlay.visible}>
      <div style={{ display: 'contents' }}
      onPointerDownCapture={event => internalEvents.add(event.nativeEvent)}
      onFocusCapture={event => internalEvents.add(event.nativeEvent)}
      onChangeCapture={event => {
        // RHF forms register their exact dirty state; protect state-based dialogs too.
        if (!(event.target as HTMLElement).closest('[data-workspace-form]')) setDirty(true);
      }} onClickCapture={event => {
        if (!host.querySelector('[data-workspace-form]') && (event.target as HTMLElement).closest('[role="option"], [role="checkbox"], [role="switch"], [role="radio"]')) setDirty(true);
      }}>
        {pane.desktop && <button type="button" className="mb-1 flex w-fit items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => {
          overlay.suspend();
          requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[data-workspace-tabs] [aria-selected="true"]')?.focus());
        }}><PanelsTopLeft className="h-3.5 w-3.5" />Volver a pestañas</button>}
        {children}
      </div>
    </WorkspaceVisibilityContext.Provider>, host)}
    {overlay.visible && renderShell(<div ref={mount} style={{ display: 'contents' }} />, guardOutsideInteraction)}
  </>;
}

/** Transient menus may close when their owning pane or dialog is suspended. */
export function createWorkspaceTransientRoot<P extends OpenProps>(Root: ComponentType<P>) {
  function TransientRoot(props: P) {
    const active = useWorkspaceActive();
    const [open, setOpen] = useState(props.defaultOpen ?? false);
    return <Root {...props} open={active && (props.open ?? open)} onOpenChange={value => {
      if (!active) return;
      setOpen(value); props.onOpenChange?.(value);
    }} />;
  }
  TransientRoot.displayName = 'WorkspaceTransientRoot';
  return TransientRoot;
}
