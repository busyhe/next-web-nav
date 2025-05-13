export type FaviconStatus = {
  stage: 'init' | 'fetching-html' | 'parsing-html' | 'trying-standard' | 'complete' | 'error';
  message: string;
  url?: string;
  iconUrl?: string;
  timestamp: number;
}

export type FaviconStatusCallback = (status: FaviconStatus) => void;

export async function getFaviconUrl(
  url: string, 
  statusCallback?: FaviconStatusCallback
): Promise<string | null> {
  const reportStatus = (stage: FaviconStatus['stage'], message: string, iconUrl?: string) => {
    if (statusCallback) {
      statusCallback({
        stage,
        message,
        url,
        iconUrl,
        timestamp: Date.now()
      });
    }
  };

  try {
    reportStatus('init', `正在准备获取网站 ${url} 的图标`);
    
    // Ensure URL has protocol if needed for domain extraction
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
      reportStatus('init', `已添加协议，完整URL: ${url}`);
    }
    
    // Extract domain from URL
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // Use Google's favicon service directly
    reportStatus('complete', `使用Google favicon服务获取图标`, `https://www.google.com/s2/favicons?domain=${domain}&sz=64`);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    
  } catch (error) {
    reportStatus('error', `获取favicon失败: ${error instanceof Error ? error.message : '未知错误'}`);
    console.error(`Error fetching favicon for ${url}:`, error);
    return null;
  }
} 