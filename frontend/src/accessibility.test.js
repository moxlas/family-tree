import { CARD_WIDTHS, cardWidthFor } from './accessibility';

describe('cardWidthFor', () => {
  it('returns the shared card widths for each text size', () => {
    expect(cardWidthFor('normal')).toBe(248);
    expect(cardWidthFor('large')).toBe(300);
    expect(cardWidthFor('xlarge')).toBe(320);
  });

  it('falls back to the normal width for missing or unknown settings', () => {
    expect(cardWidthFor()).toBe(248);
    expect(cardWidthFor(null)).toBe(248);
    expect(cardWidthFor('huge')).toBe(248);
  });

  it('keeps the map and the helper in sync', () => {
    expect(CARD_WIDTHS).toEqual({ normal: 248, large: 300, xlarge: 320 });
  });
});
