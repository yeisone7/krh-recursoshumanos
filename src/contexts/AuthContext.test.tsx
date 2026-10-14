import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(), from: vi.fn(), getSession: vi.fn(), signIn: vi.fn(), signOut: vi.fn(),
  callback: null as null | ((event: string, session: unknown) => void),
  logSession: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  rpc: mocks.rpc, from: mocks.from,
  auth: {
    getSession: mocks.getSession, signInWithPassword: mocks.signIn, signOut: mocks.signOut,
    onAuthStateChange: (callback: typeof mocks.callback) => {
      mocks.callback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    },
  },
} }));
vi.mock('@/lib/sessionLogger', () => ({ logSession: mocks.logSession }));
vi.mock('@/lib/workspaceExit', () => ({ confirmWorkspaceExit: () => false }));

const session = { user: { id: 'test-user', email: 'prueba@correo.com' } };
let auth: ReturnType<typeof useAuth>;
function Probe() {
  auth = useAuth();
  return <div>{auth.isLoading ? 'loading' : auth.user ? 'authorized' : 'signed-out'}</div>;
}
const mount = () => render(<AuthProvider><Probe /></AuthProvider>);

describe('suspended account access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.callback = null;
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.signIn.mockResolvedValue({ data: session, error: null });
    mocks.rpc.mockImplementation(async (name: string) => ({ data: name === 'is_user_active' ? true : [], error: null }));
    mocks.from.mockImplementation(() => {
      const query = { data: [], error: null, select: vi.fn(), eq: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn(), insert: vi.fn() };
      for (const method of ['select', 'eq', 'limit', 'maybeSingle', 'insert'] as const) query[method].mockReturnValue(query);
      return query;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('rejects a suspended restored session before exposing the user', async () => {
    mocks.getSession.mockResolvedValue({ data: { session } });
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    mount();
    await waitFor(() => expect(screen.getByText('signed-out')).toBeInTheDocument());
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(auth.roles).toEqual([]);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('keeps protected access closed until the status query completes', async () => {
    mocks.getSession.mockResolvedValue({ data: { session } });
    let finish: (value: unknown) => void;
    mocks.rpc.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    mount();
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalled());
    expect(auth.user).toBeNull();
    expect(auth.isLoading).toBe(true);
    await act(async () => { finish({ data: false, error: null }); });
    await waitFor(() => expect(auth.isLoading).toBe(false));
    expect(auth.user).toBeNull();
  });

  it('allows an active restored session', async () => {
    mocks.getSession.mockResolvedValue({ data: { session } });
    mount();
    await waitFor(() => expect(screen.getByText('authorized')).toBeInTheDocument());
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('rejects a suspended sign-in auth event', async () => {
    mount();
    await waitFor(() => expect(auth.isLoading).toBe(false));
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    act(() => mocks.callback('SIGNED_IN', session));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalled());
    expect(auth.user).toBeNull();
    expect(auth.session).toBeNull();
  });

  it('discards a queued sign-in if a logout event arrives first', async () => {
    mount();
    await waitFor(() => expect(auth.isLoading).toBe(false));
    await act(async () => {
      mocks.callback('SIGNED_IN', session);
      mocks.callback('SIGNED_OUT', null);
      await new Promise(resolve => window.setTimeout(resolve, 10));
    });
    expect(auth.user).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('does not restore access when a pending validation finishes after logout', async () => {
    mocks.getSession.mockResolvedValue({ data: { session } });
    let finish: (value: unknown) => void;
    mocks.rpc.mockImplementation((name: string) => name === 'is_user_active'
      ? new Promise(resolve => { finish = resolve; }) : Promise.resolve({ data: [], error: null }));
    mount();
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalled());
    act(() => mocks.callback('SIGNED_OUT', null));
    await act(async () => { finish({ data: true, error: null }); });
    expect(auth.user).toBeNull();
    expect(auth.permissionsLoaded).toBe(false);
  });

  it('closes an active session when suspended, without workspace-exit approval', async () => {
    mocks.getSession.mockResolvedValue({ data: { session } });
    mount();
    await waitFor(() => expect(screen.getByText('authorized')).toBeInTheDocument());
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    act(() => { window.dispatchEvent(new Event('focus')); });
    await waitFor(() => expect(screen.getByText('signed-out')).toBeInTheDocument());
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(auth.permissions).toEqual([]);
  });

  it('fails closed when the status cannot be verified', async () => {
    mocks.getSession.mockResolvedValue({ data: { session } });
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'offline' } });
    mount();
    await waitFor(() => expect(screen.getByText('signed-out')).toBeInTheDocument());
    expect(mocks.signOut).toHaveBeenCalled();
  });

  it('returns a Spanish suspension error and does not log a successful login', async () => {
    mount();
    await waitFor(() => expect(auth.isLoading).toBe(false));
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    let result: Awaited<ReturnType<typeof auth.signIn>>;
    await act(async () => { result = await auth.signIn('prueba@correo.com', 'password'); });
    expect(result.error?.message).toContain('suspendida');
    expect(mocks.logSession).not.toHaveBeenCalled();
    expect(mocks.signOut).toHaveBeenCalled();
  });

  it('translates the server Auth ban error', async () => {
    mocks.signIn.mockResolvedValue({ data: {}, error: { code: 'user_banned', message: 'User is banned' } });
    mount();
    await waitFor(() => expect(auth.isLoading).toBe(false));
    let result: Awaited<ReturnType<typeof auth.signIn>>;
    await act(async () => { result = await auth.signIn('prueba@correo.com', 'password'); });
    expect(result.error?.message).toContain('suspendida');
    expect(mocks.logSession).not.toHaveBeenCalled();
  });
});
