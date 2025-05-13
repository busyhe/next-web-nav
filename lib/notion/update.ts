import { NotionAPI } from 'notion-client';
import api from './core';

export async function updatePageIcon(pageId: string, iconUrl: string): Promise<boolean> {
  try {
    const { NOTION_ACCESS_TOKEN } = process.env;
    
    if (!NOTION_ACCESS_TOKEN) {
      throw new Error('NOTION_ACCESS_TOKEN is not defined');
    }

    // For updating content, we need to use the official Notion API
    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${NOTION_ACCESS_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        icon: {
          type: 'external',
          external: {
            url: iconUrl
          }
        }
      })
    });

    const data = await response.json();
    return response.ok;
  } catch (error) {
    console.error(`Error updating page icon for ${pageId}:`, error);
    return false;
  }
} 