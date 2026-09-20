import React, { useState, useEffect } from 'react';
import App from './App';
import { Dashboard } from './Dashboard';

/*
 * AppShell — Minimal hash-based router
 *
 * Routes:
 *   /          → Dashboard (new landing page)
 *   #/         → Dashboard
 *   #/console  → App (existing audit console — untouched)
 *
 * This is the only seam between the new page and the existing app.
 * App.tsx and all existing components are never modified.
 */

function getView(): 'dashboard' | 'console' {
  const hash = window.location.hash;
  return hash.startsWith('#/console') ? 'console' : 'dashboard';
}

export default function AppShell() {
  const [view, setView] = useState<'dashboard' | 'console'>(getView);

  useEffect(() => {
    const onHashChange = () => setView(getView());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return view === 'console' ? <App /> : <Dashboard />;
}
