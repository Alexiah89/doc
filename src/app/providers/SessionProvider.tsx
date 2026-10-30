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
import type { Account } from '../../../shared/account';
import { appConfig } from '../config';
export type SessionMode = 'demo' | 'live';
interface Session {
  mode: SessionMode;
  status: 'initializing' | 'signedOut' | 'loadingAccount' | 'ready' | 'error';
  identity: AuthIdentity | null;
  account: Account | null;
  client: AccountClient | null;
  configured: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  enterDemo: () => void;
  enterAccount: () => void;
  reload: () => Promise<void>;
}
const Context = createContext<Session | null>(null);
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
  const [mode, setMode] = useState<SessionMode>(initialMode);
  const [status, setStatus] = useState<Session['status']>(
    auth ? 'initializing' : 'signedOut',
  );
  const [identity, setIdentity] = useState<AuthIdentity | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [client, setClient] = useState<AccountClient | null>(null);
  const generation = useRef(0);
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
    let active = true;
    let unsubscribeAccount: (() => void) | undefined;
    const unsubscribe = auth.subscribe(
      (user) => {
        const attempt = ++generation.current;
        unsubscribeAccount?.();
        setIdentity(user);
        setAccount(null);
        setClient(null);
        if (!user) {
          setStatus('signedOut');
          return;
        }
        const nextClient = new AccountClient(auth, user.uid);
        setClient(nextClient);
        setStatus('loadingAccount');
        unsubscribeAccount = nextClient.subscribe((value) => {
          if (active && attempt === generation.current) setAccount(value);
        });
        nextClient
          .load()
          .then((value) => {
            if (active && attempt === generation.current) {
              setAccount(value);
              setStatus('ready');
            }
          })
          .catch(() => {
            if (active && attempt === generation.current) setStatus('error');
          });
      },
      () => {
        if (active) setStatus('error');
      },
    );
    return () => {
      active = false;
      unsubscribeAccount?.();
      unsubscribe();
    };
  }, [auth]);
  async function reload() {
    if (!client) return;
    const attempt = generation.current;
    setStatus('loadingAccount');
    try {
      const value = await client.load();
      if (attempt === generation.current) {
        setAccount(value);
        setStatus('ready');
      }
    } catch {
      if (attempt === generation.current) setStatus('error');
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
        async signIn() {
          if (!auth) throw Error('Firebase configuration missing');
          chooseMode('live');
          await auth.signIn();
        },
        async signOut() {
          if (auth) await auth.signOut();
          ++generation.current;
          setIdentity(null);
          setAccount(null);
          setClient(null);
          setStatus('signedOut');
          chooseMode('live');
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
