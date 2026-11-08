import { useState } from 'react';
import Icon from './Icon.jsx';
import { Socials } from './Overlays.jsx';
import { CutButton } from './ui.jsx';
import { IMG, company, footer } from '../data/site.jsx';
import { subscribe } from '../lib/publicApi.js';

function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const submit = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return setStatus({ state: 'error', message: 'Please enter your email address.' });
    setStatus({ state: 'sending', message: '' });
    try {
      const result = await subscribe(value);
      setEmail('');
      setStatus({ state: 'sent', message: result === 'exists' ? "You're already subscribed — thank you!" : 'Thanks for subscribing!' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };
  return (
    <form onSubmit={submit} className="w-full lg:max-w-[426px]">
      <label className="flex h-[55px] items-center rounded-[3px] bg-white pr-2 pl-5">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your Email Address*"
          aria-label="Email address"
          autoComplete="email"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-navy outline-none placeholder:text-body"
        />
        <button type="submit" aria-label="Subscribe" disabled={status.state === 'sending'} className="grid size-10 place-items-center text-brand transition-transform hover:translate-x-0.5">
          <svg width="20" height="18" viewBox="0 0 20 18" fill="currentColor" aria-hidden="true">
            <path d="M19.4 8.1L1.6.2C.9-.1.1.6.4 1.4L2.9 9 .4 16.6c-.3.8.5 1.5 1.2 1.2l17.8-7.9c.8-.4.8-1.5 0-1.8zM4.4 8.1L2.8 3.5 14.6 8.1H4.4zm0 1.8h10.2L2.8 14.5l1.6-4.6z" />
          </svg>
        </button>
      </label>
      {status.message && (
        <p role="status" className={`mt-2 text-[14px] ${status.state === 'sent' ? 'text-emerald-300' : 'text-red-300'}`}>
          {status.message}
        </p>
      )}
    </form>
  );
}

export default function Footer() {
  return (
    <footer className="bg-navy text-white/80">
      <div className="container-x">
        <div className="flex flex-col gap-8 border-b border-white/10 py-[70px] lg:flex-row lg:items-center lg:justify-between lg:py-[95px] lg:pb-[58px]">
          <a href="/" aria-label="TheJordans home">
            <img src={IMG('logo-light.webp')} alt="TheJordans" className="h-[54px] w-auto" loading="lazy" />
          </a>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-[46px]">
            <div className="flex items-center gap-5">
              <span className="grid size-[30px] shrink-0 place-items-center rounded-full border border-white/15">
                <span className="size-[7px] rounded-full bg-brand" />
              </span>
              <p className="w-[260px] shrink-0 font-heading text-[19px] leading-[1.55] font-medium text-white">{footer.newsletter}</p>
            </div>
            <Newsletter />
          </div>
        </div>

        <div className="grid gap-12 py-14 md:grid-cols-2 lg:grid-cols-[432px_425px_1fr] lg:gap-0 lg:py-0">
          <div className="lg:border-r lg:border-white/10 lg:py-[60px] lg:pr-10">
            <h3 className="max-w-[260px] text-[30px] leading-[1.33] font-medium text-white">{footer.cta}</h3>
            <CutButton href="/#quote" className="mt-9">
              Request a quote
            </CutButton>
          </div>
          <div className="lg:border-r lg:border-white/10 lg:py-[60px] lg:pl-14">
            <h3 className="text-[20px] font-medium text-white">Quick Links</h3>
            <div className="mt-8 grid max-w-[340px] grid-cols-2 gap-x-10 whitespace-nowrap">
              {footer.links.map((col, i) => (
                <ul key={i} className="space-y-[7px]">
                  {col.map((l) => (
                    <li key={l.label}>
                      <a href={l.href} className="font-heading text-[16px] text-white/80 transition-colors hover:text-brand">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
          <div className="lg:py-[60px] lg:pl-10">
            <ul className="space-y-3.5 font-heading text-[19px] font-medium text-white">
              <li>
                <a href={company.phoneHref} className="hover:text-brand">
                  {company.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${company.email}`} className="hover:text-brand">
                  {company.email}
                </a>
              </li>
              <li>
                <a href="https://www.google.com/maps/search/?api=1&query=1234+Elmwood+Ave+Atlanta+GA" target="_blank" rel="noopener noreferrer" className="hover:text-brand">
                  {company.addressShort}
                </a>
              </li>
            </ul>
            <Socials className="mt-10" />
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 py-7 text-[16px] md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} TheJordans. All Rights Reserved.</p>
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {footer.legal.map((item, i) => (
              <li key={item} className="flex items-center gap-3">
                {i > 0 && <span className="size-1 rounded-full bg-brand" aria-hidden="true" />}
                <a href="#" onClick={(e) => e.preventDefault()} className="font-heading text-white transition-colors hover:text-brand">
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
