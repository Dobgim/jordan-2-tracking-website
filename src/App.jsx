import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Overlays from './components/Overlays.jsx';
import { HelpWidget, ScrollTop } from './components/Floating.jsx';
import { UIProvider, useUI } from './components/ui.jsx';
import TrackPage from './pages/TrackPage.jsx';
import { AboutPage, ContactPage, HomePage, NewsDetailPage, NewsPage, NotFoundPage, ServicesPage } from './pages/Pages.jsx';
import { setNavigator } from './lib/navigation.js';

/**
 * Turns every same-site <a href> into client-side navigation (no reload),
 * closes any open overlay, and scrolls to the top — or to #hash — on each
 * page change.
 */
function RouterGlue() {
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();
  const { close } = useUI();

  useEffect(() => {
    setNavigator(navigate);
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest?.('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith('/admin')) return;
      if (a.getAttribute('href') === '#') return;
      e.preventDefault();
      navigate(url.pathname + url.search + url.hash);
    };
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
      setNavigator(null);
    };
  }, [navigate]);

  useEffect(() => {
    close();
    if (hash) {
      // wait a frame so the new page has rendered
      requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [pathname, hash, close]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <UIProvider>
        <RouterGlue />
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/:slug" element={<NewsDetailPage />} />
          <Route path="/track" element={<TrackPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Footer />
        <ScrollTop />
        <HelpWidget />
        <Overlays />
      </UIProvider>
    </BrowserRouter>
  );
}
