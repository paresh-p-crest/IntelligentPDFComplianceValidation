import { useEffect, useState } from 'react';
import { NAV_SECTIONS, getSectionMeta } from '../../navigation.js';
import { IconSidebarCollapse, IconSidebarExpand } from '../icons.jsx';
import SidebarBrand from './SidebarBrand.jsx';

const SIDEBAR_KEY = 'cp-sidebar-open';

export default function AppShell({
  activeSection,
  onNavigate,
  apiConfigured,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, String(sidebarOpen));
    } catch {
      // ignore
    }
  }, [sidebarOpen]);

  const sectionMeta = getSectionMeta(activeSection);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-30 flex flex-col border-r border-slate-800 bg-cp-dark text-white shadow-xl transition-all duration-300 ease-in-out lg:static ${
            sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:w-0 lg:translate-x-0'
          } overflow-hidden`}
        >
          <div className="flex-shrink-0 border-b border-slate-800 px-4 py-5">
            <SidebarBrand />
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
            {NAV_SECTIONS.map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  title={item.label}
                  className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                    active
                      ? 'border-l-[3px] border-cp-lime bg-slate-200 pl-[9px] text-slate-900 shadow-sm'
                      : 'border-l-[3px] border-transparent text-slate-200 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <item.Icon
                    className={`h-4 w-4 flex-shrink-0 ${
                      active ? 'text-cp-lime-dark' : 'text-slate-300 group-hover:text-white'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex-shrink-0 border-t border-slate-800 px-4 py-4">
            {!apiConfigured && (
              <p className="mb-2 text-xs text-amber-300">API not configured</p>
            )}
            <a
              href="/documentation"
              className="text-xs font-semibold text-cp-lime hover:text-lime-300"
            >
              Platform documentation
            </a>
          </div>
        </aside>

        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar overlay"
            className="fixed inset-0 z-20 bg-slate-900/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-cp-lime hover:bg-lime-50 hover:text-cp-lime-dark"
              title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              {sidebarOpen ? <IconSidebarCollapse /> : <IconSidebarExpand />}
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-cp-lime-dark">
                Crosstown Partners
              </p>
              <h1 className="truncate text-base font-semibold text-slate-900">
                {sectionMeta.label}
              </h1>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
