export const isTrackPath = (path) => /^\/track\/?$/.test(path);

export const readTrackCode = () => {
  const params = new URLSearchParams(window.location.search);
  return (params.get('code') || params.get('track') || '').trim();
};

// set by the router shell so plain modules can navigate without a page reload
let navigator = null;
export const setNavigator = (fn) => {
  navigator = fn;
};

/** Client-side navigation, falling back to a normal page load. */
export function go(url) {
  if (navigator) navigator(url);
  else window.location.assign(url);
}

/** Opens the /track page for a tracking number (in place when already there). */
export function goToTracking(code) {
  const url = '/track?code=' + encodeURIComponent(code.trim());
  const already = isTrackPath(window.location.pathname);
  go(url);
  if (already) {
    window.dispatchEvent(new Event('tj:track'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
