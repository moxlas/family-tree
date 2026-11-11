import React, { useEffect, useState } from 'react';
import api from './api';
import { useI18n } from './i18n';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';
import PublicTreePage from './components/PublicTreePage';
import TreePage from './components/TreePage';
import { readShareToken } from './share';
import './App.css';

const TOKEN_KEY = 'familyTreeToken';

function App() {
  const { t } = useI18n();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(Boolean(token));
  const shareToken = readShareToken(window.location.search);

  useEffect(() => {
    if (!token || shareToken) {
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
  }, [token, shareToken]);

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

  if (shareToken) {
    return (
      <ErrorBoundary>
        <PublicTreePage token={shareToken} />
      </ErrorBoundary>
    );
  }

  if (checkingSession) {
    return (
      <div className="app-loading">
        <div className="loading-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p>{t('app.loading')}</p>
      </div>
    );
  }

  if (!token || !user) {
    return <Login onAuth={handleAuth} />;
  }

  return (
    <ErrorBoundary>
      <TreePage
        onLogout={handleLogout}
        onUserUpdate={setUser}
        user={user}
      />
    </ErrorBoundary>
  );
}

export default App;
