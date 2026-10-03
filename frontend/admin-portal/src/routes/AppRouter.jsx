import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ProtectedRoute } from './ProtectedRoute';

// Route-level code splitting: each screen loads on demand, keeping the initial bundle lean.
const lazyNamed = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));

const Home = lazyNamed(() => import('@/pages/Home'), 'Home');
const NotFound = lazyNamed(() => import('@/pages/NotFound'), 'NotFound');
const Login = lazyNamed(() => import('@/features/auth/Login'), 'Login');
const AuthCallback = lazyNamed(() => import('@/features/auth/AuthCallback'), 'AuthCallback');
const ComplaintsList = lazyNamed(
  () => import('@/features/complaints/ComplaintsList'),
  'ComplaintsList',
);
const ComplaintDetail = lazyNamed(
  () => import('@/features/complaints/ComplaintDetail'),
  'ComplaintDetail',
);
const NoticesList = lazyNamed(() => import('@/features/notices/NoticesList'), 'NoticesList');
const NoticeForm = lazyNamed(() => import('@/features/notices/NoticeForm'), 'NoticeForm');
const SchemesList = lazyNamed(() => import('@/features/schemes/SchemesList'), 'SchemesList');
const SchemeForm = lazyNamed(() => import('@/features/schemes/SchemeForm'), 'SchemeForm');
const TaxList = lazyNamed(() => import('@/features/tax/TaxList'), 'TaxList');
const TaxForm = lazyNamed(() => import('@/features/tax/TaxForm'), 'TaxForm');
const TaxDetail = lazyNamed(() => import('@/features/tax/TaxDetail'), 'TaxDetail');
const CertificateList = lazyNamed(
  () => import('@/features/dakhala/CertificateList'),
  'CertificateList',
);
const CertificateReview = lazyNamed(
  () => import('@/features/dakhala/CertificateReview'),
  'CertificateReview',
);
const UsersList = lazyNamed(() => import('@/features/users/UsersList'), 'UsersList');
const UserProfile = lazyNamed(() => import('@/features/users/UserProfile'), 'UserProfile');
const ReportsPage = lazyNamed(() => import('@/features/reports/ReportsPage'), 'ReportsPage');
const AuditLogPage = lazyNamed(() => import('@/features/audit/AuditLogPage'), 'AuditLogPage');
const Help = lazyNamed(() => import('@/pages/Help'), 'Help');
const VillageProfilePage = lazyNamed(
  () => import('@/features/village/VillageProfilePage'),
  'VillageProfilePage',
);
const EventsPage = lazyNamed(() => import('@/features/village/EventsPage'), 'EventsPage');
const MeetingsAdmin = lazyNamed(
  () => import('@/features/governance/MeetingsAdmin'),
  'MeetingsAdmin',
);
const TimetableAdmin = lazyNamed(
  () => import('@/features/timetable/TimetableAdmin'),
  'TimetableAdmin',
);
const ProjectsAdmin = lazyNamed(
  () => import('@/features/governance/ProjectsAdmin'),
  'ProjectsAdmin',
);
const PollsAdmin = lazyNamed(() => import('@/features/governance/PollsAdmin'), 'PollsAdmin');

const page = (element) => <Suspense fallback={<LoadingScreen />}>{element}</Suspense>;

const router = createBrowserRouter([
  { path: '/login', element: page(<Login />) },
  // Shared-login hand-off target: receives the officer JWT in the URL fragment.
  { path: '/auth/callback', element: page(<AuthCallback />) },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <DashboardLayout />,
        children: [
          { index: true, element: page(<Home />) },
          { path: 'complaints', element: page(<ComplaintsList />) },
          { path: 'complaints/:id', element: page(<ComplaintDetail />) },
          { path: 'notices', element: page(<NoticesList />) },
          { path: 'notices/new', element: page(<NoticeForm />) },
          { path: 'notices/:id/edit', element: page(<NoticeForm />) },
          { path: 'schemes', element: page(<SchemesList />) },
          { path: 'schemes/new', element: page(<SchemeForm />) },
          { path: 'schemes/:id/edit', element: page(<SchemeForm />) },
          { path: 'tax', element: page(<TaxList />) },
          { path: 'tax/new', element: page(<TaxForm />) },
          { path: 'tax/:id', element: page(<TaxDetail />) },
          { path: 'dakhala', element: page(<CertificateList />) },
          { path: 'dakhala/:id', element: page(<CertificateReview />) },
          { path: 'users', element: page(<UsersList />) },
          { path: 'users/:id', element: page(<UserProfile />) },
          { path: 'reports', element: page(<ReportsPage />) },
          { path: 'audit', element: page(<AuditLogPage />) },
          { path: 'village', element: page(<VillageProfilePage />) },
          { path: 'events', element: page(<EventsPage />) },
          { path: 'meetings', element: page(<MeetingsAdmin />) },
          { path: 'timetable', element: page(<TimetableAdmin />) },
          { path: 'projects', element: page(<ProjectsAdmin />) },
          { path: 'polls', element: page(<PollsAdmin />) },
          { path: 'help', element: page(<Help />) },
          { path: '*', element: page(<NotFound />) },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
