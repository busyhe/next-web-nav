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
    
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
      reportStatus('init', `已添加协议，完整URL: ${url}`);
    }
    
    const urlObj = new URL(url);
    const origin = urlObj.origin;
    
    // First try the standard favicon location
    const standardFaviconUrl = `${origin}/favicon.ico`;
    reportStatus('trying-standard', `尝试标准favicon位置: ${standardFaviconUrl}`);
    
    // Check if standard favicon exists with a HEAD request
    try {
      const standardCheck = await fetch(standardFaviconUrl, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      if (standardCheck.ok) {
        reportStatus('complete', `在标准位置找到favicon`, standardFaviconUrl);
        return standardFaviconUrl;
      }
    } catch (error) {
      reportStatus('trying-standard', `标准位置未找到favicon，继续查找`);
    }
    
    // Fetch the HTML to look for favicon links
    reportStatus('fetching-html', `正在获取HTML页面内容`);
    const response = await fetch(url, { 
      redirect: 'follow',
      signal: AbortSignal.timeout(10000) // 5 second timeout for main page
    });
    const html = await response.text();
    
    // Look for favicon in HTML head
    reportStatus('parsing-html', `正在解析HTML寻找favicon链接`);
    
    const iconTypes = [
      { regex: /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["'][^>]*>/i, name: '标准favicon' },
      { regex: /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["'][^>]*>/i, name: 'Apple图标' },
      { regex: /<link[^>]*rel=["']apple-touch-icon-precomposed["'][^>]*href=["']([^"']+)["'][^>]*>/i, name: 'Apple预合成图标' },
      { regex: /<link[^>]*rel=["']fluid-icon["'][^>]*href=["']([^"']+)["'][^>]*>/i, name: 'Fluid图标' },
      { regex: /<link[^>]*rel=["']mask-icon["'][^>]*href=["']([^"']+)["'][^>]*>/i, name: 'Mask图标' },
      { regex: /<meta[^>]*name=["']msapplication-TileImage["'][^>]*content=["']([^"']+)["'][^>]*>/i, name: 'MS Tile图标' },
    ];
    
    for (const iconType of iconTypes) {
      const match = html.match(iconType.regex);
      if (match && match[1]) {
        let iconUrl = match[1];
        
        // Handle relative URLs
        if (iconUrl.startsWith('/')) {
          iconUrl = origin + iconUrl;
        } else if (!iconUrl.startsWith('http')) {
          iconUrl = `${origin}/${iconUrl}`;
        }
        
        reportStatus('complete', `找到${iconType.name}链接: ${iconUrl}`, iconUrl);
        
        // Verify the icon URL is valid
        try {
          const iconCheck = await fetch(iconUrl, { 
            method: 'HEAD',
            signal: AbortSignal.timeout(3000)
          });
          if (iconCheck.ok) {
            return iconUrl;
          }
          reportStatus('parsing-html', `${iconType.name}链接无效，继续查找`);
        } catch (error) {
          reportStatus('parsing-html', `无法访问${iconType.name}，继续查找`);
        }
      }
    }
    
    // If no favicon found in HTML, return the standard location as fallback
    reportStatus('complete', `未在HTML中找到有效图标，使用标准位置`, standardFaviconUrl);
    return standardFaviconUrl;
  } catch (error) {
    reportStatus('error', `获取favicon失败: ${error instanceof Error ? error.message : '未知错误'}`);
    console.error(`Error fetching favicon for ${url}:`, error);
    return null;
  }
} 