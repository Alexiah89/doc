import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  createFirebaseAuth,
  type AuthDriver,
  type AuthIdentity,
} from '../../data/firebase/auth';
import { AccountClient } from '../../data/api/account';
import { ApiRequestError } from '../../data/api/client';
import type { Account } from '../../../shared/account';
import { appConfig } from '../config';
import { clearPrivateStorage } from '../../utils/privateStorage';
import { FirebaseAuthRepository } from '../../data/firebase/FirebaseAuthRepository';
export type SessionMode = 'demo' | 'live';
interface Session {
  mode: SessionMode;
  loggingOut: boolean;
  authState:
    | 'initializing'
    | 'unauthenticated'
    | 'authenticated-loading-account'
    | 'authenticated-onboarding-required'
    | 'authenticated-ready'
    | 'account-suspended'
    | 'error';
  authRepository:
    import('../../data/repositories/interfaces').AuthRepository | null;
  status: 'initializing' | 'signedOut' | 'loadingAccount' | 'ready' | 'error';
  identity: AuthIdentity | null;
  account: Account | null;
  client: AccountClient | null;
  configured: boolean;
  errorCode: string | null;
  signIn: () => Promise<void>;
  signInRedirect: () => Promise<void>;
  signOut: () => Promise<void>;
  enterDemo: () => void;
  enterAccount: () => void;
  reload: () => Promise<void>;
}
const Context = createContext<Session | null>(null);
function safeErrorCode(error: unknown) {
  if (
    error instanceof ApiRequestError &&
    /^[a-z0-9-]{1,80}$/.test(error.error.code)
  )
    return error.error.code;
  return 'account-unavailable';
}

function initialMode(): SessionMode {
  try {
    const stored = sessionStorage.getItem('flowcircle.mode');
    if (stored === 'demo' || stored === 'live') return stored;
  } catch {
    /* Storage is optional; identity still comes from Firebase. */
  }
  return appConfig.demoMode ? 'demo' : 'live';
}
export function SessionProvider({
  children,
  driver,
}: {
  children: ReactNode;
  driver?: AuthDriver | null;
}) {
  const [auth] = useState(() =>
    driver === undefined ? createFirebaseAuth() : driver,
  );
  const [loggingOut, setLoggingOut] = useState(false);
  const activeClient = useRef<AccountClient | null>(null);
  const logoutLock = useRef(false);
  const [authRepository] = useState(() =>
    auth ? new FirebaseAuthRepository(auth) : null,
  );
  const [mode, setMode] = useState<SessionMode>(initialMode);
  const [status, setStatus] = useState<Session['status']>(
    auth ? 'initializing' : 'signedOut',
  );
  const [identity, setIdentity] = useState<AuthIdentity | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [client, setClient] = useState<AccountClient | null>(null);
  const generation = useRef(0);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  function chooseMode(value: SessionMode) {
    setMode(value);
    try {
      sessionStorage.setItem('flowcircle.mode', value);
    } catch {
      /* Mode preference is nonessential. */
    }
  }
  useEffect(() => {
    if (!auth) return;
    void auth.finishRedirect?.().catch(() => {
      setErrorCode('auth-redirect-failed');
      setStatus('error');
    });
    let active = true;
    let unsubscribeAccount: (() => void) | undefined;
    const unsubscribe = authRepository!.subscribeToAuthState(
      (authUser) => {
        const user = authUser
          ? { ...authUser, displayName: authUser.displayName ?? '' }
          : null;
        if (logoutLock.current && user) return;
        const attempt = ++generation.current;
        unsubscribeAccount?.();
        activeClient.current?.dispose();
        activeClient.current = null;
        setIdentity(user);
        setErrorCode(null);
        setAccount(null);
        setClient(null);
        if (!user) {
          setStatus('signedOut');
          return;
        }
        const nextClient = new AccountClient(auth, user.uid, () => {
          ++generation.current;
          activeClient.current?.dispose();
          activeClient.current = null;
          clearPrivateStorage(user.uid);
          setIdentity(null);
          setAccount(null);
          setClient(null);
          setStatus('signedOut');
          setErrorCode('invalid-auth-token');
          void authRepository!
            .signOut()
            .catch(() => setErrorCode('auth-signout-failed'));
        });
        activeClient.current = nextClient;

        setClient(nextClient);
        setStatus('loadingAccount');
        unsubscribeAccount = nextClient.subscribe((value) => {
          if (active && attempt === generation.current) setAccount(value);
        });
        nextClient
          .bootstrapAndLoad()
          .then((value) => {
            if (active && attempt === generation.current) {
              setAccount(value);
              setStatus('ready');
            }
          })
          .catch((error: unknown) => {
            if (active && attempt === generation.current) {
              setErrorCode(safeErrorCode(error));
              setStatus('error');
            }
          });
      },
      () => {
        if (active) {
          setErrorCode('auth-unavailable');
          setStatus('error');
        }
      },
    );
    return () => {
      active = false;
      unsubscribeAccount?.();
      unsubscribe();
      activeClient.current?.dispose();
    };
  }, [auth, authRepository]);
  async function reload() {
    if (!client) return;
    const attempt = generation.current;
    setStatus('loadingAccount');
    setErrorCode(null);
    try {
      const value = await client.load();
      if (attempt === generation.current) {
        setAccount(value);
        setStatus('ready');
      }
    } catch (error: unknown) {
      if (attempt === generation.current) {
        setErrorCode(safeErrorCode(error));
        setStatus('error');
      }
    }
  }
  return (
    <Context.Provider
      value={{
        mode,
        status,
        identity,
        account,
        client,
        configured: !!auth,
        errorCode,
        loggingOut,
        authRepository,
        authState:
          status === 'initializing'
            ? 'initializing'
            : status === 'signedOut'
              ? 'unauthenticated'
              : status === 'loadingAccount'
                ? 'authenticated-loading-account'
                : status === 'error'
                  ? errorCode?.startsWith('account-') &&
                    [
                      'account-suspended',
                      'account-deleted',
                      'account-deletion-pending',
                      'account-disabled',
                    ].includes(errorCode)
                    ? 'account-suspended'
                    : 'error'
                  : account?.onboarding.completed
                    ? 'authenticated-ready'
                    : 'authenticated-onboarding-required',

        async signInRedirect() {
          if (!auth?.redirectSignIn) throw Error('Redirect unavailable');
          chooseMode('live');
          await auth.redirectSignIn();
        },
        async signIn() {
          if (!auth) throw Error('Firebase configuration missing');
          chooseMode('live');
          await authRepository!.signInWithGoogle();
        },
        async signOut() {
          if (logoutLock.current) return;
          logoutLock.current = true;
          setLoggingOut(true);
          ++generation.current;
          activeClient.current?.dispose();
          activeClient.current = null;
          clearPrivateStorage(identity?.uid);
          setIdentity(null);
          setErrorCode(null);
          setAccount(null);
          setClient(null);
          setStatus('signedOut');
          chooseMode('live');
          try {
            if (authRepository) await authRepository.signOut();
          } finally {
            logoutLock.current = false;
            setLoggingOut(false);
          }
        },
        enterDemo: () => chooseMode('demo'),
        enterAccount: () => chooseMode('live'),
        reload,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw Error('SessionProvider missing');
  return value;
}
