'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTabAuthSync } from '../hooks/useTabAuthSync';
import PreHydrationLoader from './PreHydrationLoader';

export default function AuthHydrator({ children }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useAuthStore.getState().hydrateFromSession();
    const t = setTimeout(() => setHydrated(true), 100);
    return () => clearTimeout(t);
  }, []);

  useTabAuthSync();

  return (
    <>
      <PreHydrationLoader show={!hydrated} />
      {children}
    </>
  );
}
