import { buildShareUrl, readShareToken } from './share';

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWx';

describe('share links', () => {
  test('reads a valid share token from the query string', () => {
    expect(readShareToken(`?share=${TOKEN}`)).toBe(TOKEN);
    expect(readShareToken(`?v=1&share=${TOKEN}`)).toBe(TOKEN);
  });

  test('ignores missing, malformed and short tokens', () => {
    expect(readShareToken('')).toBe('');
    expect(readShareToken('?share=')).toBe('');
    expect(readShareToken('?share=short')).toBe('');
    expect(readShareToken('?share=not%20a%20token')).toBe('');
  });

  test('builds a share URL on the current page path', () => {
    expect(
      buildShareUrl(TOKEN, 'https://moxlas.github.io/family-tree/?v=123')
    ).toBe(`https://moxlas.github.io/family-tree/?share=${TOKEN}`);
  });

  test('keeps existing query parameters out of the share URL', () => {
    expect(
      buildShareUrl(TOKEN, 'https://example.com/app/?share=old&x=1#section')
    ).toBe(`https://example.com/app/?share=${TOKEN}`);
  });

  test('returns an empty string for invalid tokens', () => {
    expect(buildShareUrl('short', 'https://example.com/')).toBe('');
    expect(buildShareUrl('', 'https://example.com/')).toBe('');
  });
});
