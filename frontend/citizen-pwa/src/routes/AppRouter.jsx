import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { LoadingScreen } from '@/components/LoadingScreen';

// Route-level code splitting: each screen (and its heavy deps — Leaflet maps, forms, etc.)
// loads on demand, keeping the initial app-shell bundle small. Named exports are adapted
// to the default export that React.lazy expects.
const lazyNamed = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));

const Home = lazyNamed(() => import('@/pages/Home'), 'Home');
const PublicHome = lazyNamed(() => import('@/pages/PublicHome'), 'PublicHome');
const VerifyCertificate = lazyNamed(() => import('@/pages/VerifyCertificate'), 'VerifyCertificate');
const Directory = lazyNamed(() => import('@/pages/Directory'), 'Directory');
const Help = lazyNamed(() => import('@/pages/Help'), 'Help');
const NotFound = lazyNamed(() => import('@/pages/NotFound'), 'NotFound');
const Login = lazyNamed(() => import('@/features/auth/pages/Login'), 'Login');
const Register = lazyNamed(() => import('@/features/auth/pages/Register'), 'Register');
const Profile = lazyNamed(() => import('@/features/auth/pages/Profile'), 'Profile');
const ComplaintHistory = lazyNamed(
  () => import('@/features/complaints/pages/ComplaintHistory'),
  'ComplaintHistory',
);
const NewComplaint = lazyNamed(
  () => import('@/features/complaints/pages/NewComplaint'),
  'NewComplaint',
);
const ComplaintDetail = lazyNamed(
  () => import('@/features/complaints/pages/ComplaintDetail'),
  'ComplaintDetail',
);
const NoticeList = lazyNamed(() => import('@/features/notices/pages/NoticeList'), 'NoticeList');
const NoticeDetail = lazyNamed(
  () => import('@/features/notices/pages/NoticeDetail'),
  'NoticeDetail',
);
const SchemeList = lazyNamed(() => import('@/features/schemes/pages/SchemeList'), 'SchemeList');
const SchemeDetail = lazyNamed(
  () => import('@/features/schemes/pages/SchemeDetail'),
  'SchemeDetail',
);
const TaxSummary = lazyNamed(() => import('@/features/tax/pages/TaxSummary'), 'TaxSummary');
const Meetings = lazyNamed(() => import('@/features/governance/pages/Meetings'), 'Meetings');
const Projects = lazyNamed(() => import('@/features/governance/pages/Projects'), 'Projects');
const Polls = lazyNamed(() => import('@/features/governance/pages/Polls'), 'Polls');
const Downloads = lazyNamed(() => import('@/features/governance/pages/Downloads'), 'Downloads');
const ApplicationList = lazyNamed(
  () => import('@/features/dakhala/pages/ApplicationList'),
  'ApplicationList',
);
const ApplyCertificate = lazyNamed(
  () => import('@/features/dakhala/pages/ApplyCertificate'),
  'ApplyCertificate',
);
const ApplicationDetail = lazyNamed(
  () => import('@/features/dakhala/pages/ApplicationDetail'),
  'ApplicationDetail',
);
const NotificationCenter = lazyNamed(
  () => import('@/features/notifications/pages/NotificationCenter'),
  'NotificationCenter',
);
const NotificationDetail = lazyNamed(
  () => import('@/features/notifications/pages/NotificationDetail'),
  'NotificationDetail',
);
const NotificationSettings = lazyNamed(
  () => import('@/features/notifications/pages/NotificationSettings'),
  'NotificationSettings',
);
const Settings = lazyNamed(() => import('@/features/settings/pages/Settings'), 'Settings');

// Suspense wrapper so a lazily-loaded route shows a spinner while its chunk downloads.
const page = (element) => <Suspense fallback={<LoadingScreen />}>{element}</Suspense>;

const router = createBrowserRouter([
  // Public village landing — the entry point for signed-out visitors (no app shell).
  { path: '/welcome', element: page(<PublicHome />) },
  // Public certificate verification (QR target + manual lookup) — no auth, no app shell.
  { path: '/verify', element: page(<VerifyCertificate />) },
  { path: '/verify/:id', element: page(<VerifyCertificate />) },
  // Public Gram Panchayat directory (leadership + office contact) — no auth, no app shell.
  { path: '/directory', element: page(<Directory />) },
  // Public auth screens (no app shell / bottom nav).
  { path: '/login', element: page(<Login />) },
  { path: '/register', element: page(<Register />) },

  // Everything else requires a session.
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: page(<Home />) },
          { path: 'complaints', element: page(<ComplaintHistory />) },
          { path: 'complaints/new', element: page(<NewComplaint />) },
          { path: 'complaints/:id', element: page(<ComplaintDetail />) },
          { path: 'notices', element: page(<NoticeList />) },
          { path: 'notices/:id', element: page(<NoticeDetail />) },
          { path: 'schemes', element: page(<SchemeList />) },
          { path: 'schemes/:id', element: page(<SchemeDetail />) },
          { path: 'tax', element: page(<TaxSummary />) },
          { path: 'meetings', element: page(<Meetings />) },
          { path: 'projects', element: page(<Projects />) },
          { path: 'polls', element: page(<Polls />) },
          /*
           * Feedback is withdrawn from the citizen product. The API, the stored
           * feedback and the officer analytics all stay — this removes the route a
           * citizen could reach, not the feature's data or its administrative half.
           */
          { path: 'downloads', element: page(<Downloads />) },
          { path: 'dakhala', element: page(<ApplicationList />) },
          { path: 'dakhala/new', element: page(<ApplyCertificate />) },
          { path: 'dakhala/:id', element: page(<ApplicationDetail />) },
          { path: 'notifications', element: page(<NotificationCenter />) },
          { path: 'notifications/settings', element: page(<NotificationSettings />) },
          { path: 'notifications/:id', element: page(<NotificationDetail />) },
          { path: 'settings', element: page(<Settings />) },
          { path: 'help', element: page(<Help />) },
          { path: 'profile', element: page(<Profile />) },
          { path: '*', element: page(<NotFound />) },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
