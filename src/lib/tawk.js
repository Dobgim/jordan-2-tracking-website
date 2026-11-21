// Tawk.to live chat. The script loads once on the public site; its own floating
// bubble stays hidden so the chat is opened from the "Track & Help" widget.
const TAWK_SRC = 'https://embed.tawk.to/6b00e199e914a73cc31f4a66/default';
export const TAWK_DIRECT_LINK = 'https://tawk.to/chat/6b00e199e914a73cc31f4a66/default';

let pendingOpen = false;

export function loadTawk() {
  if (typeof window === 'undefined' || window.Tawk_API?.__jordans) return;
  const api = (window.Tawk_API = window.Tawk_API || {});
  api.__jordans = true;
  window.Tawk_LoadStart = new Date();

  api.onLoad = () => {
    if (pendingOpen) {
      pendingOpen = false;
      api.showWidget?.();
      api.maximize?.();
    } else {
      api.hideWidget?.();
    }
  };
  // when the visitor closes the chat window, hide the bubble again
  api.onChatMinimized = () => api.hideWidget?.();

  const s1 = document.createElement('script');
  s1.async = true;
  s1.src = TAWK_SRC;
  s1.charset = 'UTF-8';
  s1.setAttribute('crossorigin', '*');
  const s0 = document.getElementsByTagName('script')[0];
  s0.parentNode.insertBefore(s1, s0);
}

/** Opens the chat window; queues the request if the script is still loading. */
export function openTawkChat() {
  const api = window.Tawk_API;
  if (api && typeof api.maximize === 'function') {
    api.showWidget?.();
    api.maximize();
    return;
  }
  pendingOpen = true;
  loadTawk();
  // script blocked (ad blocker / network): fall back to the hosted chat page
  setTimeout(() => {
    if (pendingOpen) {
      pendingOpen = false;
      window.open(TAWK_DIRECT_LINK, '_blank', 'noopener');
    }
  }, 6000);
}
