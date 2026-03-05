import { useLayoutEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useJourneyStore } from '../lib/store';

/**
 * useScrollPreservation - 高性能滚动位置恢复
 * 解决了滚动时触发全局重渲染的问题
 */
export const useScrollPreservation = (containerRef: React.RefObject<HTMLElement>, key?: string) => {
  const location = useLocation();
  const targetKey = key || location.pathname;
  
  const timerRef = useRef<number | null>(null);
  const restoredRef = useRef(false);

  const savePosition = useCallback(() => {
    if (containerRef.current) {
      const pos = containerRef.current.scrollTop;
      // 使用 getState().set... 而不是通过 hook 订阅，这样保存时不会触发重渲染
      useJourneyStore.getState().setScrollPosition(targetKey, pos);
    }
  }, [containerRef, targetKey]);

  // 监听滚动进行保存 (防抖)
  const handleScroll = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(savePosition, 100);
  }, [savePosition]);

  // 恢复位置逻辑：直接从 store 获取最新位置，确保路由切换后能获取正确的值
  const restorePosition = useCallback((customPos?: number) => {
    if (containerRef.current) {
      const pos = customPos ?? useJourneyStore.getState().scrollPositions[targetKey] ?? 0;
      containerRef.current.scrollTo({ top: pos, behavior: 'instant' });
    }
  }, [containerRef, targetKey]);

  // 使用 ResizeObserver 智能恢复：等待容器高度足够时恢复
  useLayoutEffect(() => {
    restoredRef.current = false;
    const container = containerRef.current;
    if (!container) return;

    const targetPos = useJourneyStore.getState().scrollPositions[targetKey] ?? 0;
    if (targetPos === 0) {
      restoredRef.current = true;
      return;
    }

    // 恢复前隐藏容器内容
    const originalVisibility = container.style.visibility;
    container.style.visibility = 'hidden';

    // 超时保护：确保即使数据加载失败，容器也会显示
    const timeoutId = window.setTimeout(() => {
      if (!restoredRef.current) {
        container.style.visibility = originalVisibility;
        restoredRef.current = true;
      }
    }, 200); // 2秒超时

    const tryRestore = () => {
      if (restoredRef.current) return;
      
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll >= targetPos) {
        container.scrollTo({ top: targetPos, behavior: 'instant' });
        container.style.visibility = originalVisibility;
        restoredRef.current = true;
        window.clearTimeout(timeoutId);
      }
    };

    // 立即尝试恢复（处理有缓存数据的情况）
    tryRestore();

    // 使用 ResizeObserver 监听内容高度变化
    const resizeObserver = new ResizeObserver(() => {
      tryRestore();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      window.clearTimeout(timeoutId);
      container.style.visibility = originalVisibility;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [containerRef, targetKey]);

  return { handleScroll, restorePosition };
};
