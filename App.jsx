import { Routes, Route, Navigate } from "react-router-dom";
import HomeRouter from "./components/HomeRouter";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import WorkflowGuard from "./components/WorkflowGuard";

// Workflow Pages
import Interview from "./pages/Interview";
import InterviewLevel from "./pages/InterviewLevel";
import MethodSelection from "./pages/MethodSelection";
import Analysis from "./pages/Analysis";

import ResumeBuilder from "./pages/ResumeBuilder";

// PPT Pages
import PPTBuilder from "./pages/PPTBuilder";
import PPTOutline from "./pages/PPTOutline";
import PPTImages from "./pages/PPTImages";
import PPTTheme from "./pages/PPTTheme";
import PPTPreview from "./pages/PPTPreview";

// Career Enhancement Pages
import JDTailoring from "./pages/JDTailoring";
import JDTailorResult from "./pages/JDTailorResult";
import CoverLetter from "./pages/CoverLetter";
import CoverLetterResult from "./pages/CoverLetterResult";
import LinkedInOptimizer from "./pages/LinkedInOptimizer";
import LinkedInResult from "./pages/LinkedInResult";
import LetterBuilder from "./pages/LetterBuilder";
import LetterResult from "./pages/LetterResult";
import VoiceInterview from "./pages/VoiceInterview";
import ATSOptimizer from "./pages/ATSOptimizer";
import PortfolioGenerator from "./pages/PortfolioGenerator";
import HeadshotStudio from "./pages/HeadshotStudio";

const App = () => {
  return (
    <Routes>
      {/* Public/Hybrid Routes */}
      <Route path="/" element={<HomeRouter />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Application Routes */}
      <Route element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<Navigate to="/" replace />} />

        {/* Workflow Steps */}
        <Route path="/interview-level" element={
          <WorkflowGuard step="login">
            <InterviewLevel />
          </WorkflowGuard>
        } />

        <Route path="/interview" element={
          <WorkflowGuard step="login">
            <Interview />
          </WorkflowGuard>
        } />

        <Route path="/method" element={
          <WorkflowGuard step="interview">
            <MethodSelection />
          </WorkflowGuard>
        } />

        <Route path="/analysis" element={
          <WorkflowGuard step="method">
            <Analysis />
          </WorkflowGuard>
        } />


        <Route path="/resume" element={
            <ResumeBuilder />
        } />

        {/* PPT Routes */}
        <Route path="/ppt" element={<PPTBuilder />} />
        <Route path="/ppt/outline/:id" element={<PPTOutline />} />
        <Route path="/ppt/images/:id" element={<PPTImages />} />
        <Route path="/ppt/theme/:id" element={<PPTTheme />} />
        <Route path="/ppt/preview/:id" element={<PPTPreview />} />

        {/* Career Enhancement Routes */}
        <Route path="/career/jd-tailor" element={<JDTailoring />} />
        <Route path="/career/jd-tailor/result" element={<JDTailorResult />} />
        <Route path="/career/cover-letter" element={<CoverLetter />} />
        <Route path="/career/cover-letter/result" element={<CoverLetterResult />} />
        <Route path="/career/linkedin" element={<LinkedInOptimizer />} />
        <Route path="/career/linkedin/result" element={<LinkedInResult />} />

        {/* Letter Builder */}
        <Route path="/letter" element={<LetterBuilder />} />
        <Route path="/letter/:id" element={<LetterResult />} />

        {/* New Features */}
        <Route path="/voice-interview" element={<VoiceInterview />} />
        <Route path="/career/ats" element={<ATSOptimizer />} />
        <Route path="/portfolio" element={<PortfolioGenerator />} />
        <Route path="/headshot" element={<HeadshotStudio />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
