import { useState } from 'react';
import Icon from './Icon.jsx';
import { CloseButton, CutButton, Overlay, useUI } from './ui.jsx';
import { IMG, company, footer, nav } from '../data/site.jsx';
import { goToTracking } from '../lib/navigation.js';

export function Socials({ className = '', tone = 'royal' }) {
  const tones = {
    royal: 'bg-royal text-white hover:bg-brand',
    light: 'bg-mist text-navy hover:bg-brand hover:text-white',
  };
  return (
    <ul className={`flex gap-2.5 ${className}`}>
      {footer.socials.map((s) => (
        <li key={s}>
          <a href="#" onClick={(e) => e.preventDefault()} aria-label={s} className={`grid size-[46px] place-items-center rounded-full transition-colors duration-300 ${tones[tone]}`}>
            <Icon name={s} size={16} />
          </a>
        </li>
      ))}
    </ul>
  );
}

function SidePanel() {
  const { overlay, close } = useUI();
  const rows = [
    { icon: 'pin', title: 'Our Location', lines: [company.address, company.city + '.'] },
    { icon: 'phone', title: 'Contact Us', lines: [company.phone, company.email] },
    { icon: 'clock', title: 'Working Hours', lines: company.hours },
  ];
  return (
    <Overlay show={overlay === 'panel'} onClose={close} label="About TheJordans">
      <aside className="flex h-full flex-col overflow-y-auto bg-white px-8 py-10 sm:px-11">
        <div className="flex items-center justify-between">
          <img src={IMG('logo.webp')} alt="TheJordans" className="h-10 w-auto" />
          <CloseButton onClick={close} />
        </div>
        <p className="mt-8">We provide comprehensive solutions for logistics, warehousing, and infrastructure related to the transportation and storage of goods.</p>
        <ul className="mt-8 space-y-7">
          {rows.map((r) => (
            <li key={r.title} className="flex gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-white">
                <Icon name={r.icon} size={20} />
              </span>
              <div>
                <h5 className="text-[17px] font-semibold">{r.title}</h5>
                {r.lines.map((l) => (
                  <p key={l} className="leading-relaxed">
                    {l}
                  </p>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <Socials className="mt-9" tone="light" />
        <CutButton href="/#quote" className="mt-auto self-start" onClick={close}>
          Request a quote
        </CutButton>
      </aside>
    </Overlay>
  );
}

function SearchPopup() {
  const { overlay, close } = useUI();
  const [q, setQ] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    close();
    // tracking numbers (e.g. TJ-240001) go straight to the tracking page
    if (/^[a-z]{2,4}-?\d{3,}$/i.test(term)) return goToTracking(term);
    const hit = [...document.querySelectorAll('main h2, main h3, main h4, main h5')].find((h) =>
      h.textContent.toLowerCase().includes(term.toLowerCase())
    );
    hit?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  return (
    <Overlay show={overlay === 'search'} onClose={close} side="top" label="Search">
      <div className="bg-white py-14 sm:py-20">
        <div className="container-x relative">
          <CloseButton onClick={close} className="absolute -top-8 right-4 sm:-top-10 sm:right-6" />
          <form onSubmit={submit} className="flex items-center gap-3 border-b-2 border-navy pb-3" role="search">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search the site or enter a tracking number…"
              aria-label="Search"
              className="min-w-0 flex-1 bg-transparent font-heading text-xl text-navy outline-none placeholder:text-body/70 sm:text-3xl"
            />
            <button type="submit" aria-label="Search" className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-white">
              <Icon name="search" size={20} strokeWidth={2} />
            </button>
          </form>
          <div className="mt-6 flex flex-wrap gap-2">
            {nav.map((n) => (
              <a key={n.label} href={n.href} onClick={close} className="rounded-md bg-mist px-4 py-1.5 text-[14px] text-navy hover:bg-navy hover:text-white">
                {n.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </Overlay>
  );
}

function Field({ icon, ...props }) {
  return (
    <label className="flex items-center gap-3 rounded-md border border-line bg-white px-4 transition-colors focus-within:border-navy">
      <input {...props} className="h-[52px] min-w-0 flex-1 bg-transparent text-navy outline-none placeholder:text-body/80" />
      <Icon name={icon} size={17} className="text-body" />
    </label>
  );
}

function AccountModal() {
  const { overlay, close } = useUI();
  const [mode, setMode] = useState('login');
  const [note, setNote] = useState('');
  const submit = (e) => {
    e.preventDefault();
    setNote(
      mode === 'login'
        ? 'Customer accounts are coming soon. To follow a delivery, use your tracking number on the Tracking page.'
        : 'Thanks! Customer registration opens soon — our team will be in touch.'
    );
  };
  const swap = (m) => {
    setMode(m);
    setNote('');
  };
  return (
    <Overlay show={overlay === 'account'} onClose={close} side="center" label="Account">
      <div className="relative max-h-[90vh] w-[520px] max-w-full overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl sm:p-10">
        <CloseButton onClick={close} className="absolute top-5 right-5 !size-9" />
        <div className="mb-7 flex gap-6 border-b border-line">
          {[
            ['login', 'Log in with your Account'],
            ['register', 'Register an Account'],
          ].map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => swap(m)}
              className={`-mb-px border-b-2 pb-3 font-heading text-[15px] transition-colors ${mode === m ? 'border-brand text-navy' : 'border-transparent text-body hover:text-navy'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <h3 className="mb-6 text-2xl font-semibold">{mode === 'login' ? 'Sign In' : 'Register An Account'}</h3>
        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' ? (
            <>
              <Field icon="user" placeholder="Username" required />
              <Field icon="mail" type="email" placeholder="Email Address" required />
              <Field icon="lock" type="password" placeholder="Password" required />
              <Field icon="lock" type="password" placeholder="Confirm Password" required />
            </>
          ) : (
            <>
              <Field icon="user" placeholder="Username or Email" required />
              <Field icon="lock" type="password" placeholder="Password" required />
              <div className="flex items-center justify-between text-[14px]">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="accent-brand" /> Remember Me
                </label>
                <a href="#" onClick={(e) => e.preventDefault()} className="text-navy hover:text-brand">
                  Forgot Password?
                </a>
              </div>
            </>
          )}
          <CutButton type="submit" className="w-full justify-center">
            {mode === 'login' ? 'Log In' : 'Create Account'}
          </CutButton>
          {note && <p className="rounded-md bg-mist px-4 py-3 text-[14px] text-navy" role="status">{note}</p>}
          <p className="text-center text-[14px]">
            {mode === 'login' ? 'Not registered? ' : 'Already have an account? '}
            <button type="button" onClick={() => swap(mode === 'login' ? 'register' : 'login')} className="font-semibold text-brand">
              {mode === 'login' ? 'Create an account' : 'Sign In Now'}
            </button>
          </p>
        </form>
      </div>
    </Overlay>
  );
}

function CartDrawer() {
  const { overlay, close } = useUI();
  return (
    <Overlay show={overlay === 'cart'} onClose={close} label="Cart">
      <aside className="flex h-full flex-col bg-white p-8">
        <div className="flex items-center justify-between border-b border-line pb-5">
          <h3 className="text-xl font-semibold">Shopping Cart</h3>
          <CloseButton onClick={close} className="!size-9" />
        </div>
        <div className="grid flex-1 place-items-center text-center">
          <div>
            <img src={IMG('cart2.png')} alt="" className="mx-auto w-28" />
            <p className="mt-4 font-heading text-lg text-navy">Your cart is currently empty.</p>
            <CutButton href="/#services" className="mt-6" onClick={close}>
              Explore Services
            </CutButton>
          </div>
        </div>
      </aside>
    </Overlay>
  );
}

function MobileMenu() {
  const { overlay, close, open } = useUI();
  return (
    <Overlay show={overlay === 'menu'} onClose={close} side="left" label="Menu">
      <aside className="flex h-full flex-col overflow-y-auto bg-white p-7">
        <div className="flex items-center justify-between">
          <img src={IMG('logo.webp')} alt="TheJordans" className="h-9 w-auto" />
          <CloseButton onClick={close} className="!size-9" />
        </div>
        <nav className="mt-8" aria-label="Mobile">
          <ul className="divide-y divide-line border-y border-line">
            {nav.map((n) => (
              <li key={n.label}>
                <a href={n.href} onClick={close} className="flex items-center justify-between py-3.5 font-heading text-[16px] text-navy hover:text-brand">
                  {n.label}
                  <Icon name="arrowRight" size={15} />
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => open('account')} className="flex flex-1 items-center justify-center gap-2 rounded-md bg-mist py-3 text-navy">
            <Icon name="user" size={18} /> Account
          </button>
          <button type="button" onClick={() => open('cart')} className="flex flex-1 items-center justify-center gap-2 rounded-md bg-mist py-3 text-navy">
            <Icon name="cart" size={18} /> Cart
          </button>
        </div>
        <CutButton href="/track" className="mt-6 justify-center" onClick={close}>
          Track And Trace
        </CutButton>
        <div className="mt-auto pt-8 text-[14px]">
          <a href={company.phoneHref} className="block font-heading text-navy">
            {company.phone}
          </a>
          <a href={`mailto:${company.email}`} className="block">
            {company.email}
          </a>
        </div>
      </aside>
    </Overlay>
  );
}

function VideoModal() {
  const { overlay, close } = useUI();
  const src = overlay?.video;
  return (
    <Overlay show={Boolean(src)} onClose={close} side="center" label="Video">
      <div className="relative w-[min(92vw,960px)] -translate-x-0">
        <CloseButton onClick={close} className="absolute -top-14 right-0" />
        <div className="aspect-video overflow-hidden rounded-xl bg-black">
          {src && <iframe src={src} title="TheJordans video" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="size-full" />}
        </div>
      </div>
    </Overlay>
  );
}

export default function Overlays() {
  return (
    <>
      <SidePanel />
      <SearchPopup />
      <AccountModal />
      <CartDrawer />
      <MobileMenu />
      <VideoModal />
    </>
  );
}
