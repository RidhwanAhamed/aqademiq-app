import React, { Suspense, useState, useEffect } from 'react';
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
import { useThemeInit } from "@/hooks/useThemeInit";
import { useCapacitorInit } from "@/hooks/useCapacitorInit";
import { offlineLazy } from "@/utils/offlineLazyLoader";
import { OfflineSuspenseFallback } from "@/components/OfflineSuspenseFallback";
import { OfflineFirstProvider } from "@/components/OfflineFirstProvider";
import { AnimatedSplash } from "@/components/AnimatedSplash";

// Theme and Capacitor initialization component
function AppInitializer({ children }: { children: React.ReactNode }) {
  useThemeInit();
  useCapacitorInit();
  return <>{children}</>;
}

// Use offline-aware lazy loading for heavy routes
const Calendar = offlineLazy(() => import("./pages/Calendar"));
const Ada = offlineLazy(() => import("./pages/Ada"));
const AboutAdaAI = offlineLazy(() => import("./pages/AboutAdaAI"));
const Analytics = offlineLazy(() => import("./pages/AdvancedAnalytics"));
const Marketplace = offlineLazy(() => import("./pages/Marketplace"));
const CornellNotes = offlineLazy(() => import("./pages/CornellNotes"));

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
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

// Splash screen wrapper component
function SplashWrapper({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Dynamically import and coordinate splash transition for native platforms
    import('@capacitor/core').then(({ Capacitor }) => {
      if (Capacitor.isNativePlatform()) {
        import('@/services/capacitorInit').then(({ coordinateSplashTransition, ensureSplashHidden }) => {
          // Safety: ensure splash hides within 5 seconds no matter what
          ensureSplashHidden(5000);
          // Normal transition when AnimatedSplash completes
          coordinateSplashTransition();
        });
      }
    }).catch(() => {
      // Not on native platform, ignore
    });
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && <AnimatedSplash onComplete={handleSplashComplete} minimumDuration={2500} />}
      <div style={{ visibility: showSplash ? 'hidden' : 'visible' }}>
        {children}
      </div>
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <OfflineFirstProvider>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <SplashWrapper>
              <AppInitializer>
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
                      <Route path="/auth-callback" element={<AuthCallback />} />
                      <Route path="/auth/verify" element={<EmailVerification />} />
                      <Route path="/auth/reset-password" element={<PasswordResetConfirm />} />
                      <Route path="/install" element={<Install />} />
                      <Route path="/privacy" element={<PrivacyPolicy />} />
                      <Route path="/terms" element={<TermsOfService />} />
                      <Route path="/" element={<AppLayout />}>
                        <Route index element={<Index />} />
                        <Route path="calendar" element={
                          <Suspense fallback={<OfflineSuspenseFallback pageName="Calendar" />}>
                            <Calendar />
                          </Suspense>
                        } />
                        <Route path="ada" element={
                          <Suspense fallback={<OfflineSuspenseFallback pageName="Ada AI" />}>
                            <Ada />
                          </Suspense>
                        } />
                        <Route path="about-ada-ai" element={
                          <Suspense fallback={<OfflineSuspenseFallback pageName="About Ada AI" />}>
                            <AboutAdaAI />
                          </Suspense>
                        } />
                        <Route path="marketplace" element={
                          <Suspense fallback={<OfflineSuspenseFallback pageName="Marketplace" />}>
                            <Marketplace />
                          </Suspense>
                        } />
                        <Route path="cornell-notes" element={
                          <Suspense fallback={<OfflineSuspenseFallback pageName="Cornell Notes" />}>
                            <CornellNotes />
                          </Suspense>
                        } />
                        <Route path="courses" element={<Courses />} />
                        <Route path="assignments" element={<Assignments />} />
                        <Route path="timer" element={<Timer />} />
                        <Route path="analytics" element={
                          <Suspense fallback={<OfflineSuspenseFallback pageName="Analytics" />}>
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
              </AppInitializer>
            </SplashWrapper>
          </ThemeProvider>
        </AuthProvider>
      </OfflineFirstProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
