'use client';

import { createContext, useContext } from 'react';

export const AdminKeyContext = createContext<string>('');

export function useAdminKey(): string {
  return useContext(AdminKeyContext);
}
