import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';

export const useJourneyNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const back = useCallback(() => {
    // 如果没有历史记录（例如直接从外部链接进入），则返回首页
    if (window.history.length <= 1 || location.key === 'default') {
      navigate('/', { replace: true });
    } else {
      navigate(-1);
    }
  }, [navigate, location]);

  const toHome = useCallback(() => navigate('/'), [navigate]);
  const toTimeline = useCallback(() => navigate('/timeline'), [navigate]);
  const toNotebooks = useCallback(() => navigate('/notebooks'), [navigate]);
  const toDiary = useCallback((id: string | number) => navigate(`/diaries/${id}`), [navigate]);
  const toEdit = useCallback((id: string | number) => navigate(`/edit/${id}`), [navigate]);
  const toWrite = useCallback((notebookId?: string | number) => {
    navigate('/write', { state: { notebookId } });
  }, [navigate]);
  const toSearch = useCallback(() => navigate('/search'), [navigate]);
  const toSettings = useCallback(() => navigate('/settings'), [navigate]);
  const toStats = useCallback(() => navigate('/stats'), [navigate]);

  return {
    back,
    toHome,
    toTimeline,
    toNotebooks,
    toDiary,
    toEdit,
    toWrite,
    toSearch,
    toSettings,
    toStats,
    // 暴露原生的 navigate 以备特殊需求
    navigate
  };
};
