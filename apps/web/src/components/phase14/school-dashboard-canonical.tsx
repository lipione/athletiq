'use client';

import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Folder,
  Globe2,
  Home,
  FileCheck2,
  GitBranch,
  LayoutDashboard,
  Mail,
  Menu,
  Moon,
  Plus,
  Settings,
  Shield,
  Sun,
  Trophy,
  Upload,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BracketConsole } from '../live/bracket-console.js';
import { DocumentReviewConsole } from '../live/document-review-console.js';
import { GuardianRegistrationConsole } from '../live/guardian-registration-console.js';
import { SchoolAdminConsole } from '../live/school-admin-console.js';
import {
  SchoolHousesPanel,
  SchoolProfilePanel,
  SchoolSettingsPanel,
  SchoolStaffPanel,
  SchoolStudentsPanel,
  SchoolTeamsPanel,
  SchoolTournamentsPanel,
} from './role-parity-panels.js';

type SchoolTab = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  render: () => React.ReactNode;
};

const tabs: SchoolTab[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    render: () => <SchoolAdminConsole />,
  },
  { id: 'students', label: 'Players', icon: Users, render: () => <SchoolStudentsPanel /> },
  { id: 'teams', label: 'Teams', icon: Trophy, render: () => <SchoolTeamsPanel /> },
  { id: 'houses', label: 'Houses', icon: Building2, render: () => <SchoolHousesPanel /> },
  { id: 'staff', label: 'Staff', icon: Shield, render: () => <SchoolStaffPanel /> },
  {
    id: 'tournaments',
    label: 'Tournaments',
    icon: Trophy,
    render: () => <SchoolTournamentsPanel />,
  },
  { id: 'profile', label: 'Profile', icon: Shield, render: () => <SchoolProfilePanel /> },
  { id: 'settings', label: 'Settings', icon: Settings, render: () => <SchoolSettingsPanel /> },
  {
    id: 'documents',
    label: 'Document Review',
    icon: FileCheck2,
    render: () => (
      <DocumentReviewConsole
        requestOptions={{ devActor: { id: 'usr_demo_school_admin', role: 'school_admin' } }}
      />
    ),
  },
  {
    id: 'brackets',
    label: 'Tournament Brackets',
    icon: GitBranch,
    render: () => (
      <BracketConsole
        requestOptions={{ devActor: { id: 'usr_demo_school_admin', role: 'school_admin' } }}
      />
    ),
  },
  {
    id: 'guardian-intake',
    label: 'Guardian Intake',
    icon: Shield,
    render: () => <GuardianRegistrationConsole />,
  },
];

