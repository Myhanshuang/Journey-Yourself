import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useJourneyNavigation } from '../hooks/useJourneyNavigation';
import { useLocation } from 'react-router-dom';

export const NavigationHandler = ({ children }: { children: React.ReactNode }) => {
  const { back } = useJourneyNavigation();
  const location = useLocation();

  useEffect(() => {
    // 监听 Android 物理返回键
    const handleBackButton = async () => {
      // 如果在首页，可以让应用最小化或者不做操作（取决于需求）
      // 这里统一调用抽象好的 back 逻辑
      if (location.pathname === '/' || location.pathname === '/login') {
        // 在首页按返回键，通常应由系统默认处理（通常是退出应用）
        // 如果想让它直接退出，可以不处理或者显式调用 App.exitApp()
        return;
      }
      back();
    };

    const listener = App.addListener('backButton', (data) => {
      if (!data.canGoBack) {
        // 如果系统认为不能返回了，我们也不强行介入
        return;
      }
      handleBackButton();
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [back, location.pathname]);

  return <>{children}</>;
};
