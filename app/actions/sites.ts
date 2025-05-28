"use server";

import { getSites } from '@/lib/notion/pages';

export const dynamic = 'force-dynamic';

export async function fetchSites() {
  try {
    const data = await getSites();
    return { success: true, data };
  } catch (error) {
    console.error('Failed to fetch sites:', error);
    return { success: false, data: [], error: 'Failed to fetch data' };
  }
} 