export function SchoolDashboardCanonical() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const nextCollapsed = window.localStorage.getItem('athletiq-school-sidebar-collapsed');
    if (nextCollapsed === '1') {
      setCollapsed(true);
    }
    const query = new URLSearchParams(window.location.search);
    const requestedTab = query.get('tab');
    setActiveTab(
      tabs.some((tab) => tab.id === requestedTab) ? (requestedTab ?? 'overview') : 'overview',
    );
  }, []);

  useEffect(() => {
    window.localStorage.setItem('athletiq-school-sidebar-collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  const current = useMemo(() => tabs.find((tab) => tab.id === activeTab) ?? tabs[0], [activeTab]);
  if (!current) {
    return null;
  }

  const chooseTab = (tabId: string) => {
    const query = new URLSearchParams(window.location.search);
    query.set('tab', tabId);
    window.history.replaceState({}, '', `/workspaces/school-admin?${query.toString()}`);
    setActiveTab(tabId);
  };

  const sidebarItems = [
    { id: 'overview', label: 'Dashboard', icon: Home },
    { id: 'students', label: 'Players', icon: Users, expanded: true },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'tournaments', label: 'Events & Tournaments', icon: Trophy, hasChildren: true },
    { id: 'staff', label: 'Training', icon: CalendarDays, hasChildren: true },
    { id: 'documents', label: 'Documents', icon: Folder },
    { id: 'brackets', label: 'Reports & Analytics', icon: BarChart3, hasChildren: true },
    { id: 'guardian-intake', label: 'Communication', icon: Mail, hasChildren: true },
    { id: 'profile', label: 'School Profile', icon: Building2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const playerSubItems = [
    { label: 'All Players', tabId: 'students', active: current.id === 'students' },
    { label: 'Add New Player', tabId: 'guardian-intake', icon: Plus },
    { label: 'Bulk Import', tabId: 'guardian-intake', icon: Upload },
    { label: 'Player Transfer Requests', tabId: 'documents', icon: Shield },
  ];

  return (
    <div
      className={`school-dashboard ${dark ? 'school-dashboard--dark' : ''} ${collapsed ? 'school-dashboard--collapsed' : ''}`.trim()}
    >
      <aside className={`school-sidebar ${collapsed ? 'school-sidebar--collapsed' : ''}`}>
        <div className="school-sidebar__brand-block">
          <div className="school-brand">
            <span className="school-brand__logo">A</span>
            {!collapsed ? (
              <span>
                <strong>ATHLETIQ</strong>
                <small>Track the Rise. Train the Future.</small>
              </span>
            ) : null}
          </div>
          {!collapsed ? (
            <button className="school-org-card" onClick={() => chooseTab('profile')} type="button">
              <span className="school-org-card__crest">S</span>
              <span>
                <strong>Sunrise Secondary School</strong>
                <small>School Admin</small>
              </span>
              <ChevronDown size={14} />
            </button>
          ) : null}
        </div>

        <nav className="school-sidebar__nav">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <div className="school-sidebar__group" key={item.id}>
                <button
                  aria-current={item.id === current.id ? 'page' : undefined}
                  className="school-sidebar__item"
                  onClick={() => chooseTab(item.id)}
                  type="button"
                >
                  <Icon size={18} />
                  {!collapsed ? <span>{item.label}</span> : null}
                  {!collapsed && (item.expanded || item.hasChildren) ? (
                    <ChevronDown className="school-sidebar__chevron" size={14} />
                  ) : null}
                </button>
                {!collapsed && item.expanded ? (
                  <div className="school-sidebar__subnav">
                    {playerSubItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      return (
                        <button
                          aria-current={subItem.active ? 'page' : undefined}
                          className="school-sidebar__subitem"
                          key={subItem.label}
                          onClick={() => chooseTab(subItem.tabId)}
                          type="button"
                        >
                          {SubIcon ? (
                            <SubIcon size={14} />
                          ) : (
                            <span className="school-sidebar__dot" />
                          )}
                          <span>{subItem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="school-sidebar__foot">
          {!collapsed ? (
            <a
              className="school-language-card"
              href="/workspaces/school-admin?tab=settings"
              onClick={(event) => {
                event.preventDefault();
                chooseTab('settings');
              }}
            >
              <Globe2 size={18} />
              <span>English</span>
              <ChevronDown size={14} />
            </a>
          ) : null}
          {!collapsed ? (
            <a
              className="school-user-card"
              href="/workspaces/school-admin?tab=profile"
              onClick={(event) => {
                event.preventDefault();
                chooseTab('profile');
              }}
            >
              <span className="school-user-card__avatar">RA</span>
              <span>
                <strong>Ramesh Adhikari</strong>
                <small>School Admin</small>
              </span>
              <ChevronDown size={14} />
            </a>
          ) : null}
          <button
            className="school-sidebar__item"
            onClick={() => setDark((value) => !value)}
            type="button"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            {!collapsed ? <span>{dark ? 'Light Mode' : 'Dark Mode'}</span> : null}
          </button>
        </div>
      </aside>

      <section className="school-main">
        <header className="school-topbar">
          <div className="school-topbar__title">
            <button
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="school-topbar__menu"
              onClick={() => setCollapsed((value) => !value)}
              type="button"
            >
              {collapsed ? <ChevronRight size={21} /> : <Menu size={21} />}
            </button>
            <h1>{current.id === 'students' ? 'Players' : current.label}</h1>
          </div>
          <div className="school-topbar__actions">
            <a
              className="school-topbar__icon school-topbar__icon--notify"
              href="/workspaces/school-admin?tab=documents"
              onClick={(event) => {
                event.preventDefault();
                chooseTab('documents');
              }}
            >
              <Bell size={16} />
            </a>
            <a
              className="school-topbar__icon"
              href="/workspaces/school-admin?tab=guardian-intake"
              onClick={(event) => {
                event.preventDefault();
                chooseTab('guardian-intake');
              }}
            >
              <Mail size={16} />
            </a>
            <a
              className="school-topbar__language"
              href="/workspaces/school-admin?tab=settings"
              onClick={(event) => {
                event.preventDefault();
                chooseTab('settings');
              }}
            >
              <Globe2 size={18} />
              <span>EN</span>
              <ChevronDown size={14} />
            </a>
            <a
              className="school-topbar__profile"
              href="/workspaces/school-admin?tab=profile"
              onClick={(event) => {
                event.preventDefault();
                chooseTab('profile');
              }}
            >
              <span className="school-topbar__avatar">RA</span>
              <span>
                <strong>Ramesh Adhikari</strong>
                <small>School Admin</small>
              </span>
              <ChevronDown size={16} />
            </a>
          </div>
        </header>

        <main className="school-content">{current.render()}</main>
      </section>
    </div>
  );
}
