"use server";

import { idToUuid } from 'notion-utils';
import { getSites } from '@/lib/notion/pages';
import { getFaviconUrl, FaviconStatus } from '@/lib/utils/favicon';
import { updatePageIcon } from '@/lib/notion/update';
import api from '@/lib/notion/core';

export type SyncProgress = {
  total: number;
  current: number;
  completed: {
    id: string;
    title: string;
    success: boolean;
    iconUrl?: string;
    error?: string;
  }[];
  inProgress?: string;
  error?: string;
  // 详细的favicon获取状态
  faviconStatus?: FaviconStatus;
}

interface SiteItem {
  title: string;
  link: string;
  icon?: string;
  desc?: string;
}

interface SiteGroup {
  title: string;
  items: SiteItem[];
}

// 创建一个流式同步函数
export async function streamSyncFavicons(): Promise<ReadableStream<SyncProgress>> {
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      try {
        // Get Notion page ID from environment
        const envPageId = process.env.NOTION_PAGE_ID;
        if (!envPageId) {
          throw new Error('NOTION_PAGE_ID is not defined');
        }
        
        const pageId = idToUuid(envPageId);
        const recordMap = await api.getPage(pageId, {
          fetchCollections: true,
          fetchMissingBlocks: true,
        });

        const sites = await getSites();
        
        // Create a flat array of all items with their IDs
        const allItems: { id: string; title: string; link: string }[] = [];
        
        const collection = Object.values(recordMap.collection)[0]?.value;
        const block = recordMap.block;
        const collectionId = Object.keys(recordMap.collection)[0];
        
        sites.forEach((group: SiteGroup) => {
          if (!group.items) return;
          
          group.items.forEach((item: SiteItem) => {
            if (item.link) {
              // Find the block ID for this item
              const blockId = Object.keys(block).find(id => {
                const blockValue = block[id]?.value;
                if (!blockValue || !blockValue.properties) return false;

                // Check if this block's title matches our item title
                const titleProperty = Object.values(blockValue.properties || {}).find(
                  (prop: any) => prop && prop.length > 0 && prop[0] && prop[0][0] === item.title
                );
                
                return !!titleProperty;
              });
              
              if (blockId) {
                allItems.push({
                  id: blockId,
                  title: item.title,
                  link: item.link
                });
              }
            }
          });
        });
        
        let progress: SyncProgress = {
          total: allItems.length,
          current: 0,
          completed: []
        };
        
        // 发送初始状态
        controller.enqueue(progress);
        
        // Process each item
        for (const item of allItems) {
          progress.current += 1;
          progress.inProgress = item.title;
          
          // 更新进度
          controller.enqueue({...progress});
          
          try {
            // 定义一个状态更新函数，用于获取实时favicon状态
            const statusCallback = (status: FaviconStatus) => {
              progress = {
                ...progress,
                faviconStatus: status
              };
              controller.enqueue({...progress});
            };
            
            // Get favicon URL with status updates
            const faviconUrl = await getFaviconUrl(item.link, statusCallback);
            
            if (faviconUrl) {
              // Update Notion page icon
              const success = await updatePageIcon(item.id, faviconUrl);
              
              progress.completed.push({
                id: item.id,
                title: item.title,
                success,
                iconUrl: faviconUrl
              });
              
              controller.enqueue({...progress});
            } else {
              progress.completed.push({
                id: item.id,
                title: item.title,
                success: false,
                error: '无法获取图标'
              });
              
              controller.enqueue({...progress});
            }
          } catch (error) {
            console.error(`Error processing ${item.title}:`, error);
            progress.completed.push({
              id: item.id,
              title: item.title,
              success: false,
              error: error instanceof Error ? error.message : '未知错误'
            });
            
            controller.enqueue({...progress});
          }
        }
        
        controller.close();
      } catch (error) {
        console.error('Failed to sync favicons:', error);
        const errorProgress: SyncProgress = {
          total: 0,
          current: 0,
          completed: [],
          error: error instanceof Error ? error.message : '同步图标失败'
        };
        
        controller.enqueue(errorProgress);
        controller.close();
      }
    }
  });
}

// 保留原来的同步函数以保持兼容性
export async function syncFavicons(): Promise<SyncProgress> {
  try {
    // Get Notion page ID from environment
    const envPageId = process.env.NOTION_PAGE_ID;
    if (!envPageId) {
      throw new Error('NOTION_PAGE_ID is not defined');
    }
    
    const pageId = idToUuid(envPageId);
    const recordMap = await api.getPage(pageId, {
      fetchCollections: true,
      fetchMissingBlocks: true,
    });

    const sites = await getSites();
    
    // Create a flat array of all items with their IDs
    const allItems: { id: string; title: string; link: string }[] = [];
    
    const collection = Object.values(recordMap.collection)[0]?.value;
    const block = recordMap.block;
    const collectionId = Object.keys(recordMap.collection)[0];
    
    sites.forEach((group: SiteGroup) => {
      if (!group.items) return;
      
      group.items.forEach((item: SiteItem) => {
        if (item.link) {
          // Find the block ID for this item
          const blockId = Object.keys(block).find(id => {
            const blockValue = block[id]?.value;
            if (!blockValue || !blockValue.properties) return false;

            // Check if this block's title matches our item title
            const titleProperty = Object.values(blockValue.properties || {}).find(
              (prop: any) => prop && prop.length > 0 && prop[0] && prop[0][0] === item.title
            );
            
            return !!titleProperty;
          });
          
          if (blockId) {
            allItems.push({
              id: blockId,
              title: item.title,
              link: item.link
            });
          }
        }
      });
    });
    
    const progress: SyncProgress = {
      total: allItems.length,
      current: 0,
      completed: []
    };
    
    // Process each item
    for (const item of allItems) {
      progress.current += 1;
      progress.inProgress = item.title;
      
      try {
        // 定义一个状态更新函数，用于获取实时favicon状态
        let currentFaviconStatus: FaviconStatus | undefined;
        const statusCallback = (status: FaviconStatus) => {
          currentFaviconStatus = status;
        };
        
        // Get favicon URL with status updates
        const faviconUrl = await getFaviconUrl(item.link, statusCallback);
        
        if (faviconUrl) {
          // Update Notion page icon
          progress.faviconStatus = currentFaviconStatus;
          const success = await updatePageIcon(item.id, faviconUrl);
          
          progress.completed.push({
            id: item.id,
            title: item.title,
            success,
            iconUrl: faviconUrl
          });
        } else {
          progress.completed.push({
            id: item.id,
            title: item.title,
            success: false,
            error: '无法获取图标'
          });
        }
      } catch (error) {
        console.error(`Error processing ${item.title}:`, error);
        progress.completed.push({
          id: item.id,
          title: item.title,
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }
    
    return progress;
  } catch (error) {
    console.error('Failed to sync favicons:', error);
    return {
      total: 0,
      current: 0,
      completed: [],
      error: error instanceof Error ? error.message : '同步图标失败'
    };
  }
} 