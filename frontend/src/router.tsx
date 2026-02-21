import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import AppLayout from './components/AppLayout'
import LoginView from './views/LoginView'

// Lazy load views
const HomeView = lazy(() => import('./views/HomeView'))
const TimelineView = lazy(() => import('./views/TimelineView'))
const NotebooksListView = lazy(() => import('./views/NotebooksListView'))
const NotebookDetailView = lazy(() => import('./views/NotebookDetailView'))
const DiaryDetailView = lazy(() => import('./views/DiaryDetailView'))
const StatsView = lazy(() => import('./views/StatsView'))
const SettingsView = lazy(() => import('./views/SettingsView'))
const SearchView = lazy(() => import('./views/SearchView'))
const WriteView = lazy(() => import('./views/WriteView'))
const EditView = lazy(() => import('./views/EditView'))
const SharesView = lazy(() => import('./views/SharesView'))
const ShareView = lazy(() => import('./views/ShareView'))

// Loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-12 h-12 border-4 border-[#6ebeea]/30 border-t-[#6ebeea] rounded-full animate-spin" />
    </div>
  )
}

// Full page loader for editor routes
function FullPageLoader() {
  return (
    <div className="fixed inset-0 bg-[#f2f4f2] z-[200] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#6ebeea]/30 border-t-[#6ebeea] rounded-full animate-spin" />
    </div>
  )
}

// Auth guard wrapper
function AuthGuard() {
  const token = localStorage.getItem('token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginView />,
  },
  {
    path: '/share/:token',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ShareView />
      </Suspense>
    ),
  },
  {
    element: <AuthGuard />,
    children: [
      // Editor routes (full screen, outside AppLayout)
      {
        path: '/write',
        element: (
          <Suspense fallback={<FullPageLoader />}>
            <WriteView />
          </Suspense>
        ),
      },
      {
        path: '/edit/:id',
        element: (
          <Suspense fallback={<FullPageLoader />}>
            <EditView />
          </Suspense>
        ),
      },
      // Main app routes (inside AppLayout)
      {
        element: <AppLayout />,
        children: [
          {
            path: '/',
            element: (
              <Suspense fallback={<PageLoader />}>
                <HomeView />
              </Suspense>
            ),
          },
          {
            path: '/timeline',
            element: (
              <Suspense fallback={<PageLoader />}>
                <TimelineView />
              </Suspense>
            ),
          },
          {
            path: '/notebooks',
            element: (
              <Suspense fallback={<PageLoader />}>
                <NotebooksListView />
              </Suspense>
            ),
          },
          {
            path: '/notebooks/:id',
            element: (
              <Suspense fallback={<PageLoader />}>
                <NotebookDetailView />
              </Suspense>
            ),
          },
          {
            path: '/diaries/:id',
            element: (
              <Suspense fallback={<PageLoader />}>
                <DiaryDetailView />
              </Suspense>
            ),
          },
          {
            path: '/stats',
            element: (
              <Suspense fallback={<PageLoader />}>
                <StatsView />
              </Suspense>
            ),
          },
          {
            path: '/settings',
            element: (
              <Suspense fallback={<PageLoader />}>
                <SettingsView />
              </Suspense>
            ),
          },
          {
            path: '/search',
            element: (
              <Suspense fallback={<PageLoader />}>
                <SearchView />
              </Suspense>
            ),
          },
          {
            path: '/shares',
            element: (
              <Suspense fallback={<PageLoader />}>
                <SharesView />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
])