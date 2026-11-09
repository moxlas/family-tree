import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api';
import { useI18n } from '../i18n';
import LanguageSwitcher from './LanguageSwitcher';
import PersonModal from './PersonModal';
import TreeComponent from './TreeComponent';

export default function TreePage({ user, onLogout }) {
  const { t, tn, translateApiError } = useI18n();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null);

  const loadPeople = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLoading(true);
      setError('');
      try {
        const response = await api.get('/people');
        setPeople(response.data);
      } catch (requestError) {
        setError(translateApiError(requestError, 'errors.loadTree'));
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [translateApiError]
  );

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const stats = useMemo(() => {
    const ids = new Set(people.map((person) => person.id));
    const roots = people.filter(
      (person) => !person.parentId || !ids.has(String(person.parentId))
    ).length;

    const byId = new Map(people.map((person) => [person.id, person]));
    let generations = 0;
    people.forEach((person) => {
      let depth = 1;
      let current = person;
      const seen = new Set([person.id]);
      while (current.parentId && byId.has(String(current.parentId))) {
        const parentId = String(current.parentId);
        if (seen.has(parentId)) break;
        seen.add(parentId);
        depth += 1;
        current = byId.get(parentId);
      }
      generations = Math.max(generations, depth);
    });

    return { roots, generations };
  }, [people]);

  const openCreate = (parentId = '') => {
    setModal({ mode: 'create', person: null, parentId });
  };

  const openEdit = (person) => {
    setModal({
      mode: 'edit',
      person,
      parentId: person.parentId ? String(person.parentId) : '',
    });
  };

  const savePerson = async (values) => {
    if (modal.mode === 'edit') {
      await api.put(`/people/${modal.person.id}`, values);
    } else {
      await api.post('/people', values);
    }

    setModal(null);
    setNotice(
      modal.mode === 'edit' ? 'notice.personUpdated' : 'notice.personAdded'
    );
    await loadPeople({ quiet: true });
  };

  const deletePerson = async (person) => {
    const name = `${person.firstName} ${person.lastName}`.trim();
    const confirmed = window.confirm(t('confirm.delete', { name }));
    if (!confirmed) return;

    setError('');
    try {
      await api.delete(`/people/${person.id}`);
      setNotice('notice.personDeleted');
      await loadPeople({ quiet: true });
    } catch (requestError) {
      setError(translateApiError(requestError, 'errors.deletePerson'));
    }
  };

  const loadDemo = async () => {
    if (people.length > 0 && !window.confirm(t('confirm.demo'))) {
      return;
    }

    setError('');
    try {
      const response = await api.post('/people/demo');
      setPeople(response.data);
      setNotice('notice.demoLoaded');
    } catch (requestError) {
      setError(translateApiError(requestError, 'errors.loadDemo'));
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand-lockup compact">
            <span className="brand-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" role="presentation">
                <path
                  d="M16 28V17M16 20c-5 0-8-3-8-7M16 22c5 0 8-3 8-7"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2.2"
                />
                <circle cx="16" cy="12" r="5" fill="currentColor" />
                <circle cx="8" cy="13" r="3.5" fill="currentColor" />
                <circle cx="24" cy="15" r="4" fill="currentColor" />
              </svg>
            </span>
            <span>{t('app.title')}</span>
          </div>

          <div className="account-menu">
            <LanguageSwitcher />
            <span className="signed-in">
              {t('tree.signedInAs')} <strong>{user.name}</strong>
            </span>
            <button className="button ghost small" onClick={onLogout} type="button">
              {t('common.logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="workspace">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">{t('tree.eyebrow')}</p>
            <h1>{t('tree.heroTitle')}</h1>
            <p className="hero-copy">{t('tree.heroCopy')}</p>
          </div>
          <div className="hero-actions">
            <button
              className="button primary"
              onClick={() => openCreate('')}
              type="button"
            >
              <span aria-hidden="true">＋</span> {t('tree.addPerson')}
            </button>
            <button className="button glass" onClick={loadDemo} type="button">
              {t('tree.loadDemo')}
            </button>
          </div>
        </section>

        {notice && (
          <div className="alert success" role="status">
            {t(notice)}
          </div>
        )}
        {error && (
          <div className="alert error" role="alert">
            {error}
            <button
              aria-label={t('tree.dismissError')}
              className="alert-close"
              onClick={() => setError('')}
              type="button"
            >
              ×
            </button>
          </div>
        )}

        <section className="stats-row" aria-label={t('tree.heading')}>
          <div className="stat-card">
            <span className="stat-value">{people.length}</span>
            <span className="stat-label">{t('stats.people')}</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.generations}</span>
            <span className="stat-label">
              {tn('stats.generations', stats.generations)}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.roots}</span>
            <span className="stat-label">
              {tn('stats.roots', stats.roots)}
            </span>
          </div>
        </section>

        {loading ? (
          <div className="panel-loading">
            <div className="loading-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p>{t('tree.loading')}</p>
          </div>
        ) : people.length === 0 ? (
          <section className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              <svg viewBox="0 0 64 64" role="presentation">
                <path
                  d="M32 56V33M32 41c-9 0-15-6-15-14M32 44c9 0 15-6 15-14"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="3"
                />
                <circle cx="32" cy="23" r="10" fill="currentColor" />
                <circle cx="15" cy="24" r="7" fill="currentColor" opacity="0.7" />
                <circle cx="49" cy="27" r="8" fill="currentColor" opacity="0.8" />
              </svg>
            </div>
            <h2>{t('empty.title')}</h2>
            <p>{t('empty.copy')}</p>
            <div className="empty-actions">
              <button
                className="button primary"
                onClick={() => openCreate('')}
                type="button"
              >
                {t('empty.addFirst')}
              </button>
              <button className="button secondary" onClick={loadDemo} type="button">
                {t('empty.explore')}
              </button>
            </div>
          </section>
        ) : (
          <section className="tree-panel" aria-label={t('tree.heading')}>
            <div className="tree-panel-heading">
              <div>
                <h2>{t('tree.heading')}</h2>
                <p>{t('tree.headingHint')}</p>
              </div>
              <button
                className="button secondary small"
                onClick={() => openCreate('')}
                type="button"
              >
                {t('tree.addRoot')}
              </button>
            </div>
            <div className="tree-scroll">
              <TreeComponent
                onAddChild={(person) => openCreate(person.id)}
                onDelete={deletePerson}
                onEdit={openEdit}
                people={people}
              />
            </div>
          </section>
        )}
      </main>

      {modal && (
        <PersonModal
          mode={modal.mode}
          onClose={() => setModal(null)}
          onSubmit={savePerson}
          people={people}
          person={modal.person}
          initialParentId={modal.parentId}
        />
      )}
    </div>
  );
}
