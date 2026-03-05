import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UIState {
  // 路径或ID -> 滚动位置(px)
  scrollPositions: Record<string, number>;
  // 日记ID -> 阅读百分比(0-1)
  readingPositions: Record<string, number>;
  
  // Timeline 状态
  timelineMode: 'stream' | 'calendar';
  timelineFilterId: number | undefined;
  
  // 日历组件状态 (用于全局或多个视图同步)
  calendarViewDate: string; // ISO string for the first day of the month
  
  setScrollPosition: (path: string, position: number) => void;
  setReadingPosition: (diaryId: string | number, percent: number) => void;
  setTimelineMode: (mode: 'stream' | 'calendar') => void;
  setTimelineFilterId: (id: number | undefined) => void;
  setCalendarViewDate: (date: string) => void;
  clearAll: () => void;
}

export const useJourneyStore = create<UIState>()(
  persist(
    (set) => ({
      scrollPositions: {},
      readingPositions: {},
      timelineMode: 'stream',
      timelineFilterId: undefined,
      calendarViewDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),

      setScrollPosition: (path, position) => 
        set((state) => ({ 
          scrollPositions: { ...state.scrollPositions, [path]: position } 
        })),

      setReadingPosition: (diaryId, percent) => 
        set((state) => ({ 
          readingPositions: { ...state.readingPositions, [String(diaryId)]: percent } 
        })),

      setTimelineMode: (mode) => set({ timelineMode: mode }),
      setTimelineFilterId: (id) => set({ timelineFilterId: id }),
      setCalendarViewDate: (date) => set({ calendarViewDate: date }),

      clearAll: () => set({ 
        scrollPositions: {}, 
        readingPositions: {}, 
        timelineMode: 'stream', 
        timelineFilterId: undefined,
        calendarViewDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      }),
    }),
    {
      name: 'journey-ui-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
