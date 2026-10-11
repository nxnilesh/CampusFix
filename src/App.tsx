import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Public Pages
import { LandingPage } from './pages/LandingPage';
const AboutPage = lazy(() => import('./pages/AboutPage').then((module) => ({ default: module.AboutPage })));
const SecurityPage = lazy(() => import('./pages/SecurityPage').then((module) => ({ default: module.SecurityPage })));
const StudentLoginPage = lazy(() => import('./pages/StudentLoginPage').then((module) => ({ default: module.StudentLoginPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })));
const StudentRegisterPage = lazy(() => import('./pages/StudentRegisterPage').then((module) => ({ default: module.StudentRegisterPage })));
const ResolverLoginPage = lazy(() => import('./pages/ResolverLoginPage').then((module) => ({ default: module.ResolverLoginPage })));
const ResolverRegisterPage = lazy(() => import('./pages/ResolverRegisterPage').then((module) => ({ default: module.ResolverRegisterPage })));
const PublicTransparencyPage = lazy(() => import('./pages/PublicTransparencyPage').then((module) => ({ default: module.PublicTransparencyPage })));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage').then((module) => ({ default: module.AdminLoginPage })));

// Student Pages
const StudentDashboardPage = lazy(() => import('./pages/StudentDashboardPage').then((module) => ({ default: module.StudentDashboardPage })));
const StudentReportIssuePage = lazy(() => import('./pages/StudentReportIssuePage').then((module) => ({ default: module.StudentReportIssuePage })));
const StudentIssuesPage = lazy(() => import('./pages/StudentIssuesPage').then((module) => ({ default: module.StudentIssuesPage })));
const StudentIssueDetailsPage = lazy(() => import('./pages/StudentIssueDetailsPage').then((module) => ({ default: module.StudentIssueDetailsPage })));
const StudentTrackPage = lazy(() => import('./pages/StudentTrackPage').then((module) => ({ default: module.StudentTrackPage })));
const StudentProfilePage = lazy(() => import('./pages/StudentProfilePage').then((module) => ({ default: module.StudentProfilePage })));
const StudentSettingsPage = lazy(() => import('./pages/StudentSettingsPage').then((module) => ({ default: module.StudentSettingsPage })));

// Resolver Pages
const ResolverDashboardPage = lazy(() => import('./pages/ResolverDashboardPage').then((module) => ({ default: module.ResolverDashboardPage })));
const ResolverPasswordChangePage = lazy(() => import('./pages/ResolverPasswordChangePage').then((module) => ({ default: module.ResolverPasswordChangePage })));
const ResolverIssuesPage = lazy(() => import('./pages/ResolverIssuesPage').then((module) => ({ default: module.ResolverIssuesPage })));
const ResolverIssueDetailsPage = lazy(() => import('./pages/ResolverIssueDetailsPage').then((module) => ({ default: module.ResolverIssueDetailsPage })));
const ResolverAnalyticsPage = lazy(() => import('./pages/ResolverAnalyticsPage').then((module) => ({ default: module.ResolverAnalyticsPage })));
const ResolverProfilePage = lazy(() => import('./pages/ResolverProfilePage').then((module) => ({ default: module.ResolverProfilePage })));
const ResolverSettingsPage = lazy(() => import('./pages/ResolverSettingsPage').then((module) => ({ default: module.ResolverSettingsPage })));

