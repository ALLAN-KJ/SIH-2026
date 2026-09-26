/*
 * AppShell — Single-page entry point (Phase 2/3 restructure).
 *
 * The previous Dashboard/Console two-route split has been removed.
 * The analyzer loads directly as a single page from App.tsx.
 * No hash routing is required.
 */
import App from './App';

export default function AppShell() {
  return <App />;
}
