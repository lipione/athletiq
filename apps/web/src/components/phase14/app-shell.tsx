import {
  Activity,
  BadgeCheck,
  BookOpen,
  Building2,
  ClipboardList,
  Globe2,
  Landmark,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { getWorkspaceLinks, type RoleSlug } from '../../lib/phase14-data.js';

type AppShellProps = {
  activeRole?: RoleSlug;
  children: ReactNode;
  eyebrow?: string;
  title?: string;
};

const roleIcons = {
  'super-admin': Activity,
  'school-admin': Building2,
  'coach-referee': ClipboardList,
  federation: BadgeCheck,
  government: Landmark,
} as const;

export function AppShell({ activeRole, children, eyebrow, title }: AppShellProps) {
  const workspaceLinks = getWorkspaceLinks();

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar" aria-label="Primary">
        <a className="brand-mark" href="/">
          <span className="brand-mark__logo">AQ</span>
          <span>
            <strong>ATHLETIQ</strong>
            <small>Operations</small>
          </span>
        </a>
        <nav className="sidebar__nav" aria-label="Role workspaces">
          {workspaceLinks.map((link) => {
            const role = link.href.split('/').at(-1) as RoleSlug;
            const Icon = roleIcons[role];

            return (
              <a
                aria-current={activeRole === role ? 'page' : undefined}
                className="nav-link"
                href={link.href}
                key={link.href}
              >
                <Icon aria-hidden="true" size={18} />
                <span>{link.label}</span>
              </a>
            );
          })}
        </nav>
        <a
          className="nav-link nav-link--public"
          href="/public/tournaments/kathmandu-school-cup-2026"
        >
          <Globe2 aria-hidden="true" size={18} />
          <span>Public tournament</span>
        </a>
        <a className="nav-link" href="http://localhost:4000/api/docs" target="_blank">
          <BookOpen aria-hidden="true" size={18} />
          <span>API docs</span>
        </a>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {title ? <h1>{title}</h1> : null}
          </div>
          <div className="topbar__actions" aria-label="Workspace actions">
            <a
              className="icon-button"
              href="/athletes/ath-nima-rai/passport"
              title="Open athlete passport"
            >
              <BadgeCheck aria-hidden="true" size={18} />
              <span>Passport</span>
            </a>
          </div>
        </header>
        <main id="main-content" className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