// Admin Pages — private portal, not linked publicly
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })));
const AdminApplicationsPage = lazy(() => import('./pages/AdminApplicationsPage').then((module) => ({ default: module.AdminApplicationsPage })));
const AdminIssuesPage = lazy(() => import('./pages/AdminIssuesPage').then((module) => ({ default: module.AdminIssuesPage })));
const AdminLogsPage = lazy(() => import('./pages/AdminLogsPage').then((module) => ({ default: module.AdminLogsPage })));
const AppLayout = lazy(() => import('./layouts/AppLayout').then((module) => ({ default: module.AppLayout })));

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#ececee] dark:bg-[#0a0a0c]">
                  <span className="w-6 h-6 rounded-full border-2 border-[#ff3b00] border-t-transparent animate-spin" />
                </div>
              }
            >
            <Routes>
              {/* ================================================================
                  Public Routes — visible to everyone
                  ================================================================ */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/security" element={<SecurityPage />} />
                <Route path="/transparency" element={<PublicTransparencyPage />} />
                <Route path="/student/login" element={<StudentLoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/student/register" element={<StudentRegisterPage />} />
                {/* Resolver login — not in nav but accessible for existing resolvers */}
                <Route path="/resolver/login" element={<ResolverLoginPage />} />
                {/* Independent staff registration; resolver access remains admin-approved. */}
                <Route path="/resolver/register" element={<ResolverRegisterPage />} />
                <Route path="/become-a-resolver" element={<ResolverRegisterPage />} />
              </Route>

              <Route path="/admin/login" element={<AdminLoginPage />} />

              {/* ================================================================
                  Protected Student Portal Routes
                  ================================================================ */}
              <Route element={<ProtectedRoute allowedRole="student" />}>
                <Route element={<AppLayout role="student" />}>
                  <Route path="/student/dashboard" element={<StudentDashboardPage />} />
                  <Route path="/student/report" element={<StudentReportIssuePage />} />
                  <Route path="/student/issues" element={<StudentIssuesPage />} />
                  <Route path="/student/issues/:id" element={<StudentIssueDetailsPage />} />
                  <Route path="/student/track" element={<StudentTrackPage />} />
                  <Route path="/student/profile" element={<StudentProfilePage />} />
                  <Route path="/student/settings" element={<StudentSettingsPage />} />
                </Route>
              </Route>

              {/* ================================================================
                  Protected Resolver Portal Routes
                  ================================================================ */}
              <Route element={<ProtectedRoute allowedRole="resolver" />}>
                <Route element={<AppLayout role="resolver" />}>
                  <Route path="/resolver/dashboard" element={<ResolverDashboardPage />} />
                  <Route path="/resolver/change-password" element={<ResolverPasswordChangePage />} />
                  <Route path="/resolver/issues" element={<ResolverIssuesPage />} />
                  <Route path="/resolver/issues/:id" element={<ResolverIssueDetailsPage />} />
                  <Route path="/resolver/analytics" element={<ResolverAnalyticsPage />} />
                  <Route path="/resolver/profile" element={<ResolverProfilePage />} />
                  <Route path="/resolver/settings" element={<ResolverSettingsPage />} />
                </Route>
              </Route>

              {/* Private admin routes. All pages require the authenticated admin role. */}
              <Route element={<ProtectedRoute allowedRole="admin" />}>
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="/admin/applications" element={<AdminApplicationsPage />} />
                <Route path="/admin/students" element={<AdminUsersPage roleFilter="student" />} />
                <Route path="/admin/resolvers" element={<AdminUsersPage roleFilter="resolver" />} />
                <Route path="/admin/issues" element={<AdminIssuesPage />} />
                <Route path="/admin/logs" element={<AdminLogsPage />} />

                {/* Keep existing private URLs working for bookmarked admin pages. */}
                <Route path="/admin-panel" element={<AdminDashboardPage />} />
                <Route path="/admin-panel/students" element={<AdminUsersPage roleFilter="student" />} />
                <Route path="/admin-panel/resolvers" element={<AdminUsersPage roleFilter="resolver" />} />
                <Route path="/admin-panel/applications" element={<AdminApplicationsPage />} />
                <Route path="/admin-panel/issues" element={<AdminIssuesPage />} />
                <Route path="/admin-panel/logs" element={<AdminLogsPage />} />
                <Route path="/admin-panel/*" element={<Navigate to="/admin-panel" replace />} />
              </Route>

              {/* Catch-all Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </Router>
  );
}
