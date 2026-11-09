import React, { useEffect, useState } from 'react';
import api from './api';
import Login from './components/Login';
import TreePage from './components/TreePage';
import './App.css';

const TOKEN_KEY = 'familyTreeToken';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setCheckingSession(false);
      setUser(null);
      return undefined;
    }

    let active = true;
    setCheckingSession(true);

    api
      .get('/auth/me')
      .then((response) => {
        if (active) setUser(response.data.user);
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const handleAuth = (data) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  if (checkingSession) {
    return (
      <div className="app-loading">
        <div className="loading-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p>Opening your family archive…</p>
      </div>
    );
  }

  if (!token || !user) {
    return <Login onAuth={handleAuth} />;
  }

  return <TreePage user={user} onLogout={handleLogout} />;
}

export default App;
