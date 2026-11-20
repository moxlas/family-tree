import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatLifeDateForDisplay } from '../dates';
import { previousSurnameFor } from '../gedcom';
import { personDeceasedLabel, useI18n } from '../i18n';

function initials(person) {
  const first = (person.firstName || '').trim().charAt(0);
  const last = (person.lastName || '').trim().charAt(0);
  return `${first}${last}`.toUpperCase() || '?';
}

export default function PersonCard({
  cardRef,
  onAddChild,
  onAddParent,
  onAddSibling,
  onAddSpouse,
  onDelete,
  onEdit,
  onFocus,
  onToggleChildren,
  onView,
  childCount = 0,
  childrenHidden = false,
  hasBranch = false,
  isHome = false,
  isSelected = false,
  muted = false,
  onSelect,
  person,
  showSpouseName = true,
  spouseStatus,
  suppressClickRef,
}) {
  const { language, t } = useI18n();
  const fullName = `${person.firstName} ${person.lastName}`.trim();
  const isInteractive = Boolean(onView || onSelect);
  const effectiveSpouseStatus = spouseStatus || person.spouseStatus || 'current';
  const deceasedLabel = personDeceasedLabel(t, person);
  const hasAddActions = Boolean(
    onAddChild || onAddParent || onAddSibling || onAddSpouse
  );
  const hasMoreActions = Boolean(onFocus || onToggleChildren || onEdit || onDelete);

  const maidenSurname = previousSurnameFor(person);
  const showMaiden =
    maidenSurname &&
    maidenSurname.toLowerCase() !==
      String(person.lastName || '').trim().toLowerCase();

  let life = t('person.datesUnknown');
  if (person.birthDate && person.deathDate) {
    life = `${formatLifeDateForDisplay(
      person.birthDate,
      language
    )} – ${formatLifeDateForDisplay(person.deathDate, language)}`;
  } else if (person.birthDate) {
    life = t('person.born', {
      date: formatLifeDateForDisplay(person.birthDate, language),
    });
  } else if (person.deathDate) {
    life = t('person.died', {
      date: formatLifeDateForDisplay(person.deathDate, language),
    });
  } else if (person.deceased) {
    life = deceasedLabel;
  }

  const [openMenu, setOpenMenu] = useState('');
  const [menuStyle, setMenuStyle] = useState({});
  const addButtonRef = useRef(null);
  const addMenuRef = useRef(null);
  const addOptionsRef = useRef(null);
  const moreButtonRef = useRef(null);
  const moreMenuRef = useRef(null);
  const moreOptionsRef = useRef(null);

  const getMenuStyle = useCallback((buttonNode, optionsNode) => {
    if (!buttonNode) return {};

    const rect = buttonNode.getBoundingClientRect();
    const menuWidth = optionsNode?.offsetWidth || 168;
    const menuHeight = optionsNode?.offsetHeight || 160;
    const belowTop = rect.bottom + 6;
    const aboveTop = rect.top - menuHeight - 6;
    const fitsBelow = belowTop + menuHeight <= window.innerHeight;
    const left = Math.min(
      Math.max(8, window.innerWidth - menuWidth - 8),
      Math.max(8, rect.right - menuWidth)
    );

    return {
      position: 'fixed',
      top: fitsBelow ? belowTop : Math.max(8, aboveTop),
      left,
    };
  }, []);

  const placeMenu = useCallback(
    (name) => {
      const button = name === 'more' ? moreButtonRef.current : addButtonRef.current;
      const options =
        name === 'more' ? moreOptionsRef.current : addOptionsRef.current;
      setMenuStyle(getMenuStyle(button, options));
    },
    [getMenuStyle]
  );

  useEffect(() => {
    if (!openMenu) return undefined;

    placeMenu(openMenu);

    const updatePosition = () => placeMenu(openMenu);

    const handlePointerDown = (event) => {
      // Menus are portaled to document.body, so React’s local wrapper ref
      // alone does not contain clicks on the menu itself. Check both refs;
      // otherwise clicking an option closes before its click fires.
      const anchor =
        openMenu === 'more' ? moreMenuRef.current : addMenuRef.current;
      const options =
        openMenu === 'more' ? moreOptionsRef.current : addOptionsRef.current;
      if (!anchor?.contains(event.target) && !options?.contains(event.target)) {
        setOpenMenu('');
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpenMenu('');
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [openMenu, placeMenu]);

  const handleCardClick = () => {
    if (suppressClickRef?.current) return;
    if (onSelect) onSelect(person);
    if (onView) onView(person);
  };

  const closeMenu = () => setOpenMenu('');

  const toggleMenu = (event, name) => {
    event.stopPropagation();
    if (openMenu !== name) placeMenu(name);
    setOpenMenu((value) => (value === name ? '' : name));
  };

  const runMenuAction = (action) => (event) => {
    event?.stopPropagation();
    if (action) action(person);
    closeMenu();
  };

  const handleKeyDown = (event) => {
    if (!isInteractive) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (onSelect) onSelect(person);
      if (onView) onView(person);
    }
  };

  return (
    <article
      aria-pressed={onSelect ? Boolean(isSelected) : undefined}
      className={`person-card gender-${person.gender}${
        isInteractive ? ' is-clickable' : ''
      }${muted ? ' is-former' : ''}${isHome ? ' is-home' : ''}${
        isSelected ? ' is-selected' : ''
      }`}
      data-person-id={String(person.id)}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      ref={cardRef}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      <div className="person-main">
        <div className="avatar" aria-hidden="true">
          {initials(person)}
        </div>
        <div className="person-details">
          <h3>
            {fullName}
            {showMaiden && (
              <span className="person-maiden" title={t('details.previousName')}>
                <span className="sr-only">{t('details.previousName')}: </span>
                {' '}({maidenSurname})
              </span>
            )}
            {person.deceased && (
              <span
                aria-label={deceasedLabel}
                className="person-deceased-mark"
                title={deceasedLabel}
              >
                {' '}
                †
              </span>
            )}
          </h3>
          <p className="person-life">
            {life}
            {isHome && (
              <span className="person-home-tag" title={t('person.homePerson')}>
                {t('person.homeBadge')}
              </span>
            )}
          </p>
          {showSpouseName && person.spouseName && (
            <p
              aria-label={t('person.spouseLabel', { name: person.spouseName })}
              className="person-spouse"
            >
              <span aria-hidden="true">
                {effectiveSpouseStatus === 'former' ? '💔' : '♥'}
              </span>{' '}
              {person.spouseName}
            </p>
          )}
        </div>
      </div>

      <div className="person-actions">
        {hasAddActions && (
          <div className="person-add-menu" ref={addMenuRef}>
            <button
              aria-expanded={openMenu === 'add'}
              aria-haspopup="menu"
              aria-label={t('person.addRelative', { name: fullName })}
              className="icon-button add"
              ref={addButtonRef}
              onClick={(event) => toggleMenu(event, 'add')}
              title={t('person.addRelativeTitle')}
              type="button"
            >
              +
            </button>
            {openMenu === 'add'
              ? createPortal(
                  <div
                    className="person-add-options"
                    ref={addOptionsRef}
                    role="menu"
                    style={menuStyle}
                  >
                    {onAddChild && (
                      <button
                        onClick={runMenuAction(onAddChild)}
                        role="menuitem"
                        type="button"
                      >
                        {t('person.addChildTitle')}
                      </button>
                    )}
                    {onAddParent && (
                      <button
                        onClick={runMenuAction(onAddParent)}
                        role="menuitem"
                        type="button"
                      >
                        {t('person.addParentTitle')}
                      </button>
                    )}
                    {onAddSibling && (
                      <button
                        onClick={runMenuAction(onAddSibling)}
                        role="menuitem"
                        type="button"
                      >
                        {t('person.addSiblingTitle')}
                      </button>
                    )}
                    {onAddSpouse && (
                      <button
                        onClick={runMenuAction(onAddSpouse)}
                        role="menuitem"
                        type="button"
                      >
                        {t('person.addSpouseTitle')}
                      </button>
                    )}
                  </div>,
                  document.body
                )
              : null}
          </div>
        )}

        {hasMoreActions && (
          <div className="person-actions-secondary">
            {onFocus && (
              <button
                aria-label={t('branch.focusAria', { name: fullName })}
                className={`icon-button focus${hasBranch ? ' has-branch' : ''}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onFocus(person);
                }}
                title={
                  hasBranch ? t('branch.focusHasFamily') : t('branch.focus')
                }
                type="button"
              >
                ◎
              </button>
            )}
            {onToggleChildren && (
              <button
                aria-label={
                  childrenHidden
                    ? t('person.showChildrenAria', { name: fullName })
                    : t('person.hideChildrenAria', { name: fullName })
                }
                className={`icon-button children${
                  childrenHidden ? ' is-collapsed' : ''
                }`}
                disabled={childCount === 0}
                onClick={(event) => {
                  event.stopPropagation();
                  if (childCount > 0) onToggleChildren(person);
                }}
                title={
                  childCount === 0
                    ? t('person.noChildren')
                    : childrenHidden
                      ? t('person.showChildren')
                      : t('person.hideChildren')
                }
                type="button"
              >
                {childrenHidden ? '▸' : '▾'}
              </button>
            )}
            {onEdit && (
              <button
                aria-label={t('person.edit', { name: fullName })}
                className="icon-button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(person);
                }}
                title={t('person.editTitle')}
                type="button"
              >
                ✎
              </button>
            )}
            {onDelete && (
              <button
                aria-label={t('person.delete', { name: fullName })}
                className="icon-button danger"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(person);
                }}
                title={t('person.deleteTitle')}
                type="button"
              >
                ×
              </button>
            )}
          </div>
        )}

        {hasMoreActions && (
          <div className="person-more-menu" ref={moreMenuRef}>
            <button
              aria-expanded={openMenu === 'more'}
              aria-haspopup="menu"
              aria-label={t('person.moreActions', { name: fullName })}
              className="icon-button more"
              ref={moreButtonRef}
              onClick={(event) => toggleMenu(event, 'more')}
              title={t('person.moreTitle')}
              type="button"
            >
              ⋯
            </button>
            {openMenu === 'more'
              ? createPortal(
                  <div
                    className="person-add-options person-more-options"
                    ref={moreOptionsRef}
                    role="menu"
                    style={menuStyle}
                  >
                    {onFocus && (
                      <button
                        onClick={runMenuAction(onFocus)}
                        role="menuitem"
                        type="button"
                      >
                        {hasBranch
                          ? t('branch.focusHasFamily')
                          : t('branch.focus')}
                      </button>
                    )}
                    {onToggleChildren && (
                      <button
                        disabled={childCount === 0}
                        onClick={runMenuAction(onToggleChildren)}
                        role="menuitem"
                        type="button"
                      >
                        {childrenHidden
                          ? t('person.showChildren')
                          : t('person.hideChildren')}
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={runMenuAction(onEdit)}
                        role="menuitem"
                        type="button"
                      >
                        {t('person.editTitle')}
                      </button>
                    )}
                    {onDelete && (
                      <button
                        className="danger-text"
                        onClick={runMenuAction(onDelete)}
                        role="menuitem"
                        type="button"
                      >
                        {t('person.deleteTitle')}
                      </button>
                    )}
                  </div>,
                  document.body
                )
              : null}
          </div>
        )}
      </div>
    </article>
  );
}
