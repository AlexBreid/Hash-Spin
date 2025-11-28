import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./App";
import AuthHandler from './components/pages/AuthHandler';
import "./index.css";

const container = document.getElementById("root");
const root = createRoot(container!);

root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/auth" element={<AuthHandler />} />
      {/* 🆕 Все остальные маршруты внутри AppLayout */}
      <Route path="/*" element={<AppLayout />} />
    </Routes>
  </BrowserRouter>
);