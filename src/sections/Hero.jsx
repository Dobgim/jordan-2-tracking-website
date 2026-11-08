import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { ArrowLink, CutButton, Reveal, useUI } from '../components/ui.jsx';
import { company, getStarted, hero, heroStats } from '../data/site.jsx';
import { goToTracking } from '../lib/navigation.js';

function TrackCard() {
  const [code, setCode] = useState('');
  const [hint, setHint] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    if (code.trim()) goToTracking(code);
  };
  return (
    <form
      onSubmit={submit}
      className="relative z-10 bg-white px-6 pt-9 pb-10 shadow-[0_-20px_40px_rgb(17_25_78/0.06)] sm:px-10 lg:rounded-t-[13px]"
      aria-label="Track your order"
    >
      <h2 className="text-[26px] font-medium">Track Your Order</h2>
      <label className="mt-6 flex items-center gap-3 border-b border-line pb-3">
        <svg width="20" height="21" viewBox="0 0 20 21" fill="none" aria-hidden="true" className="shrink-0">
          <path
            d="M18.72 4.7L10.47.19a1.5 1.5 0 0 0-1.44 0L.78 4.7A1.5 1.5 0 0 0 0 6.01v8.97c0 .55.3 1.05.78 1.31l8.25 4.52c.45.24.99.24 1.44 0l8.25-4.52c.48-.26.78-.76.78-1.31V6.02c0-.55-.3-1.05-.78-1.32zM9.75 1.5l7.53 4.12-2.79 1.53-7.53-4.12L9.75 1.5zm0 8.25L2.22 5.62l3.18-1.74 7.53 4.13-3.18 1.74zM1.5 6.94L9 11.04v8.04l-7.5-4.1V6.94zM18 14.98l-7.5 4.1v-8.04l3-1.64v3.35a.75.75 0 0 0 1.5 0V8.58l3-1.64v8.04z"
            fill="#FE000B"
          />
        </svg>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Your Shipping Tracking Code *"
          aria-label="Tracking code"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-[16px] text-navy outline-none placeholder:text-body"
        />
        <span className="relative">
          <button
            type="button"
            onMouseEnter={() => setHint(true)}
            onMouseLeave={() => setHint(false)}
            onFocus={() => setHint(true)}
            onBlur={() => setHint(false)}
            aria-label="Help"
            className="grid size-[30px] place-items-center rounded-full bg-royal text-white"
          >
            <span className="text-[15px] leading-none">?</span>
          </button>
          <span
            role="tooltip"
            className={`absolute right-0 bottom-full mb-3 w-56 rounded-md bg-navy px-3 py-2 text-[13px] leading-snug text-white shadow-lg transition-all ${
              hint ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-1 opacity-0'
            }`}
          >
            Track shipments worldwide with your service provider.
          </span>
        </span>
      </label>
      <CutButton type="submit" variant="light" className="mt-8 border border-line">
        Follow Order
      </CutButton>
    </form>
  );
}

