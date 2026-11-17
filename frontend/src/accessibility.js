// Canvas card widths for each text-size setting. This is shared by the CSS
// variable that sizes the cards and the scene layout that positions them, so
// larger accessibility sizes cannot cause overlapping cards.
export const CARD_WIDTHS = {
  normal: 248,
  large: 300,
  xlarge: 320,
};

export function cardWidthFor(textSize) {
  return CARD_WIDTHS[textSize] || CARD_WIDTHS.normal;
}
