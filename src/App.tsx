import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { AboutPage } from './pages/AboutPage';
import { SecurityPage } from './pages/SecurityPage';
import { StudentLoginPage } from './pages/StudentLoginPage';
import { StudentRegisterPage } from './pages/StudentRegisterPage';
import { ResolverLoginPage } from './pages/ResolverLoginPage';
import { ResolverRegisterPage } from './pages/ResolverRegisterPage';

// Student Pages
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { StudentReportIssuePage } from './pages/StudentReportIssuePage';
import { StudentIssuesPage } from './pages/StudentIssuesPage';
import { StudentIssueDetailsPage } from './pages/StudentIssueDetailsPage';
import { StudentTrackPage } from './pages/StudentTrackPage';
import { StudentProfilePage } from './pages/StudentProfilePage';
import { StudentSettingsPage } from './pages/StudentSettingsPage';

// Resolver Pages
import { ResolverDashboardPage } from './pages/ResolverDashboardPage';
import { ResolverIssuesPage } from './pages/ResolverIssuesPage';
import { ResolverIssueDetailsPage } from './pages/ResolverIssueDetailsPage';
import { ResolverAnalyticsPage } from './pages/ResolverAnalyticsPage';
import { ResolverProfilePage } from './pages/ResolverProfilePage';
import { ResolverSettingsPage } from './pages/ResolverSettingsPage';

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              {/* Public Routes with Navbar & Footer */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/security" element={<SecurityPage />} />
                <Route path="/student/login" element={<StudentLoginPage />} />
                <Route path="/student/register" element={<StudentRegisterPage />} />
                <Route path="/resolver/login" element={<ResolverLoginPage />} />
                <Route path="/resolver/register" element={<ResolverRegisterPage />} />
              </Route>

              {/* Protected Student Portal Routes */}
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

              {/* Protected Resolver Administration Portal Routes */}
              <Route element={<ProtectedRoute allowedRole="resolver" />}>
                <Route element={<AppLayout role="resolver" />}>
                  <Route path="/resolver/dashboard" element={<ResolverDashboardPage />} />
                  <Route path="/resolver/issues" element={<ResolverIssuesPage />} />
                  <Route path="/resolver/issues/:id" element={<ResolverIssueDetailsPage />} />
                  <Route path="/resolver/analytics" element={<ResolverAnalyticsPage />} />
                  <Route path="/resolver/profile" element={<ResolverProfilePage />} />
                  <Route path="/resolver/settings" element={<ResolverSettingsPage />} />
                </Route>
              </Route>

              {/* Catch-all Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </Router>
  );
}
