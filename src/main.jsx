import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Older invoices link to /?track=CODE - send those to the tracking page.
const legacyCode = new URLSearchParams(window.location.search).get('track');

if (window.location.pathname === '/' && legacyCode) {
  window.location.replace('/track?code=' + encodeURIComponent(legacyCode.trim()));
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
