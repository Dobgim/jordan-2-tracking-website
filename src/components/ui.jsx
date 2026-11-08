import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

/* ---------- overlays: side panel, search, account, cart, video ---------- */

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [overlay, setOverlay] = useState(null); // 'panel' | 'search' | 'account' | 'cart' | 'menu' | { video }
  const open = useCallback((name) => setOverlay(name), []);
  const close = useCallback(() => setOverlay(null), []);

  useEffect(() => {
    if (!overlay) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOverlay(null);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [overlay]);

  return <UIContext.Provider value={{ overlay, open, close }}>{children}</UIContext.Provider>;
}

export const useUI = () => useContext(UIContext);

/** Full-screen dim layer + sliding/centred surface. */
export function Overlay({ show, onClose, children, side = 'right', label }) {
  const positions = {
    right: 'right-0 top-0 h-full w-full max-w-[420px] translate-x-full',
    left: 'left-0 top-0 h-full w-full max-w-[340px] -translate-x-full',
    top: 'inset-x-0 top-0 -translate-y-full',
    center: 'left-1/2 top-1/2 max-w-[calc(100%-32px)] -translate-x-1/2 -translate-y-[45%] opacity-0',
  };
  const shown = {
    right: 'translate-x-0',
    left: 'translate-x-0',
    top: 'translate-y-0',
    center: '-translate-y-1/2 opacity-100',
  };
  return (
    <div className={`fixed inset-0 z-[100] ${show ? 'visible' : 'invisible pointer-events-none'}`} aria-hidden={!show}>
      <div
        className={`absolute inset-0 bg-navy-900/70 backdrop-blur-[2px] transition-opacity duration-500 ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`absolute transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${positions[side]} ${show ? shown[side] : ''}`}
      >
        {children}
      </div>
    </div>
  );
}

export function CloseButton({ onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className={`grid size-11 place-items-center rounded-full bg-brand text-white transition-transform duration-300 hover:rotate-90 ${className}`}
    >
      <Icon name="close" size={18} strokeWidth={2.2} />
    </button>
  );
}

/* ---------- buttons ---------- */

export function CutButton({ href, children, variant, className = '', type = 'button', ...rest }) {
  const cls = `btn-cut ${variant === 'light' ? 'btn-cut--light' : ''} ${className}`;
  const inner = (
    <>
      <span className="btn-dot">
        <Icon name="arrowRight" size={13} strokeWidth={2.2} />
      </span>
      <span>{children}</span>
    </>
  );
  return href ? (
    <a href={href} className={cls} {...rest}>
      {inner}
    </a>
  ) : (
    <button type={type} className={cls} {...rest}>
      {inner}
    </button>
  );
}

/** "Get Started (→)" text link with the red circle arrow. */
export function ArrowLink({ href, children, className = '' }) {
  return (
    <a href={href} className={`group inline-flex items-center gap-2.5 font-heading text-[15px] font-medium text-navy ${className}`}>
      {children}
      <span className="grid size-[26px] place-items-center rounded-full bg-brand text-white transition-transform duration-300 group-hover:translate-x-1">
        <Icon name="arrowRight" size={13} strokeWidth={2.2} />
      </span>
    </a>
  );
}

/* ---------- scroll reveal ---------- */

let observer;
const callbacks = new WeakMap();
function observe(el, cb) {
  observer ??= new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callbacks.get(entry.target)?.();
          observer.unobserve(entry.target);
        }
      }),
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  );
  callbacks.set(el, cb);
  observer.observe(el);
  return () => observer.unobserve(el);
}

/** Calls back once when the element scrolls into view. */
export function useInView() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return undefined;
    }
    return observe(ref.current, () => setSeen(true));
  }, []);
  return [ref, seen];
}

/** Fades its children up when they scroll into view. */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const [ref, seen] = useInView();
  return (
    <Tag ref={ref} className={`reveal ${seen ? 'is-visible' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}

/* ---------- counters ---------- */

export function CountUp({ to, duration = 2000, className = '' }) {
  const [ref, seen] = useInView();
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!seen) return undefined;
    let frame;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [seen, to, duration]);
  return (
    <span ref={ref} className={className}>
      {value.toLocaleString('en-US')}
    </span>
  );
}

/* ---------- carousel ---------- */

/**
 * Minimal carousel: a horizontal track of slides with `perView` visible at a
 * time (responsive), looping prev/next, dots, optional autoplay and swipe.
 */
export function useCarousel({ count, perView: perViewMap, autoplay = 0 }) {
  const getPerView = useCallback(() => {
    if (typeof window === 'undefined') return perViewMap.base;
    const w = window.innerWidth;
    let pv = perViewMap.base;
    if (w >= 640 && perViewMap.sm) pv = perViewMap.sm;
    if (w >= 768 && perViewMap.md) pv = perViewMap.md;
    if (w >= 1024 && perViewMap.lg) pv = perViewMap.lg;
    if (w >= 1280 && perViewMap.xl) pv = perViewMap.xl;
    return pv;
  }, [perViewMap.base, perViewMap.sm, perViewMap.md, perViewMap.lg, perViewMap.xl]);

  const [perView, setPerView] = useState(getPerView);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const maxIndex = Math.max(0, count - perView);

  useEffect(() => {
    const onResize = () => setPerView(getPerView());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [getPerView]);

  useEffect(() => setIndex((i) => Math.min(i, maxIndex)), [maxIndex]);

  const next = useCallback(() => setIndex((i) => (i >= maxIndex ? 0 : i + 1)), [maxIndex]);
  const prev = useCallback(() => setIndex((i) => (i <= 0 ? maxIndex : i - 1)), [maxIndex]);

  useEffect(() => {
    if (!autoplay || paused || maxIndex === 0) return undefined;
    const t = setInterval(next, autoplay);
    return () => clearInterval(t);
  }, [autoplay, paused, next, maxIndex]);

  // touch swipe
  const touch = useRef(null);
  const handlers = {
    onTouchStart: (e) => (touch.current = e.touches[0].clientX),
    onTouchEnd: (e) => {
      if (touch.current === null) return;
      const dx = e.changedTouches[0].clientX - touch.current;
      if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
      touch.current = null;
    },
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
  };

  const trackStyle = { transform: `translateX(-${(index * 100) / perView}%)` };
  const slideStyle = { flex: `0 0 ${100 / perView}%` };

  return { index, setIndex, next, prev, perView, pages: maxIndex + 1, trackStyle, slideStyle, handlers };
}

export function RoundArrow({ dir = 'right', onClick, className = '', label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label || (dir === 'right' ? 'Next' : 'Previous')}
      className={`grid size-[66px] place-items-center rounded-full border border-line bg-white text-navy transition-colors duration-300 hover:border-brand hover:bg-brand hover:text-white ${className}`}
    >
      <Icon name={dir === 'right' ? 'arrowRight' : 'arrowLeft'} size={18} strokeWidth={1.8} />
    </button>
  );
}

/* ---------- decorative long red arrow ---------- */

export function LongArrow({ dir = 'right', className = '' }) {
  return (
    <svg viewBox="0 0 240 44" fill="none" className={className} aria-hidden="true">
      {dir === 'right' ? (
        <path d="M0 22h236M216 2l20 20-20 20" stroke="#FE000B" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M240 22H4M24 2L4 22l20 20" stroke="#FE000B" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

/** The brand's slanted "1" stripe, used as a faint watermark. */
export function Stripes({ className = '' }) {
  return (
    <svg viewBox="0 0 460 330" fill="none" className={className} aria-hidden="true">
      <path d="M190 0h120L118 330H0z" fill="currentColor" />
      <path d="M352 0h108v40L285 330H160z" fill="currentColor" />
    </svg>
  );
}
