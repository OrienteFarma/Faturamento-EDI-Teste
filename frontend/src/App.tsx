import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Home from "./components/Home";
import GerarRomaneioEDI from "./components/GerarRomaneioEDI";
import GerenciarEmailsTransportadoras from "./components/GerenciarEmailsTransportadoras";
import GerenciarConfigsEDI from "./components/GerenciarConfigsEDI";
import JobNotificationContainer from "./components/JobNotificationContainer";
import { desabilitarConsoleProd, detectarDevTools, prevenirClickjacking } from "./utils/security";

// Desabilitar console.log e DevTools em produção
if (import.meta.env.PROD) {
  desabilitarConsoleProd();
  detectarDevTools();
  prevenirClickjacking();
}

// Lista de usuários com permissão de administrador
const ADMIN_USERS = ['adalbertosilva', 'albertojunio'];

interface UserData {
  userName: string;
  userLogin: string;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(() => {
    return localStorage.getItem("isAuthenticated") === "true";
  });

  const [userData, setUserData] = React.useState<UserData>(() => {
    const stored = localStorage.getItem("userData");
    return stored ? JSON.parse(stored) : { userName: "", userLogin: "" };
  });

  // Timeout de sessão: 10 horas (36000000ms)
  const SESSION_TIMEOUT = 10 * 60 * 60 * 1000; // 10 horas
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const resetTimeout = React.useCallback(() => {
    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Criar novo timeout
    if (isAuthenticated) {
      timeoutRef.current = setTimeout(() => {
        console.log('⏰ Sessão expirada por inatividade (10 horas)');
        handleLogout();
        alert('Sua sessão expirou por inatividade. Faça login novamente.');
      }, SESSION_TIMEOUT);
    }
  }, [isAuthenticated]);

  // Configurar eventos de atividade do usuário
  React.useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetTimeout();
    };

    // Adicionar listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Iniciar timeout
    resetTimeout();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isAuthenticated, resetTimeout]);

  const handleLoginSuccess = (data: UserData) => {
    setIsAuthenticated(true);
    setUserData(data);
    
    // Garantir que os dados persistam no localStorage
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userData', JSON.stringify(data));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserData({ userName: "", userLogin: "" });
    localStorage.removeItem('authToken');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userData');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} />
            )
          }
        />
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Home userData={userData} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/home"
          element={
            isAuthenticated ? (
              <Home userData={userData} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/gerar-romaneio-edi"
          element={
            isAuthenticated ? (
              <GerarRomaneioEDI userData={userData} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/gerenciar-emails"
          element={
            isAuthenticated ? (
              ADMIN_USERS.includes(userData.userLogin?.toLowerCase()) ? (
                <GerenciarEmailsTransportadoras userData={userData} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/gerenciar-configs-edi"
          element={
            isAuthenticated ? (
              ADMIN_USERS.includes(userData.userLogin?.toLowerCase()) ? (
                <GerenciarConfigsEDI userData={userData} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* Container de notificações de jobs */}
      {isAuthenticated && <JobNotificationContainer />}
    </Router>
  );
}

export default App;
