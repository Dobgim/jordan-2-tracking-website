import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { company } from '../data/site.jsx';
import { goToTracking } from '../lib/navigation.js';

/** Bottom-left "back to top" button with a scroll-progress ring. */
export function ScrollTop() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const C = 2 * Math.PI * 21;
  const visible = progress > 0.04;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className={`fixed bottom-6 left-6 z-40 grid size-[46px] place-items-center rounded-full bg-[#141821] text-white shadow-lg transition-all duration-500 ${
        visible ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-4 opacity-0'
      }`}
    >
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 46 46" aria-hidden="true">
        <circle cx="23" cy="23" r="21" fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth="2" />
        <circle cx="23" cy="23" r="21" fill="none" stroke="#FE000B" strokeWidth="2" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
      </svg>
      <Icon name="arrowUp" size={18} strokeWidth={2.2} />
    </button>
  );
}

/** Bottom-right "Track & Help" support widget. */
export function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const track = (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setOpen(false);
    goToTracking(code);
  };

  const options = [
    { href: `tel:${company.supportPhone}`, icon: 'phone', color: 'text-navy', title: 'Call Us', sub: company.supportPhone },
    { href: company.whatsapp, icon: 'whatsapp', color: 'text-[#25D366]', title: 'WhatsApp', sub: 'Message us any time', external: true },
    { href: `mailto:${company.supportEmail}`, icon: 'mail', color: 'text-navy', title: 'Email Us', sub: 'We reply within a few hours' },
  ];

  return (
    <>
      <div className={`fixed inset-0 z-[60] transition-opacity ${open ? 'visible opacity-100' : 'invisible opacity-0'}`} onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="fixed right-[18px] bottom-6 z-[61]">
        <div
          role="dialog"
          aria-label="TheJordans support"
          className={`absolute right-0 bottom-[66px] w-[310px] max-w-[calc(100vw-36px)] origin-bottom-right overflow-hidden rounded-xl bg-white shadow-[0_24px_60px_rgb(17_25_78/0.25)] transition-all duration-300 ${
            open ? 'visible scale-100 opacity-100' : 'invisible scale-95 opacity-0'
          }`}
        >
          <div className="bg-navy px-5 py-4 text-white">
            <strong className="block font-heading text-[16px] font-semibold">TheJordans Support</strong>
            <span className="flex items-center gap-2 text-[13px] text-white/75">
              <span className="size-2 rounded-full bg-emerald-400" />
              Online — we usually reply instantly
            </span>
          </div>
          <form onSubmit={track} className="flex gap-2 border-b border-line p-4">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter a tracking number"
              aria-label="Tracking number"
              autoComplete="off"
              className="h-10 min-w-0 flex-1 rounded-md border border-line px-3 text-[14px] text-navy outline-none focus:border-navy"
            />
            <button type="submit" className="rounded-md bg-brand px-3.5 font-heading text-[13px] font-semibold tracking-wide text-white hover:bg-navy">
              TRACK
            </button>
          </form>
          <ul className="py-1.5">
            {options.map((o) => (
              <li key={o.title}>
                <a
                  href={o.href}
                  {...(o.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3.5 px-5 py-2.5 transition-colors hover:bg-mist"
                >
                  <span className={`grid size-9 place-items-center rounded-full bg-mist ${o.color}`}>
                    <Icon name={o.icon} size={17} />
                  </span>
                  <span>
                    <strong className="block font-heading text-[14px] font-semibold text-navy">{o.title}</strong>
                    <span className="block text-[13px] leading-tight">{o.sub}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="border-t border-line py-2.5 text-center text-[12px]">TheJordans · Logistics Support</p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="relative flex h-[50px] items-center gap-3 bg-navy pr-7 pl-7 text-white shadow-[0_10px_30px_rgb(17_25_78/0.35)] transition-colors hover:bg-royal [clip-path:polygon(8%_0,100%_0,94%_100%,0_100%)]"
        >
          <Icon name="truck" size={20} />
          <span className="text-left leading-none">
            <span className="block text-[14px] font-bold tracking-wide">TRACK &amp; HELP</span>
            <span className="mt-1 flex items-center gap-1.5 text-[10px] text-white/75">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Support online
            </span>
          </span>
        </button>
        <span className="pointer-events-none absolute top-0 -right-2.5 h-[50px] w-1 skew-x-[-14deg] bg-brand" aria-hidden="true" />
      </div>
    </>
  );
}
