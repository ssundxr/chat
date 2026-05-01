import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ChatRoomPage } from "./pages/ChatRoomPage";
import { CreateJoinPage } from "./pages/CreateJoinPage";
import { LandingPage } from "./pages/LandingPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TorSurferxLanding } from "./components/TorSurferxLanding";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TorSurferxLanding />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/launch" element={<CreateJoinPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/room/:roomId" element={<ChatRoomPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