export default function Hero() {
  const { open } = useUI();
  return (
    <section className="container-wide" id="top">
      <div className="relative flex flex-col">
        {/* image */}
        <div
          className="relative overflow-hidden rounded-[13px] bg-navy bg-cover bg-[30%_center] xl:rounded-br-none"
          style={{ backgroundImage: `url(${hero.image})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-navy-900/70 via-navy-900/25 to-transparent" aria-hidden="true" />
          <div className="relative flex min-h-[500px] flex-col px-5 pt-5 pb-14 sm:min-h-[560px] sm:px-8 lg:px-12 xl:min-h-[619px] xl:pt-[31px] xl:pr-[30px] xl:pb-[130px] xl:pl-[75px]">
            <div className="flex items-center justify-end gap-5 text-white">
              <p className="font-heading text-[15px] opacity-90 sm:text-[18px]">
                Support: <a href={company.phoneHref}>{company.phone}</a>
              </p>
              <span className="hidden h-6 w-px bg-white/30 xl:block" />
              <button
                type="button"
                onClick={() => open('panel')}
                aria-label="Open info panel"
                className="hidden size-10 place-items-center transition-transform duration-500 hover:rotate-90 xl:grid"
              >
                <svg width="21" height="21" viewBox="0 0 21 21" fill="#fff" aria-hidden="true">
                  <rect width="6" height="6" rx="3" />
                  <rect x="15" width="6" height="6" rx="3" />
                  <rect y="15" width="6" height="6" rx="3" />
                  <rect x="15" y="15" width="6" height="6" rx="3" />
                </svg>
              </button>
            </div>

            <div className="mt-10 max-w-[640px] sm:mt-14 xl:mt-[64px]">
              <Reveal as="h1" delay={150} className="max-w-[560px] text-[32px] leading-[1.18] break-words xs:text-[38px] font-semibold text-white sm:text-[48px] xl:text-[55px] xl:leading-[65px]">
                {hero.title}
              </Reveal>
              <Reveal as="p" delay={300} className="mt-6 max-w-[540px] text-[16px] text-white/85 sm:text-[17px]">
                {hero.text}
              </Reveal>
              <Reveal delay={450} className="mt-9 flex flex-wrap gap-4">
                <CutButton href={hero.primary.href}>{hero.primary.label}</CutButton>
                <CutButton href={hero.secondary.href} variant="light">
                  {hero.secondary.label}
                </CutButton>
              </Reveal>
            </div>
          </div>
        </div>

        {/* tracking card: sits over the image on desktop */}
        <div className="mt-4 overflow-hidden rounded-[13px] border border-line xl:absolute xl:right-5 xl:bottom-0 xl:mt-0 xl:w-[548px] xl:rounded-none xl:rounded-t-[13px] xl:border-0">
          <TrackCard />
        </div>

        {/* stats bar */}
        <div className="relative z-0 mt-4 rounded-[13px] bg-gradient-to-r from-royal to-navy xl:mt-0 xl:rounded-t-none xl:pr-[588px]">
          <ul className="grid gap-5 px-5 py-7 sm:grid-cols-2 md:grid-cols-3 xl:flex xl:h-[150px] xl:items-center xl:gap-10 xl:py-0">
            {heroStats.map((s) => (
              <li key={s.label} className="flex items-center gap-4">
                <span className="grid size-[54px] shrink-0 place-items-center rounded-full border border-white/25 text-white xl:size-[64px]">
                  <Icon name={s.icon} size={26} strokeWidth={1.5} />
                </span>
                <span className="font-heading text-[17px] font-medium text-white xl:text-[19px] xl:whitespace-nowrap">{s.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function GetStarted() {
  return (
    <section className="container-x mt-[40px] lg:mt-[50px]">
      <div className="grid gap-[30px] md:grid-cols-2 lg:grid-cols-3">
        {getStarted.map((c, i) => (
          <Reveal key={c.title} delay={i * 120} className="group relative rounded-xl border border-line bg-white p-6 pt-[44px] sm:p-[35px] sm:pt-[44px] transition-shadow duration-500 hover:shadow-[0_20px_50px_rgb(17_25_78/0.08)]">
            <span className="absolute top-0 left-10 h-[48px] w-1 rounded-b bg-line transition-colors duration-500 group-hover:bg-brand" aria-hidden="true" />
            <span className="absolute top-[18px] right-5 grid size-[60px] place-items-center rounded-lg border border-line text-royal transition-colors duration-500 group-hover:bg-royal group-hover:text-white">
              <Icon name={c.icon} size={28} strokeWidth={1.6} />
            </span>
            <h3 className="mt-14 text-[24px] font-normal">{c.title}</h3>
            <p className="mt-3 max-w-[320px]">{c.text}</p>
            <ArrowLink href={c.link.href} className="mt-6">
              {c.link.label}
            </ArrowLink>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
