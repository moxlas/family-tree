import {
  PUBLIC_ZOOM_KEY,
  ZOOM_KEY,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_RESET,
  ZOOM_STEP,
  adjustZoom,
  clampZoom,
  defaultZoomForWidth,
  readZoom,
  writeZoom,
} from './zoom';

describe('defaultZoomForWidth', () => {
  it('uses smaller defaults on narrow screens', () => {
    expect(defaultZoomForWidth(430)).toBe(0.6);
    expect(defaultZoomForWidth(431)).toBe(0.7);
    expect(defaultZoomForWidth(600)).toBe(0.7);
    expect(defaultZoomForWidth(601)).toBe(0.8);
    expect(defaultZoomForWidth(820)).toBe(0.8);
    expect(defaultZoomForWidth(821)).toBe(ZOOM_RESET);
  });

  it('falls back to the reset zoom for unusable widths', () => {
    expect(defaultZoomForWidth()).toBe(ZOOM_RESET);
    expect(defaultZoomForWidth(Number.NaN)).toBe(ZOOM_RESET);
  });
});

describe('clampZoom', () => {
  it('rounds to one decimal and keeps the allowed bounds', () => {
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(1.04)).toBe(1);
    expect(clampZoom(1.06)).toBe(1.1);
    expect(clampZoom('1.3')).toBe(1.3);
    expect(clampZoom(0.1)).toBe(ZOOM_MIN);
    expect(clampZoom(5)).toBe(ZOOM_MAX);
  });

  it('rejects values that cannot be parsed', () => {
    expect(clampZoom('')).toBeNull();
    expect(clampZoom('abc')).toBeNull();
    expect(clampZoom(null)).toBeNull();
    expect(clampZoom(Number.NaN)).toBeNull();
  });
});

describe('readZoom', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses a valid stored zoom', () => {
    localStorage.setItem(ZOOM_KEY, '1.3');
    expect(readZoom(ZOOM_KEY, 1920)).toBe(1.3);
  });

  it('clamps an out-of-range stored zoom', () => {
    localStorage.setItem(ZOOM_KEY, '9');
    expect(readZoom(ZOOM_KEY, 1920)).toBe(ZOOM_MAX);
  });

  it('falls back to the width default when nothing usable is stored', () => {
    expect(readZoom(ZOOM_KEY, 430)).toBe(0.6);
    localStorage.setItem(ZOOM_KEY, 'unknown');
    expect(readZoom(ZOOM_KEY, 430)).toBe(0.6);
  });

  it('falls back when storage reads fail', () => {
    const spy = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });
    expect(readZoom(PUBLIC_ZOOM_KEY, 600)).toBe(0.7);
    spy.mockRestore();
  });
});

describe('writeZoom', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores a normalised zoom and returns it', () => {
    expect(writeZoom(ZOOM_KEY, 1.26)).toBe(1.3);
    expect(localStorage.getItem(ZOOM_KEY)).toBe('1.3');
  });

  it('ignores invalid values', () => {
    expect(writeZoom(ZOOM_KEY, 'bad')).toBeNull();
    expect(localStorage.getItem(ZOOM_KEY)).toBeNull();
  });

  it('does not throw when storage writes fail', () => {
    const spy = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });
    expect(writeZoom(PUBLIC_ZOOM_KEY, 1.2)).toBe(1.2);
    spy.mockRestore();
  });
});

describe('adjustZoom', () => {
  it('steps and clamps around the current value', () => {
    expect(adjustZoom(1, ZOOM_STEP)).toBe(1.1);
    expect(adjustZoom(1, -ZOOM_STEP)).toBe(0.9);
    expect(adjustZoom(ZOOM_MIN, -ZOOM_STEP)).toBe(ZOOM_MIN);
    expect(adjustZoom(ZOOM_MAX, ZOOM_STEP)).toBe(ZOOM_MAX);
    expect(adjustZoom('bad', ZOOM_STEP)).toBe(1.1);
  });
});
