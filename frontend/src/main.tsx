import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import AppLayout from "./App";
import AuthHandler from './components/pages/AuthHandler';
import "./index.css";

const container = document.getElementById("root");
const root = createRoot(container!);

root.render(
  <ThemeProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthHandler />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  </ThemeProvider>
);