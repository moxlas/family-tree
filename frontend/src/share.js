const SHARE_PARAM = 'share';
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export function readShareToken(search = '') {
  try {
    const params = new URLSearchParams(search);
    const token = String(params.get(SHARE_PARAM) || '').trim();
    return TOKEN_PATTERN.test(token) ? token : '';
  } catch (_error) {
    return '';
  }
}

export function buildShareUrl(token, baseUrl) {
  const value = String(token || '').trim();
  if (!TOKEN_PATTERN.test(value)) return '';

  const base =
    baseUrl ||
    (typeof window !== 'undefined' && window.location
      ? window.location.href
      : 'https://example.com/');

  const url = new URL(base);
  url.hash = '';
  url.search = '';
  url.searchParams.set(SHARE_PARAM, value);
  return url.toString();
}
