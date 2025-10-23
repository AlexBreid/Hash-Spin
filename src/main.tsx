import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom"; // <-- ИМПОРТ РОУТЕРА
import AppLayout from "./App"; // Основной макет приложения
import AuthHandler from './pages/AuthHandler'; // Компонент для обмена токенов
import LoginPage from './pages/LoginPage'; // Страница входа (на случай ошибки)
import "./index.css";

const container = document.getElementById("root");
const root = createRoot(container!);

root.render(
  <BrowserRouter>
    <Routes>
      {/* 1. Маршрут для обработки токена от Telegram: https://yourcasino.com/auth?token=... */}
      <Route path="/auth" element={<AuthHandler />} />
      
      {/* 2. Маршрут для запасной страницы входа */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* 3. ОСНОВНОЙ МАКЕТ: Все остальные пути будут использовать AppLayout */}
      <Route path="/*" element={<AppLayout />} />
    </Routes>
  </BrowserRouter>
);