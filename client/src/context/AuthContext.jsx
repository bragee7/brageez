import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const IDLE_ACTIVITY_KEY = 'lastActivity';
const IDLE_TIMEOUT_MINUTES = Number(import.meta.env?.VITE_IDLE_TIMEOUT) || 30;

const isProbablyExpired = () => {
  const last = Number(localStorage.getItem(IDLE_ACTIVITY_KEY)) || 0;
  if (!last) return false;
  return Date.now() - last > IDLE_TIMEOUT_MINUTES * 60 * 1000;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (storedUser && token) {
      if (isProbablyExpired()) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem(IDLE_ACTIVITY_KEY);
      } else {
        setUser(JSON.parse(storedUser));
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem(IDLE_ACTIVITY_KEY, String(Date.now()));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(IDLE_ACTIVITY_KEY);
    setUser(null);
  };

  // Idle auto-logout: reset the timer on meaningful user activity across the
  // whole window; when inactive for IDLE_TIMEOUT_MINUTES, end the session.
  useEffect(() => {
    const touchActivity = () => {
      localStorage.setItem(IDLE_ACTIVITY_KEY, String(Date.now()));
    };

    const EVENTS = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll', 'wheel'];
    EVENTS.forEach((event) => window.addEventListener(event, touchActivity, { passive: true }));

    const onStorage = (event) => {
      if (event.key === IDLE_ACTIVITY_KEY) touchActivity();
    };
    window.addEventListener('storage', onStorage);

    const timer = setInterval(() => {
      const hasSession = !!localStorage.getItem('token');
      if (hasSession && isProbablyExpired()) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem(IDLE_ACTIVITY_KEY);
        setUser(null);
        const params = new URLSearchParams(window.location.search);
        params.set('expired', '1');
        window.location.href = `${window.location.pathname}?${params.toString()}`;
      }
    }, 60000);

    return () => {
      EVENTS.forEach((event) => window.removeEventListener(event, touchActivity));
      window.removeEventListener('storage', onStorage);
      clearInterval(timer);
    };
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isPolice: user?.role === 'police',
    isAdmin: user?.role === 'admin',
    isUser: user?.role === 'user'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
