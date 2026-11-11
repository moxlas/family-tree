import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api';
import { useI18n } from '../i18n';
import {
  bloodlinePersonIds,
  branchMemberIds,
  defaultHomePersonId,
  viewPeople,
} from '../treeView';
import LanguageSwitcher from './LanguageSwitcher';
import PersonDetailsModal from './PersonDetailsModal';
import SpouseTreeComponent from './SpouseTreeComponent';

function appUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

export default function PublicTreePage({ token }) {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [detailsPerson, setDetailsPerson] = useState(null);
  const [focusId, setFocusId] = useState('');
  const [zoom, setZoom] = useState(1);
  const [centreSignal, setCentreSignal] = useState(0);
  const [bloodlineOnly, setBloodlineOnly] = useState(false);
  const [showFormerSpouses, setShowFormerSpouses] = useState(true);
  const [collapsedIds, setCollapsedIds] = useState([]);
  const scrollRef = useRef(null);
  const suppressClickRef = useRef(false);
  const dragState = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setUnavailable(false);

    api
      .get(`/public/trees/${encodeURIComponent(token)}`)
      .then((response) => {
        if (!active) return;
        setData(response.data);
      })
      .catch(() => {
        if (!active) return;
        setData(null);
        setUnavailable(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    const previousTitle = document.title;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);

    if (data?.tree?.name) {
      document.title = `${data.tree.name} · ${t('app.title')}`;
    }

    return () => {
      document.title = previousTitle;
      meta.remove();
    };
  }, [data, t]);

  const people = useMemo(() => data?.people || [], [data]);
  const families = useMemo(() => data?.families || [], [data]);

  const fallbackHomePersonId = useMemo(
    () => defaultHomePersonId(people, families),
    [people, families]
  );

  const homePersonId = useMemo(() => {
    const stored = data?.tree?.homePersonId
      ? String(data.tree.homePersonId)
      : '';
    if (stored && people.some((person) => String(person.id) === stored)) {
      return stored;
    }
    return fallbackHomePersonId;
  }, [data, people, fallbackHomePersonId]);

  const bloodlinePeople = useMemo(() => {
    if (!homePersonId) return people;
    const ids = bloodlinePersonIds(people, families, homePersonId);
    return people.filter((person) => ids.has(String(person.id)));
  }, [people, families, homePersonId]);

  const view = useMemo(
    () =>
      viewPeople(people, families, {
        focusId,
        homePersonId,
        collapsedPersonIds: collapsedIds,
      }),
    [people, families, focusId, homePersonId, collapsedIds]
  );

  const childrenByPerson = useMemo(() => {
    const map = new Map();
    families.forEach((family) => {
      const children = family.children || [];
      if (!children.length) return;
      [family.husband, family.wife].forEach((parentId) => {
        if (!parentId) return;
        const key = String(parentId);
        if (!map.has(key)) map.set(key, new Set());
        children.forEach((childId) => map.get(key).add(String(childId)));
      });
    });
    return map;
  }, [families]);

  const branchFlagsById = useMemo(() => {
    const base = viewPeople(people, families, { homePersonId });
    const baseIds = new Set(base.people.map((person) => String(person.id)));
    const flags = new Map();

    people.forEach((entry) => {
      const id = String(entry.id);
      const revealsMore = branchMemberIds(people, families, id).some(
        (memberId) => !baseIds.has(String(memberId))
      );
      flags.set(id, { hasBranch: revealsMore });
    });

    return flags;
  }, [people, families, homePersonId]);

  const focusedPerson = focusId
    ? people.find((entry) => String(entry.id) === String(focusId)) || null
    : null;

  useEffect(() => {
    if (!focusId || !people.length) return;
    if (!people.some((entry) => String(entry.id) === String(focusId))) {
      setFocusId('');
    }
  }, [focusId, people]);

  useEffect(() => {
    if (bloodlineOnly) setFocusId('');
  }, [bloodlineOnly]);

  const centreTargetId = focusId || homePersonId;

  useEffect(() => {
    if (!centreTargetId || !people.length) return undefined;

    let frame = 0;
    let attempts = 0;
    let stable = 0;
    let cancelled = false;

    const centre = () => {
      if (cancelled) return;
      attempts += 1;

      const scroll = scrollRef.current;
      const card = scroll?.querySelector(
        `[data-person-id="${String(centreTargetId).replace(/"/g, '\\"')}"]`
      );

      if (!scroll || !card) {
        if (attempts < 40) frame = window.requestAnimationFrame(centre);
        return;
      }

      const viewport = scroll.getBoundingClientRect();
      const rect = card.getBoundingClientRect();
      const deltaX =
        rect.left + rect.width / 2 - (viewport.left + viewport.width / 2);
      const deltaY =
        rect.top + rect.height / 2 - (viewport.top + viewport.height / 2);

      if (Math.abs(deltaX) < 2 && Math.abs(deltaY) < 2) {
        stable += 1;
      } else {
        stable = 0;
        // Scroll only the tree viewport so the page header stays in place.
        scroll.scrollLeft += deltaX;
        scroll.scrollTop += deltaY;
      }

      if (stable < 2 && attempts < 40) {
        frame = window.requestAnimationFrame(centre);
      }
    };

    frame = window.requestAnimationFrame(centre);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [centreTargetId, people.length, bloodlineOnly, centreSignal]);

  const toggleChildren = (person) => {
    const id = person ? String(person.id) : '';
    if (!id) return;

    setCollapsedIds((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id]
    );
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
        return Math.min(
          2,
          Math.max(0.5, Math.round((value + delta) * 10) / 10)
        );
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

  const viewLabel = bloodlineOnly
    ? t('tree.modeBloodline')
    : t('tree.modeSpouses');

  return (
    <div className="app-shell public-shell">
      <header className="topbar">
        <div className="topbar-inner public-topbar-inner">
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

          <div className="public-topbar-centre">
            <span className="mode-badge">{t('share.publicView')}</span>
          </div>

          <div className="account-menu">
            <LanguageSwitcher />
            <a className="button secondary small" href={appUrl()}>
              {t('share.openApp')}
            </a>
          </div>
        </div>
      </header>

      <main className="workspace public-workspace">
        {loading ? (
          <div className="panel-loading">
            <div className="loading-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p>{t('tree.loading')}</p>
          </div>
        ) : unavailable ? (
          <section className="public-unavailable" role="alert">
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
              </svg>
            </div>
            <h1>{t('share.unavailableTitle')}</h1>
            <p>{t('share.unavailableCopy')}</p>
            <a className="button secondary" href={appUrl()}>
              {t('share.openApp')}
            </a>
          </section>
        ) : people.length === 0 ? (
          <section className="public-unavailable">
            <h1>{t('share.emptyTitle')}</h1>
            <p>{t('share.emptyCopy')}</p>
            <a className="button secondary" href={appUrl()}>
              {t('share.openApp')}
            </a>
          </section>
        ) : (
          <section className="tree-panel" aria-label={t('tree.heading')}>
            <div className="tree-panel-heading">
              <div>
                <div className="tree-heading-title">
                  <h2>{data.tree.name || t('tree.heading')}</h2>
                  <span className="mode-badge">{viewLabel}</span>
                </div>
                <p>{t('share.livingNote')}</p>
              </div>
              <div className="public-toggles">
                <label className="public-toggle">
                  <span>{t('settings.showFormerSpouses')}</span>
                  <span className="switch">
                    <input
                      checked={showFormerSpouses}
                      onChange={(event) =>
                        setShowFormerSpouses(event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span className="switch-track" aria-hidden="true">
                      <span className="switch-thumb" />
                    </span>
                  </span>
                </label>
                <label className="public-toggle">
                  <span>{t('settings.bloodlineOnly')}</span>
                  <span className="switch">
                    <input
                      checked={bloodlineOnly}
                      onChange={(event) =>
                        setBloodlineOnly(event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span className="switch-track" aria-hidden="true">
                      <span className="switch-thumb" />
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {!bloodlineOnly && focusedPerson && (
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
              <div className="tree-zoom-controls">
                <button
                  className="button ghost small"
                  onClick={() =>
                    setZoom((value) =>
                      Math.max(0.5, Math.round((value - 0.1) * 10) / 10)
                    )
                  }
                  type="button"
                >
                  −
                </button>
                <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                <button
                  className="button ghost small"
                  onClick={() =>
                    setZoom((value) =>
                      Math.min(2, Math.round((value + 0.1) * 10) / 10)
                    )
                  }
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
              <button
                className="button ghost small tree-centre-button"
                onClick={() => setCentreSignal((value) => value + 1)}
                type="button"
              >
                {t('tree.centreView')}
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
                <SpouseTreeComponent
                  collapsedPersonIds={collapsedIds}
                  families={families}
                  focusId=""
                  homePersonId={homePersonId}
                  onToggleChildren={toggleChildren}
                  onView={(person) => setDetailsPerson(person)}
                  pedigreePersonId={homePersonId}
                  people={bloodlinePeople}
                  suppressClickRef={suppressClickRef}
                  zoom={zoom}
                />
              ) : (
                <SpouseTreeComponent
                  branchFlagsById={branchFlagsById}
                  childrenByPerson={childrenByPerson}
                  collapsedPersonIds={collapsedIds}
                  families={view.families}
                  focusId={focusId}
                  homePersonId={homePersonId}
                  onFocus={(person) => setFocusId(String(person.id))}
                  onToggleChildren={toggleChildren}
                  onView={(person) => setDetailsPerson(person)}
                  pedigreePersonId={focusId ? '' : homePersonId}
                  people={view.people}
                  showFormerSpouses={showFormerSpouses}
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
          hideNotes
          onClose={() => setDetailsPerson(null)}
          people={people}
          person={detailsPerson}
          referenceKind={focusId ? 'branch' : 'home'}
          referencePersonId={focusId || homePersonId}
        />
      )}
    </div>
  );
}
