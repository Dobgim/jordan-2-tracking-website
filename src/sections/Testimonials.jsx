import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { CountUp, CutButton, Reveal } from '../components/ui.jsx';
import { IMG, partners, testimonials as t } from '../data/site.jsx';

function QuoteMark({ className = '' }) {
  return (
    <svg viewBox="0 0 23 19" className={className} aria-hidden="true">
      <path d="M4.3 0h6.2L6.9 19H0L4.3 0zm12.2 0H23l-3.9 19h-6.6L16.5 0z" fill="#FE000B" />
    </svg>
  );
}

function TestimonialSlider() {
  // loop through two copies so the strip never runs out
  const slides = [...t.items, ...t.items];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const strip = useRef(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const measure = () => {
      const first = strip.current?.children[0];
      if (first) setStep(first.getBoundingClientRect().width + 30);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => setI((v) => (v + 1) % t.items.length), 5500);
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className="min-w-0 overflow-hidden">
      <ul ref={strip} className="flex gap-[30px] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ transform: `translateX(-${i * step}px)` }}>
        {slides.map((s, idx) => (
          <li key={idx} className="flex w-[min(673px,calc(100vw-32px))] shrink-0 flex-col gap-2.5 sm:flex-row" aria-hidden={idx % t.items.length !== i}>
            <img src={s.image} alt={s.name} loading="lazy" className="h-[260px] w-full rounded-lg object-cover object-top sm:h-auto sm:w-[250px]" />
            <figure className="flex flex-1 flex-col rounded-xl bg-white p-9">
              <blockquote className="font-heading text-[19px] leading-[1.55] text-navy">{s.quote}</blockquote>
              <figcaption className="mt-auto flex items-center gap-4 pt-10">
                <QuoteMark className="h-[19px] w-[23px]" />
                <span>
                  <span className="block font-heading text-[17px] font-medium text-navy">{s.name}</span>
                  <span className="block text-[15px]">{s.role}</span>
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex gap-2.5">
        {t.items.map((s, idx) => (
          <button
            key={s.name}
            type="button"
            onClick={() => setI(idx)}
            aria-label={`Show review from ${s.name}`}
            className={`h-2 rounded-full transition-all duration-300 ${i === idx ? 'w-7 bg-brand' : 'w-2 bg-white/40 hover:bg-white/70'}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Testimonials() {
  return (
    <section className="pt-[100px] lg:pt-[140px]">
      <div className="relative lg:ml-[max(16px,calc((100vw-1320px)/2+24px))]">
        {/* white notch with the satisfaction figure */}
        <div className="relative z-10 flex items-center gap-5 bg-white px-4 py-6 sm:px-0 lg:absolute lg:top-0 lg:left-0 lg:h-[117px] lg:w-[410px] lg:rounded-br-[13px] lg:py-0">
          <Icon name="arrowRight" size={30} strokeWidth={1.8} className="hidden -translate-x-full text-brand lg:block lg:absolute lg:-left-12" />
          <p className="flex items-start font-heading text-[80px] leading-none font-medium tracking-tight text-navy lg:pl-4">
            <CountUp to={t.satisfaction} duration={1800} />
            <span className="mt-1 text-[32px] text-brand">%</span>
          </p>
          <span className="h-[72px] w-px bg-line" />
          <p className="font-heading text-[19px] leading-[1.45] font-medium text-navy">
            Client Satisfaction
            <br />
            Across Logistics
            <br />
            Operations
          </p>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-r from-royal to-navy lg:rounded-tl-[13px]">
          <img src={IMG('bggg.png')} alt="" aria-hidden="true" className="pointer-events-none absolute top-0 right-0 h-full w-auto max-w-none opacity-70" />
          <div className="relative grid gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[420px_minmax(0,1fr)] lg:gap-[78px] lg:py-[115px] lg:pt-[150px] lg:pr-0 lg:pl-[15px]">
            <Reveal>
              <h2 className="text-[38px] leading-[1.12] font-bold text-white sm:text-[54px]">{t.title}</h2>
              <p className="mt-7 max-w-[420px] font-heading text-[17px] text-white/90">{t.text}</p>
              <CutButton href="/#quote" className="mt-10">
                View All Reviews
              </CutButton>
            </Reveal>
            <Reveal delay={150} className="min-w-0 lg:-mt-[35px]">
              <TestimonialSlider />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Partners() {
  const cell =
    'grid min-h-[180px] place-items-center border-line bg-white transition-colors duration-300 hover:bg-mist sm:min-h-[227px] [&_img]:opacity-70 [&_img]:grayscale [&_img]:transition hover:[&_img]:opacity-100 hover:[&_img]:grayscale-0';
  return (
    <section className="container-x pt-[100px] lg:pt-[140px]">
      <div className="grid grid-cols-2 border-t border-l border-line sm:grid-cols-4 lg:grid-cols-6">
        {partners.logos.top.map((src) => (
          <div key={src} className={`${cell} border-r border-b`}>
            <img src={src} alt="Partner logo" loading="lazy" className="max-h-10 w-auto max-w-[130px]" />
          </div>
        ))}
        <Reveal className="col-span-2 flex flex-col justify-center border-b border-line bg-white px-6 py-10 sm:border-r lg:col-span-4 lg:border-r-0 lg:pl-20">
          <h2 className="max-w-[640px] text-[34px] leading-[1.12] font-semibold sm:text-[52px]">{partners.title}</h2>
          <p className="mt-6 text-[17px]">{partners.text}</p>
        </Reveal>
        {partners.logos.bottom.map((src) => (
          <div key={src} className={`${cell} border-r border-b`}>
            <img src={src} alt="Partner logo" loading="lazy" className="max-h-10 w-auto max-w-[130px]" />
          </div>
        ))}
        <a
          href="/#quote"
          className="group col-span-2 flex min-h-[200px] flex-col justify-between rounded-tr-[30px] bg-royal p-10 transition-colors duration-500 hover:bg-navy sm:col-span-4 lg:col-span-2"
        >
          <h3 className="text-[22px] font-medium text-white">Become A Partner</h3>
          <Icon name="arrowRight" size={30} strokeWidth={1.8} className="self-end text-brand transition-transform duration-300 group-hover:translate-x-2" />
        </a>
      </div>
    </section>
  );
}
