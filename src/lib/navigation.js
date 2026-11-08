export const isTrackPath = (path) => /^\/track\/?$/.test(path);

export const readTrackCode = () => {
  const params = new URLSearchParams(window.location.search);
  return (params.get('code') || params.get('track') || '').trim();
};

/** Opens the /track page for a tracking number (in place when already there). */
export function goToTracking(code) {
  const url = '/track?code=' + encodeURIComponent(code.trim());
  if (isTrackPath(window.location.pathname)) {
    window.history.pushState(null, '', url);
    window.dispatchEvent(new Event('tj:track'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    window.location.assign(url);
  }
}
