"use server";

import { getSites } from '@/lib/notion/pages';
import { unstable_noStore as noStore } from 'next/cache';

export async function fetchSites() {
  // Opt out of static rendering and caching
  noStore();
  
  try {
    const data = await getSites();
    return { success: true, data };
  } catch (error) {
    console.error('Failed to fetch sites:', error);
    return { success: false, data: [], error: 'Failed to fetch data' };
  }
} 