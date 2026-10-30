import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  CircleUserRound,
  Compass,
  Flower2,
  Home,
  Library,
  Settings,
  Users,
} from 'lucide-react';
import { useEffect } from 'react';
import { useI18n, type TranslationKey } from '../../i18n';
import { useOnline } from '../../hooks/useOnline';
import { useSession } from '../providers/SessionProvider';
export const mainRoutes: [string, TranslationKey, typeof Home][] = [
  ['/home', 'nav.home', Home],
  ['/discover', 'nav.discover', Compass],
  ['/library', 'nav.library', Library],
  ['/circles', 'nav.circles', Users],
  ['/profile', 'nav.profile', CircleUserRound],
];
export function AppShell() {
  const { t, locale } = useI18n();
  const online = useOnline();
  const session = useSession();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  function navigation(mobile = false) {
    return (
      <nav aria-label={t(mobile ? 'nav.mobile' : 'nav.main')}>
        {mainRoutes.map(([path, key, Icon]) => (
          <NavLink key={path} to={path}>
            <Icon aria-hidden="true" size={22} />
            <span>{t(key)}</span>
          </NavLink>
        ))}
      </nav>
    );
  }
  return (
    <>
      <a className="skip-link" href="#main-content">
        {t('nav.skip')}
      </a>
      <aside className="sidebar" aria-label={t('nav.sidebar')}>
        <Link className="brand" to="/">
          <Flower2 aria-hidden="true" />
          <span>{t('brand')}</span>
        </Link>
        <p className="nav-label">{t('tagline')}</p>
        {navigation()}
        <div className="sidebar-note">
          <Flower2 aria-hidden="true" />
          <p>{t('shell.tempo')}</p>
          <small>{t('shell.counts')}</small>
        </div>
        <Link className="settings-link" to="/settings">
          <Settings size={20} />
          <span>{t('nav.settings')}</span>
        </Link>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>{t('shell.space')}</span>
          <Link to="/settings" aria-label={t('nav.settings')}>
            <Settings size={20} />
          </Link>
          <span className="badge">
            {t(session.mode === 'demo' ? 'demo.badge' : 'account.badge')}
          </span>
        </header>
        <main id="main-content" tabIndex={-1}>
          {!online && (
            <div role="status" className="notice">
              {t('common.offline')}
            </div>
          )}
          <Outlet />
          <footer>
            <Flower2 size={16} aria-hidden="true" />
            {t('brand')} · {t('shell.footer')}
          </footer>
        </main>
      </div>
      <div className="bottom-nav">{navigation(true)}</div>
    </>
  );
}
