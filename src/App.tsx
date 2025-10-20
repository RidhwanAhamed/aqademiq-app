import React, { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SecurityHeaders } from "@/components/SecurityHeaders";
import { OptimizedSecurityMonitor } from "@/components/OptimizedSecurityMonitor";
import { queryClient } from "@/config/queryClient";

// Lazy load heavy components for better performance
const Calendar = lazy(() => import("./pages/Calendar"));
const Ada = lazy(() => import("./pages/Ada"));
const Analytics = lazy(() => import("./pages/AdvancedAnalytics"));
const Marketplace = lazy(() => import("./pages/Marketplace"));

// Import all auth and core page components
import Index from "./pages/Index";
import Welcome from "./pages/Welcome";
import Onboarding from "./pages/Onboarding";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import EmailVerification from "./pages/EmailVerification";
import PasswordResetConfirm from "./pages/PasswordResetConfirm";
import Courses from "./pages/Courses";
import Assignments from "./pages/Assignments";
import Timer from "./pages/Timer";
import Settings from "./pages/Settings";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <SecurityHeaders />
            <OptimizedSecurityMonitor />
            <Toaster />
            <Sonner />
            <BrowserRouter>
          <Routes>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/verify" element={<EmailVerification />} />
            <Route path="/auth/reset-password" element={<PasswordResetConfirm />} />
            <Route path="/install" element={<Install />} />
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Index />} />
              <Route path="calendar" element={
                <Suspense fallback={<div>Loading Calendar...</div>}>
                  <Calendar />
                </Suspense>
              } />
              <Route path="ada" element={
                <Suspense fallback={<div>Loading Ada...</div>}>
                  <Ada />
                </Suspense>
              } />
              <Route path="marketplace" element={
                <Suspense fallback={<div>Loading Marketplace...</div>}>
                  <Marketplace />
                </Suspense>
              } />
              <Route path="courses" element={<Courses />} />
              <Route path="assignments" element={<Assignments />} />
              <Route path="timer" element={<Timer />} />
              <Route path="analytics" element={
                <Suspense fallback={<div>Loading Analytics...</div>}>
                  <Analytics />
                </Suspense>
              } />
              <Route path="settings" element={<Settings />} />
            </Route>
            {/* Catch-all route for 404 page */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
