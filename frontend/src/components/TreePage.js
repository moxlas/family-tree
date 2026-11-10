import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import api from '../api';
import { buildGedcom } from '../gedcom';
import { useI18n } from '../i18n';
import GedcomModal from './GedcomModal';
import LanguageSwitcher from './LanguageSwitcher';
import PersonDetailsModal from './PersonDetailsModal';
import PersonModal from './PersonModal';
import SettingsModal from './SettingsModal';
import SpouseTreeComponent from './SpouseTreeComponent';
import TreeComponent from './TreeComponent';
import TreesModal from './TreesModal';
import { branchFlags, viewPeople } from '../treeView';

const ACTIVE_TREE_KEY = 'familyTreeActiveTree';
const COLLAPSED_KEY = 'familyTreeCollapsedMarriages';

function readCollapsed() {
  try {
    const parsed = JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() || '?'
  );
}

export default function TreePage({ user, onLogout, onUserUpdate }) {
  const { t, tn, translateApiError } = useI18n();
  const [trees, setTrees] = useState([]);
  const [treesLoading, setTreesLoading] = useState(true);
  const [activeTreeId, setActiveTreeId] = useState(() => {
    try {
      return localStorage.getItem(ACTIVE_TREE_KEY) || '';
    } catch (_error) {
      return '';
    }
  });
  const [families, setFamilies] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null);
  const [detailsPerson, setDetailsPerson] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [treesOpen, setTreesOpen] = useState(false);
  const [gedcomOpen, setGedcomOpen] = useState(false);
  const [focusId, setFocusId] = useState('');
  const [collapsedByTree, setCollapsedByTree] = useState(readCollapsed);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const translateErrorRef = useRef(translateApiError);
  const bloodlineOnly = Boolean(user.settings?.bloodlineOnly);
  const showFormerSpouses = user.settings?.showFormerSpouses !== false;
  const scrollRef = useRef(null);
  const dragState = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const suppressClickRef = useRef(false);

  useEffect(() => {
    translateErrorRef.current = translateApiError;
  }, [translateApiError]);

  const activeTree = useMemo(
    () => trees.find((tree) => tree.id === activeTreeId) || null,
    [activeTreeId, trees]
  );

  const loadTrees = useCallback(async ({ quiet = false, preferredId = '' } = {}) => {
    if (!quiet) setTreesLoading(true);

    try {
      const response = await api.get('/trees');
      const list = response.data || [];
      setTrees(list);
      setActiveTreeId((current) => {
        let stored = '';
        try {
          stored = localStorage.getItem(ACTIVE_TREE_KEY) || '';
        } catch (_error) {
          stored = '';
        }

        const wanted = preferredId || current || stored;
        if (wanted && list.some((tree) => tree.id === wanted)) return wanted;
        return list[0]?.id || '';
      });
      return list;
    } catch (requestError) {
      setError(translateErrorRef.current(requestError, 'errors.loadTrees'));
      return [];
    } finally {
      if (!quiet) setTreesLoading(false);
    }
  }, []);

  const loadPeople = useCallback(
    async ({ quiet = false } = {}) => {
      if (!activeTreeId) {
        setPeople([]);
        setLoading(false);
        return;
      }

      if (!quiet) setLoading(true);
      setError('');

      try {
        const response = await api.get('/people', {
          params: { treeId: activeTreeId },
        });
        setPeople(response.data);
      } catch (requestError) {
        setError(translateErrorRef.current(requestError, 'errors.loadTree'));
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [activeTreeId]
  );

  const loadFamilies = useCallback(async () => {
    if (!activeTreeId) {
      setFamilies([]);
      return;
    }

    try {
      const response = await api.get('/families', {
        params: { treeId: activeTreeId },
      });
      setFamilies(response.data || []);
    } catch (_error) {
      setFamilies([]);
    }
  }, [activeTreeId]);

  useEffect(() => {
    loadTrees();
  }, [loadTrees]);

  useEffect(() => {
    if (!treesLoading) {
      loadPeople();
      loadFamilies();
    }
  }, [treesLoading, loadPeople, loadFamilies]);

  useEffect(() => {
    if (!activeTreeId) return;
    try {
      localStorage.setItem(ACTIVE_TREE_KEY, activeTreeId);
    } catch (_error) {
      // Switching trees still works for this session when storage is blocked.
    }
  }, [activeTreeId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const bloodlinePeople = useMemo(() => {
    const byId = new Map(people.map((person) => [person.id, person]));
    const secondaryIds = new Set();
    const remap = new Map();
    const visited = new Set();

    people.forEach((person) => {
      if (visited.has(person.id)) return;

      const spouseId = person.spouseId ? String(person.spouseId) : null;
      if (!spouseId) return;

      const spouse = byId.get(spouseId);
      if (!spouse) return;
      if (String(spouse.spouseId || '') !== person.id) return;

      visited.add(person.id);
      visited.add(spouse.id);
      secondaryIds.add(spouse.id);
      remap.set(spouse.id, person.id);

      // If the primary person has no parent but the spouse does, keep the
      // couple in the spouse's generation instead of making it a root.
      if (!person.parentId && spouse.parentId) {
        remap.set(`parent:${person.id}`, String(spouse.parentId));
      }
    });

    return people
      .filter((person) => !secondaryIds.has(person.id))
      .map((person) => {
        let parentId = person.parentId ? String(person.parentId) : null;

        if (!parentId && remap.has(`parent:${person.id}`)) {
          const spouseParentId = remap.get(`parent:${person.id}`);
          parentId = remap.has(spouseParentId)
            ? remap.get(spouseParentId)
            : spouseParentId;
        }

        if (parentId && remap.has(parentId)) {
          return { ...person, parentId: remap.get(parentId) };
        }

        return parentId === person.parentId
          ? person
          : { ...person, parentId };
      });
  }, [people]);

  const displayPeople = bloodlineOnly ? bloodlinePeople : people;

  const collapsedFamilyIds = useMemo(
    () => (activeTreeId && collapsedByTree[activeTreeId]) || [],
    [activeTreeId, collapsedByTree]
  );

  const view = useMemo(
    () =>
      viewPeople(people, families, {
        focusId,
        collapsedFamilyIds,
      }),
    [people, families, focusId, collapsedFamilyIds]
  );

  // Only count children that are actually drawn, so a branch view does not
  // offer to hide children it never shows. A collapsed marriage keeps its
  // real count so the "show children" control stays available.
  const childCounts = useMemo(() => {
    const visible = new Set(view.people.map((person) => String(person.id)));
    const collapsedSet = new Set(collapsedFamilyIds.map(String));
    const counts = {};
    families.forEach((family) => {
      const id = String(family.id);
      const children = family.children || [];
      counts[id] = collapsedSet.has(id)
        ? children.length
        : children.filter((childId) => visible.has(String(childId))).length;
    });
    return counts;
  }, [families, view, collapsedFamilyIds]);

  const branchFlagsById = useMemo(() => {
    const flags = new Map();
    people.forEach((entry) => {
      flags.set(String(entry.id), branchFlags(people, families, entry.id));
    });
    return flags;
  }, [people, families]);

  const focusedPerson = focusId
    ? people.find((entry) => String(entry.id) === String(focusId)) || null
    : null;

  const toggleFamilies = (familyIds) => {
    const ids = (familyIds || []).map(String);
    if (!ids.length || !activeTreeId) return;

    setCollapsedByTree((current) => {
      const existing = new Set((current[activeTreeId] || []).map(String));
      const collapsing = ids.some((id) => !existing.has(id));
      ids.forEach((id) => {
        if (collapsing) existing.add(id);
        else existing.delete(id);
      });
      const next = { ...current, [activeTreeId]: [...existing] };
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      } catch (_error) {
        // Collapsing still works for this session when storage is blocked.
      }
      return next;
    });
  };

  useEffect(() => {
    if (!accountMenuOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setAccountMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountMenuOpen]);

  const stats = useMemo(() => {
    const ids = new Set(displayPeople.map((person) => person.id));
    const roots = displayPeople.filter(
      (person) => !person.parentId || !ids.has(String(person.parentId))
    ).length;

    const byId = new Map(displayPeople.map((person) => [person.id, person]));
    let generations = 0;
    displayPeople.forEach((person) => {
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
  }, [displayPeople]);

  const refreshCounts = useCallback(
    () => loadTrees({ quiet: true, preferredId: activeTreeId }),
    [activeTreeId, loadTrees]
  );

  const handleTreeCreated = (tree) => {
    setTrees((current) => [...current, tree]);
    setActiveTreeId(tree.id);
    setPeople([]);
    setLoading(true);
    setError('');
    setFocusId('');
  };

  const handleTreeUpdated = (tree) => {
    setTrees((current) =>
      current.map((entry) => (entry.id === tree.id ? tree : entry))
    );
  };

  const handleTreeDeleted = (treeId) => {
    const remaining = trees.filter((entry) => entry.id !== treeId);
    setTrees(remaining);

    if (treeId === activeTreeId) {
      setActiveTreeId(remaining[0]?.id || '');
      setPeople([]);
      setLoading(true);
      setFocusId('');
    }
  };

  const handleSelectTree = (treeId) => {
    if (!treeId || treeId === activeTreeId) return;
    setActiveTreeId(treeId);
    setPeople([]);
    setLoading(true);
    setModal(null);
    setNotice('');
    setError('');
    setFocusId('');
  };

  const openCreate = (parentId = '') => {
    setModal({
      mode: 'create',
      person: null,
      parentId,
      spouseId: '',
      anchorPerson: null,
      relationship: null,
    });
  };

  const openAddChild = (person) => {
    setModal({
      mode: 'create',
      person: null,
      parentId: person.id,
      spouseId: '',
      anchorPerson: person,
      relationship: 'child',
    });
  };

  const openAddParent = (person) => {
    setModal({
      mode: 'create',
      person: null,
      parentId: '',
      spouseId: '',
      anchorPerson: person,
      relationship: 'parent',
    });
  };

  const openAddSibling = (person) => {
    setModal({
      mode: 'create',
      person: null,
      parentId: person.parentId ? String(person.parentId) : '',
      spouseId: '',
      anchorPerson: person,
      relationship: 'sibling',
    });
  };

  const openAddSpouse = (person) => {
    setModal({
      mode: 'create',
      person: null,
      parentId: '',
      spouseId: person.id,
      anchorPerson: person,
      relationship: 'spouse',
    });
  };

  const openEdit = (person) => {
    setModal({
      mode: 'edit',
      person,
      parentId: person.parentId ? String(person.parentId) : '',
      spouseId: '',
      anchorPerson: null,
      relationship: null,
    });
  };

  const savePerson = async (values) => {
    let created = null;

    if (modal.mode === 'edit') {
      await api.put(`/people/${modal.person.id}`, values);
    } else {
      const response = await api.post('/people', {
        ...values,
        treeId: activeTreeId,
      });
      created = response.data;

      if (
        modal.relationship === 'parent' &&
        modal.anchorPerson &&
        created?.id
      ) {
        await api.put(`/people/${modal.anchorPerson.id}`, {
          parentId: created.id,
          treeId: activeTreeId,
        });
      }
    }

    setModal(null);
    setNotice(
      modal.mode === 'edit' ? 'notice.personUpdated' : 'notice.personAdded'
    );
    await Promise.all([
      loadPeople({ quiet: true }),
      loadFamilies(),
      refreshCounts(),
    ]);
  };

  const deletePerson = async (person) => {
    const name = `${person.firstName} ${person.lastName}`.trim();
    const confirmed = window.confirm(t('confirm.delete', { name }));
    if (!confirmed) return;

    setError('');
    try {
      await api.delete(`/people/${person.id}`, {
        params: { treeId: activeTreeId },
      });
      setNotice('notice.personDeleted');
      await Promise.all([
        loadPeople({ quiet: true }),
        loadFamilies(),
        refreshCounts(),
      ]);
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
      const response = await api.post('/people/demo', {
        treeId: activeTreeId,
      });
      setPeople(response.data);
      setNotice('notice.demoLoaded');
      await Promise.all([loadFamilies(), refreshCounts()]);
    } catch (requestError) {
      setError(translateApiError(requestError, 'errors.loadDemo'));
    }
  };

  const exportGedcom = async () => {
    if (!activeTree || !people.length) return;

    let families = [];
    try {
      const familyResponse = await api.get('/families', {
        params: { treeId: activeTree.id },
      });
      families = familyResponse.data || [];
    } catch (_error) {
      families = [];
    }

    const text = buildGedcom(people, activeTree.name, families);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName =
      activeTree.name
        .replace(/[^\p{L}\p{N}._-]+/gu, '-')
        .replace(/^-+|-+$/g, '') || 'family-tree';

    link.href = url;
    link.download = `${safeName}.ged`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setNotice('notice.gedcomExported');
  };

  const handleImported = () => {
    loadPeople({ quiet: true });
    loadFamilies();
    refreshCounts();
  };

  const handleTreeScrollMouseDown = (event) => {
    const container = scrollRef.current;
    if (!container) return;

    dragState.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };
    container.style.cursor = 'grabbing';
  };

  const handleTreeScrollMouseMove = (event) => {
    const container = scrollRef.current;
    if (!container || !dragState.current.active) return;

    const deltaX = event.clientX - dragState.current.startX;
    const deltaY = event.clientY - dragState.current.startY;

    if (
      !dragState.current.moved &&
      (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4)
    ) {
      dragState.current.moved = true;
    }

    if (dragState.current.moved) {
      event.preventDefault();
      container.scrollLeft = dragState.current.scrollLeft - deltaX;
      container.scrollTop = dragState.current.scrollTop - deltaY;
    }
  };

  const finishTreeScrollDrag = () => {
    const container = scrollRef.current;
    if (!container) return;

    if (dragState.current.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 80);
    }

    dragState.current.active = false;
    dragState.current.moved = false;
    container.style.cursor = '';
  };

  const handleTreeScrollWheel = (event) => {
    const container = scrollRef.current;
    if (!container) return;

    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      setZoom((value) => {
        const delta = event.deltaY > 0 ? -0.1 : 0.1;
        return Math.min(2, Math.max(0.5, Math.round((value + delta) * 10) / 10));
      });
      return;
    }

    if (event.shiftKey) {
      container.scrollLeft += event.deltaY;
    } else {
      container.scrollTop += event.deltaY;
    }
    event.preventDefault();
  };

  const busy = treesLoading || loading;

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

          <div className="tree-switcher">
            <label className="tree-switcher-label" htmlFor="active-tree-select">
              {t('trees.active')}
            </label>
            <span className="tree-switcher-select">
              <select
                disabled={!trees.length}
                id="active-tree-select"
                onChange={(event) => handleSelectTree(event.target.value)}
                value={activeTreeId}
              >
                {trees.map((tree) => (
                  <option key={tree.id} value={tree.id}>
                    {tree.name}
                  </option>
                ))}
              </select>
              <span className="select-chevron" aria-hidden="true">
                ▾
              </span>
            </span>
            <button
              className="button ghost small"
              onClick={() => setTreesOpen(true)}
              type="button"
            >
              {t('trees.manage')}
            </button>
          </div>

          <div className="account-menu" ref={accountMenuRef}>
            <LanguageSwitcher />
            <button
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
              className="account-chip"
              onClick={() => setAccountMenuOpen((value) => !value)}
              type="button"
            >
              <span className="account-avatar" aria-hidden="true">
                {initials(user.name)}
              </span>
              <span className="account-name">
                <span className="account-label">{t('tree.signedInAs')}</span>
                <strong>{user.name}</strong>
              </span>
              <span className="select-chevron" aria-hidden="true">
                ▾
              </span>
            </button>
            {accountMenuOpen && (
              <div className="account-dropdown" role="menu">
                <button
                  onClick={() => {
                    setAccountMenuOpen(false);
                    setSettingsOpen(true);
                  }}
                  role="menuitem"
                  type="button"
                >
                  {t('settings.title')}
                </button>
                <button
                  className="danger"
                  onClick={onLogout}
                  role="menuitem"
                  type="button"
                >
                  {t('common.logout')}
                </button>
              </div>
            )}
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
            <button className="button glass" onClick={loadDemo} type="button">
              {t('tree.loadDemo')}
            </button>
            <button
              className="button glass"
              disabled={!activeTree}
              onClick={() => setGedcomOpen(true)}
              type="button"
            >
              {t('gedcom.import')}
            </button>
            <button
              className="button glass"
              disabled={!activeTree || !people.length}
              onClick={exportGedcom}
              type="button"
            >
              {t('gedcom.export')}
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
            <span className="stat-value">{displayPeople.length}</span>
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

        {busy ? (
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
              <button
                className="button secondary"
                disabled={!activeTree}
                onClick={() => setGedcomOpen(true)}
                type="button"
              >
                {t('gedcom.import')}
              </button>
            </div>
          </section>
        ) : (
          <section className="tree-panel" aria-label={t('tree.heading')}>
            <div className="tree-panel-heading">
              <div>
                <h2>{t('tree.heading')}</h2>
                <p>
                  {bloodlineOnly
                    ? t('tree.headingHint')
                    : focusedPerson
                      ? t('branch.focusHint')
                      : `${t('tree.headingHintSpouses')} ${t('branch.fullTreeNote')}`}
                </p>
              </div>
              <div className="tree-heading-actions">
                <span className="mode-badge">
                  {bloodlineOnly
                    ? t('tree.modeBloodline')
                    : t('tree.modeSpouses')}
                </span>
                <button
                  className="button secondary small"
                  onClick={() => openCreate('')}
                  type="button"
                >
                  <span aria-hidden="true">＋</span> {t('tree.addPerson')}
                </button>
              </div>
            </div>
            {focusedPerson && (
              <div className="focus-banner" role="status">
                <span>
                  {t('branch.focusBanner', {
                    name: `${focusedPerson.firstName} ${focusedPerson.lastName}`.trim(),
                  })}
                </span>
                <button
                  className="button ghost small"
                  onClick={() => setFocusId('')}
                  type="button"
                >
                  {t('branch.backToFull')}
                </button>
              </div>
            )}
            <div className="tree-zoom-toolbar" aria-label={t('tree.zoom')}>
              <button
                className="button ghost small"
                onClick={() => setZoom((value) => Math.max(0.5, Math.round((value - 0.1) * 10) / 10))}
                type="button"
              >
                −
              </button>
              <span className="zoom-level">{Math.round(zoom * 100)}%</span>
              <button
                className="button ghost small"
                onClick={() => setZoom((value) => Math.min(2, Math.round((value + 0.1) * 10) / 10))}
                type="button"
              >
                +
              </button>
              <button
                className="button ghost small"
                onClick={() => setZoom(1)}
                type="button"
              >
                {t('tree.zoomReset')}
              </button>
            </div>
            <div
              className="tree-scroll"
              onMouseDown={handleTreeScrollMouseDown}
              onMouseLeave={finishTreeScrollDrag}
              onMouseMove={handleTreeScrollMouseMove}
              onMouseUp={finishTreeScrollDrag}
              onWheel={handleTreeScrollWheel}
              ref={scrollRef}
              style={{ cursor: 'grab', zoom }}
            >
              {bloodlineOnly ? (
                <TreeComponent
                  onAddChild={(person) => openAddChild(person)}
                  onAddParent={(person) => openAddParent(person)}
                  onAddSibling={(person) => openAddSibling(person)}
                  onAddSpouse={(person) => openAddSpouse(person)}
                  onDelete={deletePerson}
                  onEdit={openEdit}
                  onView={(person) => setDetailsPerson(person)}
                  people={bloodlinePeople}
                  suppressClickRef={suppressClickRef}
                />
              ) : (
                <SpouseTreeComponent
                  branchFlagsById={branchFlagsById}
                  childCounts={childCounts}
                  collapsedFamilyIds={collapsedFamilyIds}
                  families={view.families}
                  showFormerSpouses={showFormerSpouses}
                  onAddChild={(person) => openAddChild(person)}
                  onAddParent={(person) => openAddParent(person)}
                  onAddSibling={(person) => openAddSibling(person)}
                  onAddSpouse={openAddSpouse}
                  onDelete={deletePerson}
                  onEdit={openEdit}
                  onFocus={(person) => setFocusId(String(person.id))}
                  onToggleFamily={toggleFamilies}
                  onView={(person) => setDetailsPerson(person)}
                  people={view.people}
                  suppressClickRef={suppressClickRef}
                  zoom={zoom}
                />
              )}
            </div>
          </section>
        )}
      </main>

      {detailsPerson && (
        <PersonDetailsModal
          families={families}
          onClose={() => setDetailsPerson(null)}
          onEdit={openEdit}
          people={people}
          person={detailsPerson}
        />
      )}

      {modal && (
        <PersonModal
          anchorName={
            modal.anchorPerson
              ? `${modal.anchorPerson.firstName} ${modal.anchorPerson.lastName}`.trim()
              : ''
          }
          families={families}
          initialParentId={modal.parentId}
          initialSpouseId={modal.spouseId}
          mode={modal.mode}
          onClose={() => setModal(null)}
          onSubmit={savePerson}
          people={people}
          person={modal.person}
          relationship={modal.relationship}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onUserUpdate={onUserUpdate}
          user={user}
        />
      )}

      {treesOpen && (
        <TreesModal
          activeTreeId={activeTreeId}
          onClose={() => setTreesOpen(false)}
          onCreated={handleTreeCreated}
          onDeleted={handleTreeDeleted}
          onSelect={handleSelectTree}
          onUpdated={handleTreeUpdated}
          trees={trees}
        />
      )}

      {gedcomOpen && activeTree && (
        <GedcomModal
          onClose={() => setGedcomOpen(false)}
          onImported={handleImported}
          tree={activeTree}
        />
      )}
    </div>
  );
}
