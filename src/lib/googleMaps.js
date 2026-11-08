let loading = null;
let authFailed = false;

/** Loads the Google Maps JS API (with the geometry library) once per page. */
// Fallback key from .env.local (VITE_GOOGLE_MAPS_API_KEY) when Admin → Settings has none.
const ENV_KEY = (import.meta.env && import.meta.env.VITE_GOOGLE_MAPS_API_KEY) || '';

export function loadGoogleMaps(apiKey) {
  apiKey = apiKey || ENV_KEY;
  if (window.google?.maps?.geometry) return Promise.resolve(window.google);
  if (authFailed) return Promise.reject(new Error('Google Maps rejected the API key. Check it in Admin → Settings.'));
  if (loading) return loading;
  if (!apiKey) {
    return Promise.reject(new Error('The map is not configured yet — add a Google Maps API key in Admin → Settings.'));
  }

  loading = new Promise((resolve, reject) => {
    const callback = '__theJordansMapsReady';
    window[callback] = () => {
      delete window[callback];
      resolve(window.google);
    };
    // Google calls this global when the key is invalid or not allowed on this domain
    window.gm_authFailure = () => {
      authFailed = true;
      window.dispatchEvent(new Event('tj:maps-auth-failure'));
    };
    const script = document.createElement('script');
    script.src =
      'https://maps.googleapis.com/maps/api/js?key=' +
      encodeURIComponent(apiKey) +
      '&libraries=geometry&v=weekly&loading=async&callback=' +
      callback;
    script.async = true;
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error('Google Maps could not be loaded. Check your internet connection.'));
    };
    document.head.appendChild(script);
  });
  return loading;
}
