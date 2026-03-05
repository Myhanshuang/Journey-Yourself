import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useJourneyStore } from '../lib/store';

/**
 * useScrollPreservation - 高性能滚动位置恢复
 * 解决了滚动时触发全局重渲染的问题
 */
export const useScrollPreservation = (containerRef: React.RefObject<HTMLElement>, key?: string) => {
  const location = useLocation();
  const targetKey = key || location.pathname;
  
  // 仅在组件挂载时获取一次初始位置，避免响应式订阅导致的性能问题
  const initialPos = useRef(useJourneyStore.getState().scrollPositions[targetKey] || 0);
  const timerRef = useRef<number | null>(null);

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

  // 恢复位置逻辑：对外暴露，让子组件在数据加载完成后手动触发
  const restorePosition = useCallback((customPos?: number) => {
    if (containerRef.current) {
      const pos = customPos ?? initialPos.current;
      containerRef.current.scrollTo({ top: pos, behavior: 'instant' });
    }
  }, [containerRef]);

  // 默认恢复（用于列表页）
  useEffect(() => {
    const timeout = setTimeout(restorePosition, 50);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      clearTimeout(timeout);
    };
  }, [restorePosition, targetKey]);

  return { handleScroll, restorePosition };
};
