import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';

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
  onView,
  person,
  showSpouseName = true,
  spouseStatus,
  suppressClickRef,
}) {
  const { t } = useI18n();
  const fullName = `${person.firstName} ${person.lastName}`.trim();
  const effectiveSpouseStatus = spouseStatus || person.spouseStatus || 'current';

  let life = t('person.datesUnknown');
  if (person.birthDate && person.deathDate) {
    life = `${person.birthDate} – ${person.deathDate}`;
  } else if (person.birthDate) {
    life = t('person.born', { date: person.birthDate });
  } else if (person.deathDate) {
    life = t('person.died', { date: person.deathDate });
  }

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const optionsRef = useRef(null);

  const getMenuStyle = useCallback(() => {
    if (!buttonRef.current) return {};

    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = optionsRef.current?.offsetWidth || 168;
    const menuHeight = optionsRef.current?.offsetHeight || 160;
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

  const placeMenu = useCallback(() => {
    setMenuStyle(getMenuStyle());
  }, [getMenuStyle]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    placeMenu();

    const updatePosition = () => placeMenu();

    const handlePointerDown = (event) => {
      // The menu is portaled to document.body, so React’s local wrapper
      // ref alone does not contain clicks on the menu itself. Check both
      // refs; otherwise clicking an option closes before its click fires.
      const inAnchor = menuRef.current?.contains(event.target);
      const inOptions = optionsRef.current?.contains(event.target);
      if (!inAnchor && !inOptions) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
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
  }, [menuOpen, placeMenu]);

  const handleCardClick = () => {
    if (suppressClickRef?.current) return;
    if (onView) onView(person);
  };

  const closeMenu = () => setMenuOpen(false);

  const runMenuAction = (action) => {
    if (action) action(person);
    closeMenu();
  };

  const handleKeyDown = (event) => {
    if (!onView) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onView(person);
    }
  };

  return (
    <article
      className={`person-card gender-${person.gender}${
        onView ? ' is-clickable' : ''
      }`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      ref={cardRef}
      role={onView ? 'button' : undefined}
      tabIndex={onView ? 0 : undefined}
    >
      <div className="person-main">
        <div className="avatar" aria-hidden="true">
          {initials(person)}
        </div>
        <div className="person-details">
          <h3>{fullName}</h3>
          <p className="person-life">{life}</p>
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
        <div className="person-add-menu" ref={menuRef}>
          <button
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={t('person.addRelative', { name: fullName })}
            className="icon-button add"
            ref={buttonRef}
            onClick={(event) => {
              event.stopPropagation();
              if (!menuOpen) placeMenu();
              setMenuOpen((value) => !value);
            }}
            title={t('person.addRelativeTitle')}
            type="button"
          >
            +
          </button>
          {menuOpen
            ? createPortal(
                <div
                  className="person-add-options"
                  ref={optionsRef}
                  role="menu"
                  style={menuStyle}
                >
              {onAddChild && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    runMenuAction(onAddChild);
                  }}
                  role="menuitem"
                  type="button"
                >
                  {t('person.addChildTitle')}
                </button>
              )}
              {onAddParent && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    runMenuAction(onAddParent);
                  }}
                  role="menuitem"
                  type="button"
                >
                  {t('person.addParentTitle')}
                </button>
              )}
              {onAddSibling && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    runMenuAction(onAddSibling);
                  }}
                  role="menuitem"
                  type="button"
                >
                  {t('person.addSiblingTitle')}
                </button>
              )}
              {onAddSpouse && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    runMenuAction(onAddSpouse);
                  }}
                  role="menuitem"
                  type="button"
                >
                  {t('person.addSpouseTitle')}
                </button>
              )}
            </div>,
            document.body
          ) : null}
        </div>
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
      </div>
    </article>
  );
}
