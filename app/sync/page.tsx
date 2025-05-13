"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { syncFavicons, streamSyncFavicons, SyncProgress } from "../actions/sync";
import { Button } from "@/components/ui/button";
import { Loader2, Check, AlertCircle, Clock, Hourglass, Search, ExternalLink, FileIcon, Globe, Link2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FaviconStatus } from "@/lib/utils/favicon";

export default function SyncPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const [faviconStatusHistory, setFaviconStatusHistory] = useState<FaviconStatus[]>([]);
  const [completedIcons, setCompletedIcons] = useState<Record<number, string>>({});
  // URL映射 - 用于将进度中的项目与其URL关联
  const [urlMap, setUrlMap] = useState<Record<number, string>>({});

  // 自动滚动引用
  const statusHistoryRef = useRef<HTMLDivElement>(null);
  const detailsListRef = useRef<HTMLDivElement>(null);

  // Stream reader reference
  const readerRef = useRef<ReadableStreamDefaultReader<any> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update elapsed time every second during sync
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (isLoading && startTime) {
      timer = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);

        // Calculate estimated time remaining
        if (progress && progress.current > 0 && progress.total > 0) {
          const timePerItem = elapsed / progress.current;
          const itemsRemaining = progress.total - progress.current;
          const estimated = Math.floor(timePerItem * itemsRemaining);
          setEstimatedTimeRemaining(estimated);
        }
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLoading, startTime, progress]);

  // Update favicon status history when progress updates
  useEffect(() => {
    if (progress?.faviconStatus) {
      setFaviconStatusHistory(prev => {
        // Add new status to history if it's different from the last one
        const lastStatus = prev[prev.length - 1];
        if (!lastStatus ||
          lastStatus.stage !== progress.faviconStatus!.stage ||
          lastStatus.message !== progress.faviconStatus!.message) {
          return [...prev, progress.faviconStatus!];
        }
        return prev;
      });

      // 更新URL映射
      if (progress.faviconStatus.url && progress.current > 0) {
        setUrlMap(prev => ({
          ...prev,
          [progress.current - 1]: progress.faviconStatus?.url || ''
        }));
      }

      // 当获取到图标URL时保存到已完成图标中
      if (progress.faviconStatus.iconUrl && progress.current > 0) {
        setCompletedIcons(prev => ({
          ...prev,
          [progress.current - 1]: progress.faviconStatus?.iconUrl || ''
        }));
      }
    }
  }, [progress?.faviconStatus, progress?.current]);

  // 自动滚动到最新状态
  useEffect(() => {
    if (statusHistoryRef.current && faviconStatusHistory.length > 0) {
      statusHistoryRef.current.scrollTop = statusHistoryRef.current.scrollHeight;
    }
  }, [faviconStatusHistory]);

  // 自动滚动到活动项
  useEffect(() => {
    if (detailsListRef.current && isLoading) {
      const activeItem = detailsListRef.current.querySelector(`[data-index="${activeItemIndex}"]`);
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeItemIndex, isLoading]);

  // Clean up stream reader and abort controller on unmount
  useEffect(() => {
    return () => {
      if (readerRef.current) {
        readerRef.current.cancel();
        readerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // 处理流式数据读取
  const handleStreamResponse = async (stream: ReadableStream<SyncProgress>) => {
    try {
      // 设置新的阅读器
      const reader = stream.getReader();
      readerRef.current = reader;

      // 持续读取直到完成
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          // 流结束
          setIsLoading(false);
          break;
        }

        // 更新进度
        setProgress(value);
        setActiveItemIndex(value.current - 1);

        // 如果有已完成项目，保存其图标URL
        if (value.completed.length > 0) {
          const newIcons = { ...completedIcons };
          value.completed.forEach((item, index) => {
            if (item.iconUrl) {
              newIcons[index] = item.iconUrl;
            }
          });
          setCompletedIcons(newIcons);
        }
      }
    } catch (err) {
      console.error("Error reading stream:", err);
      setError(err instanceof Error ? err.message : '数据流读取错误');
      setIsLoading(false);
    } finally {
      readerRef.current = null;
    }
  };

  const handleSync = async () => {
    // 取消任何正在进行的同步
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的中止控制器
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    setStartTime(Date.now());
    setElapsedTime(0);
    setEstimatedTimeRemaining(null);
    setActiveItemIndex(0);
    setFaviconStatusHistory([]);
    setUrlMap({});
    setCompletedIcons({});
    setProgress({
      total: 0,
      current: 0,
      completed: []
    });

    try {
      // 开始流式同步
      const stream = await streamSyncFavicons();
      handleStreamResponse(stream);
    } catch (err) {
      console.error("Failed to start sync:", err);
      setError(err instanceof Error ? err.message : '同步启动失败');
      setIsLoading(false);
    }
  };

  // 取消同步
  const handleCancel = () => {
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
  };

  const completedCount = progress?.completed.length || 0;
  const successCount = progress?.completed.filter(item => item.success).length || 0;
  const failureCount = completedCount - successCount;
  const percent = progress?.total ? Math.round((isLoading ? progress.current : completedCount) / progress.total * 100) : 0;

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get icon for favicon status stage
  const getFaviconStatusIcon = (stage: FaviconStatus['stage']) => {
    switch (stage) {
      case 'init':
        return <FileIcon size={16} className="text-blue-500" />;
      case 'fetching-html':
        return <ExternalLink size={16} className="text-yellow-500" />;
      case 'parsing-html':
        return <Search size={16} className="text-purple-500" />;
      case 'trying-standard':
        return <Search size={16} className="text-cyan-500" />;
      case 'complete':
        return <Check size={16} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return <Loader2 size={16} className="animate-spin text-gray-500" />;
    }
  };

  // 格式化URL为可读形式
  const formatUrl = (url: string): string => {
    try {
      if (!url) return '';

      // 确保URL有协议
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(fullUrl);

      // 只返回域名和路径的前一部分，以保持简洁
      let formatted = urlObj.hostname;
      if (urlObj.pathname && urlObj.pathname !== '/') {
        formatted += urlObj.pathname.length > 20
          ? urlObj.pathname.substring(0, 20) + '...'
          : urlObj.pathname;
      }

      return formatted;
    } catch (e) {
      return url;
    }
  };

  // 渲染图标组件
  const renderFaviconImage = (iconUrl: string) => {
    return (
      <div className="relative bg-muted/30 rounded p-1.5 h-8 w-8 flex items-center justify-center">
        <img
          src={iconUrl}
          alt="favicon"
          className="max-w-full max-h-full rounded shadow-sm"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.innerHTML =
              '<span class="text-xs text-muted-foreground">无图标</span>';
          }}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-3xl space-y-6 bg-card rounded-lg shadow-lg p-8 border">
        <h1 className="text-3xl font-bold text-center text-foreground">Favicon同步</h1>
        <p className="text-center text-muted-foreground">
          从网站获取并同步favicon图标到Notion页面
        </p>

        {!isLoading && !progress && (
          <Button
            onClick={handleSync}
            className="w-full"
            size="lg"
          >
            开始同步
          </Button>
        )}

        {/* Progress section - shows during both loading and completion */}
        {progress && (
          <div className="space-y-6">
            {/* Progress header */}
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">
                {isLoading ? "正在同步..." : "同步完成"}
              </span>
              <span className="text-lg font-medium">{percent}%</span>
            </div>

            {/* Progress bar */}
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Timing info */}
            <div className="flex justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock size={16} />
                <span>已用时间: {formatTime(elapsedTime)}</span>
              </div>
              {estimatedTimeRemaining !== null && isLoading && (
                <div className="flex items-center gap-1.5">
                  <Hourglass size={16} />
                  <span>预计剩余: ~{formatTime(estimatedTimeRemaining)}</span>
                </div>
              )}
            </div>

            {/* Counters */}
            <div className="flex justify-between text-sm">
              <span>总计: {progress.total}</span>
              <div className="space-x-4">
                <span className={isLoading ? "text-primary" : "text-green-500"}>
                  {isLoading ? `进度: ${progress.current}/${progress.total}` : `成功: ${successCount}`}
                </span>
                {failureCount > 0 && !isLoading && (
                  <span className="text-red-500">失败: {failureCount}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Favicon status history */}
              <div className="border rounded-md overflow-hidden h-[220px] flex flex-col">
                <div className="p-3 border-b bg-muted/70">
                  <h3 className="font-medium">获取Favicon过程</h3>
                </div>
                <div
                  ref={statusHistoryRef}
                  className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300"
                >
                  {faviconStatusHistory.length > 0 ? (
                    faviconStatusHistory.map((status, index) => (
                      <div
                        key={`status-${index}`}
                        className={`p-2 border-b last:border-0 text-sm hover:bg-muted/20 
                                  ${status.stage === 'error' ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                      >
                        <div className="flex items-center space-x-2">
                          {getFaviconStatusIcon(status.stage)}
                          <div className="flex-1">
                            <span>{status.message}</span>

                            {status.stage === 'error' && (
                              <div className="mt-1 text-xs text-red-500 bg-red-50 dark:bg-red-900/10 p-1.5 rounded">
                                错误详情: {status.message}
                              </div>
                            )}

                            {status.url && (
                              <div className="text-xs text-muted-foreground mt-0.5 flex items-center">
                                <Globe size={12} className="mr-1" />
                                {formatUrl(status.url)}
                              </div>
                            )}

                            {status.iconUrl && status.stage === 'complete' && (
                              <div className="mt-1 flex items-center">
                                <div className="w-4 h-4 mr-1">
                                  <img
                                    src={status.iconUrl}
                                    alt="favicon"
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground truncate">已获取图标</span>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(status.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-muted-foreground text-sm">
                      尚无处理记录
                    </div>
                  )}
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <AlertCircle size={16} />
                    <span>错误: {error}</span>
                  </div>
                </div>
              )}

              {/* Detailed item status list */}
              <div className="space-y-0 border rounded-md overflow-hidden h-[360px] flex flex-col">
                <div className="sticky top-0 p-3 border-b bg-muted/70 z-10">
                  <h3 className="font-medium">详细列表</h3>
                </div>
                <div className="overflow-y-auto flex-1" ref={detailsListRef}>
                  {/* Items that are waiting or in process */}
                  {isLoading && progress.total > 0 && Array.from({ length: progress.total }).map((_, index) => {
                    const isActive = index === activeItemIndex;
                    const isPending = index > activeItemIndex;
                    const isCompleted = index < activeItemIndex;
                    const url = urlMap[index];
                    const iconUrl = completedIcons[index];

                    return (
                      <div
                        key={`pending-${index}`}
                        data-index={index}
                        className={`flex items-center justify-between p-3 text-sm border-b last:border-0 ${isActive ? "bg-blue-50 dark:bg-blue-900/20" : ""} transition-colors duration-300`}
                      >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          {isActive && (
                            <Loader2 size={16} className="animate-spin text-blue-500 flex-shrink-0" />
                          )}
                          {isCompleted && (
                            <Check size={16} className="text-green-500 flex-shrink-0" />
                          )}
                          {isPending && (
                            <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                            </div>
                          )}
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className={isPending ? "text-muted-foreground" : ""}>
                              {isActive ? "处理中" : isPending ? "等待中" : "已完成"} #{index + 1}
                            </span>

                            {/* 显示URL，如果可用 */}
                            {url && (
                              <span className="text-xs text-muted-foreground truncate flex items-center mt-0.5">
                                <Link2 size={12} className="mr-1 flex-shrink-0" />
                                {formatUrl(url)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 为已完成项显示图标 */}
                        {isCompleted && iconUrl && (
                          <div className="flex items-center ml-2">
                            {renderFaviconImage(iconUrl)}
                          </div>
                        )}

                        {isActive && (
                          <motion.div
                            className="text-blue-500 text-xs whitespace-nowrap"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            进行中
                          </motion.div>
                        )}
                      </div>
                    );
                  })}

                  {/* Completed items with results */}
                  {!isLoading && progress.completed.map((item, index) => (
                    <div
                      key={`result-${index}`}
                      className="flex items-center justify-between p-3 text-sm border-b last:border-0 hover:bg-muted/30"
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {item.success ? (
                          <Check size={16} className="text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle size={16} className="text-red-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.title || `项目 #${index + 1}`}</div>

                          {/* 显示URL，如果可用 */}
                          {urlMap[index] && (
                            <div className="text-xs text-muted-foreground truncate flex items-center mt-0.5">
                              <Link2 size={12} className="mr-1 flex-shrink-0" />
                              <a
                                href={urlMap[index]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {formatUrl(urlMap[index])}
                              </a>
                            </div>
                          )}

                          {/* 显示错误信息，如果有 */}
                          {item.error && (
                            <div className="text-xs text-red-500 mt-1 bg-red-50 dark:bg-red-900/10 px-1.5 py-1 rounded max-w-full overflow-hidden">
                              <div className="truncate">{item.error}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 显示图标 */}
                      {item.iconUrl && (
                        <div className="flex items-center ml-2">
                          {renderFaviconImage(item.iconUrl)}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 显示无内容的提示 */}
                  {progress.total === 0 && (
                    <div className="p-4 text-center text-muted-foreground">
                      暂无数据
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              {isLoading ? (
                <>
                  <Button
                    onClick={handleCancel}
                    className="w-full"
                    size="lg"
                    variant="destructive"
                  >
                    取消同步
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleSync}
                  className="w-full"
                  size="lg"
                >
                  重新同步
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 