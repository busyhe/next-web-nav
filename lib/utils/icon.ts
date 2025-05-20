/**
 * 优化图标URL，确保它是有效的网页图标
 * @param iconUrl 原始图标URL
 * @returns 优化后的图标URL或默认图标
 */
export function optimizeIconUrl(iconUrl: string | null | undefined): string {
  if (!iconUrl) return "/icons/default.png"

  // 如果已经是完整URL，直接返回
  if (iconUrl.startsWith("http")) {
    return iconUrl
  }

  // 如果是相对路径，转换为绝对路径
  if (iconUrl.startsWith("/")) {
    // 假设网站根域名是从环境变量获取的，如果没有则使用当前域名
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ""
    return `${baseUrl}${iconUrl}`
  }

  // 如果只是域名，构建默认的favicon URL
  if (!iconUrl.includes("/")) {
    return `https://${iconUrl}/favicon.ico`
  }

  // 尝试从URL中提取域名
  try {
    const url = iconUrl.startsWith("http") ? iconUrl : `https://${iconUrl}`
    const domain = new URL(url).hostname
    return `https://${domain}/favicon.ico`
  } catch (e) {
    // 解析失败，返回默认图标
    return "/icons/default.png"
  }
}

/**
 * 获取适合显示的favicon URL
 * @param url 网站URL或图标URL
 * @returns 处理后的图标URL
 */
export function getFaviconUrl(url: string): string {
  // 如果没有URL，返回默认图标
  if (!url) return "/icons/default.png"

  // 已经是图标URL (通常以.ico, .png等结尾)
  const iconExtensions = [".ico", ".png", ".jpg", ".jpeg", ".svg", ".gif"]
  if (iconExtensions.some((ext) => url.toLowerCase().endsWith(ext))) {
    return optimizeIconUrl(url)
  }

  try {
    // 尝试提取域名
    let domain = url
    if (url.startsWith("http")) {
      domain = new URL(url).hostname
    } else if (url.includes("/")) {
      // 可能是不带协议的URL，如 example.com/path
      domain = url.split("/")[0]
    }

    return `https://favicon.im/${domain}?larger=true`
  } catch (e) {
    console.error("Error parsing URL for favicon:", e)
    return "/icons/default.png"
  }
}
