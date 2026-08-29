'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from '../styles/theme';
import { getStaticUrl } from '../utils/globalFunc';
import { useAuthStore } from '../store/authStore';

const STORAGE_KEY = 'waba-theme-mode';

/* Valid user preferences: 'light' | 'dark' | 'system' */
const VALID_MODES = ['light', 'dark', 'system'];

const ThemeModeContext = createContext({
  mode: 'light',
  resolvedMode: 'light',
  toggleMode: () => {},
  setMode: () => {},
});

export const useThemeMode = () => useContext(ThemeModeContext);

function applyDataTheme(resolvedMode) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', resolvedMode);
  }
}

/* ── useSyncExternalStore: read theme preference from localStorage ── */

function subscribePreference(callback) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getPreferenceSnapshot() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (VALID_MODES.includes(stored)) return stored;
  } catch (_) { /* ignore */ }
  return 'light';
}

function getPreferenceServerSnapshot() {
  return 'light';
}

/* ── useSyncExternalStore: read OS color-scheme preference ── */

function subscribeSystem(callback) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getSystemSnapshot() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getSystemServerSnapshot() {
  return 'light';
}

export default function ThemeRegistry({ children }) {
  const mode = useSyncExternalStore(subscribePreference, getPreferenceSnapshot, getPreferenceServerSnapshot);
  const systemMode = useSyncExternalStore(subscribeSystem, getSystemSnapshot, getSystemServerSnapshot);
  /* Subscribe to redirect_version so CSS background images re-resolve when auth hydrates. */
  const redirectVersion = useAuthStore((s) => s.auth?.redirect_version);

  /* The actual mode applied to the DOM/MUI theme. */
  const resolvedMode = mode === 'system' ? systemMode : mode;

  /* Override the --chat-bg-image CSS variable with a redirect_version-aware URL.
     globals.scss defines a root-relative fallback; this corrects it for sub-path deploys. */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const bg = resolvedMode === 'dark' ? '/bg-3_dark.png' : '/bg-3_light.jpg';
    document.documentElement.style.setProperty('--chat-bg-image', `url('${getStaticUrl(bg)}')`);
  }, [resolvedMode, redirectVersion]);

  const setMode = useCallback((next) => {
    if (!VALID_MODES.includes(next)) return;
    applyDataTheme(next === 'system' ? systemMode : next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      // Dispatch a synthetic storage event so useSyncExternalStore re-reads.
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: next }));
    } catch (_) { /* ignore */ }
  }, [systemMode]);

  const toggleMode = useCallback(() => {
    setMode(resolvedMode === 'light' ? 'dark' : 'light');
  }, [resolvedMode, setMode]);

  /* Keep data-theme attribute in sync whenever the resolved mode changes. */
  useMemo(() => applyDataTheme(resolvedMode), [resolvedMode]);

  const theme = useMemo(() => getTheme(resolvedMode), [resolvedMode]);

  const contextValue = useMemo(
    () => ({ mode, resolvedMode, toggleMode, setMode }),
    [mode, resolvedMode, toggleMode, setMode]
  );

  return (
    <ThemeModeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
