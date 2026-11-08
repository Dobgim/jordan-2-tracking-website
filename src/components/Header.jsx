import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { useUI } from './ui.jsx';
import { IMG, nav, topbar } from '../data/site.jsx';

function Dropdown({ icon, label, items }) {
  return (
    <div className="group relative">
      <button type="button" className="flex items-center gap-2.5 text-[14px] text-body transition-colors hover:text-brand">
        <span className="grid size-8 place-items-center rounded-full border border-line text-navy">
          <Icon name={icon} size={15} />
        </span>
        {label}
        <Icon name="chevronDown" size={13} strokeWidth={2} className="-ml-1 transition-transform group-hover:rotate-180" />
      </button>
      <ul className="invisible absolute top-full right-0 z-30 mt-3 min-w-[190px] translate-y-2 rounded-lg border border-line bg-white py-2 opacity-0 shadow-xl shadow-navy/10 transition-all duration-300 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        {items.map((item) => (
          <li key={item}>
            <a href="#" onClick={(e) => e.preventDefault()} className="block px-4 py-1.5 text-[14px] text-body hover:text-brand">
              {item}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TopBar() {
  return (
    <div className="container-wide hidden xl:block">
      <div className="flex h-[62px] items-center justify-between border-b border-line">
        <p className="text-[14px] text-body">
          <strong className="font-semibold text-navy">{topbar.update.label}</strong> {topbar.update.text}
        </p>
        <div className="flex items-center gap-6">
          <a href="/#quote" className="flex items-center gap-2.5 text-[14px] text-body transition-colors hover:text-brand">
            <span className="grid size-8 place-items-center rounded-full border border-line text-navy">
              <Icon name="returnArrow" size={15} />
            </span>
            Free Returns
          </a>
          <Dropdown icon="globe" label="En" items={topbar.languages.slice(1)} />
          <Dropdown icon="pin" label="Find Closest Location" items={topbar.locations} />
          <a href="/#quote" className="flex items-center gap-2.5 text-[14px] text-body transition-colors hover:text-brand">
            <span className="grid size-8 place-items-center rounded-full border border-line text-navy">
              <Icon name="headset" size={15} />
            </span>
            Support
          </a>
        </div>
      </div>
    </div>
  );
}

const isActive = (href) => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return href === '/track' ? path.startsWith('/track') : href === '/' && path === '/';
};

function MainBar({ sticky = false }) {
  const { open } = useUI();
  return (
    <div className="container-wide">
      <div className={`flex items-center justify-between gap-6 ${sticky ? 'h-[95px]' : 'h-[80px] xl:h-[106px]'}`}>
        <a href="/" className="shrink-0" aria-label="TheJordans home">
          <img src={IMG('logo.webp')} alt="TheJordans" width="163" height="40" className="h-9 w-auto xl:h-[42px]" />
        </a>

        <nav aria-label="Main" className="mr-auto hidden rounded-md xl:ml-[22px] border border-line bg-mist px-4 lg:block">
          <ul className="flex h-[54px] items-center">
            {nav.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className={`relative block px-[13px] py-2 font-heading text-[15px] transition-colors hover:text-brand ${
                    isActive(item.href) ? 'text-brand' : 'text-navy'
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button type="button" onClick={() => open('search')} aria-label="Search" className="grid size-10 place-items-center text-navy transition-colors hover:text-brand">
            <Icon name="search" size={22} strokeWidth={2} />
          </button>
          <button type="button" onClick={() => open('account')} aria-label="Account" className="hidden size-8 place-items-center text-navy transition-colors hover:text-brand sm:grid">
            <Icon name="user" size={20} strokeWidth={2} />
          </button>
          <button type="button" onClick={() => open('cart')} aria-label="Cart" className="relative hidden size-10 place-items-center text-navy transition-colors hover:text-brand sm:grid">
            <Icon name="cart" size={24} strokeWidth={2} />
          </button>
          <a href="/track" className="btn-cut ml-3 hidden !py-4 md:inline-flex">
            <span className="btn-dot">
              <Icon name="arrowRight" size={13} strokeWidth={2.2} />
            </span>
            Track And Trace
          </a>
          <button
            type="button"
            onClick={() => open('menu')}
            aria-label="Open menu"
            className="ml-1 grid size-11 place-items-center rounded-md bg-navy text-white lg:hidden"
          >
            <Icon name="menu" size={22} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 320);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header>
      <TopBar />
      <MainBar />
      <div
        className={`fixed inset-x-0 top-0 z-50 bg-white shadow-[0_6px_30px_rgb(17_25_78/0.08)] transition-transform duration-500 ${
          stuck ? 'translate-y-0' : '-translate-y-full'
        }`}
        aria-hidden={!stuck}
        inert={stuck ? undefined : ''}
      >
        <MainBar sticky />
      </div>
    </header>
  );
}
