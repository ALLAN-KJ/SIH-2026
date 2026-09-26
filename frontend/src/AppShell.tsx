import { useState } from 'react';
import App from './App';
import { Home } from './Home';

export type RouteMode = 'home' | 'passive' | 'active' | 'demo';

export default function AppShell() {
  const [route, setRoute] = useState<RouteMode>('home');

  if (route === 'home') {
    return <Home onNavigate={(mode) => setRoute(mode)} />;
  }

  return <App initialMode={route} onGoHome={() => setRoute('home')} />;
}
