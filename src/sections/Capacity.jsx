import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { CountUp, Reveal } from '../components/ui.jsx';
import { capacity, expertise } from '../data/site.jsx';

function CapacityCarousel() {
  const [i, setI] = useState(0);
  const go = (d) => setI((v) => (v + d + capacity.length) % capacity.length);
  return (
    <div className="relative mx-auto max-w-[900px] text-center">
      <div className="overflow-hidden">
        <ul className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ transform: `translateX(-${i * 100}%)` }}>
          {capacity.map((s, idx) => (
            <li key={s.title} className="w-full shrink-0 px-12 sm:px-16" aria-hidden={idx !== i}>
              <h3 className="text-[22px] font-medium sm:text-[26px]">{s.title}</h3>
              <p className="mt-2 font-heading text-[64px] leading-[1.15] font-normal tracking-tight sm:text-[96px] lg:text-[130px]">
                <CountUp to={s.value} className="bg-gradient-to-b from-brand to-brand-dark bg-clip-text text-transparent" />
                {s.suffix && <span className="ml-2 align-top text-[0.35em] text-navy">{s.suffix}</span>}
              </p>
              <p className="mx-auto mt-4 max-w-[620px] text-[17px]">{s.text}</p>
            </li>
          ))}
        </ul>
      </div>
      <button type="button" onClick={() => go(-1)} aria-label="Previous figure" className="absolute top-1/2 left-0 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-line text-navy transition-colors hover:border-brand hover:bg-brand hover:text-white">
        <Icon name="arrowLeft" size={16} />
      </button>
      <button type="button" onClick={() => go(1)} aria-label="Next figure" className="absolute top-1/2 right-0 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-line text-navy transition-colors hover:border-brand hover:bg-brand hover:text-white">
        <Icon name="arrowRight" size={16} />
      </button>
    </div>
  );
}

export default function Capacity() {
  return (
    <section className="pt-[100px] lg:pt-[150px]">
      <div className="container-x">
        <Reveal>
          <CapacityCarousel />
        </Reveal>
      </div>

      <div className="relative mt-[70px] lg:mt-[90px]">
        {/* faint dotted "world" backdrop */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-[-70px] left-1/2 h-[360px] w-[1000px] max-w-full -translate-x-1/2 opacity-60 [background-image:radial-gradient(circle,#c9cde0_1.6px,transparent_1.8px)] [background-size:11px_11px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
        />
        <div className="container-x relative grid gap-[30px] sm:grid-cols-2 lg:grid-cols-4">
          {expertise.map((e, i) => (
            <Reveal key={e.title} delay={i * 100} className="group relative self-start rounded-xl border border-line bg-white/90 px-4 pt-10 pb-8 backdrop-blur-[1px] transition-shadow duration-500 hover:shadow-[0_20px_50px_rgb(17_25_78/0.08)]">
              <span className="absolute top-4 right-4 size-[19px] rounded-full border border-line transition-colors duration-500 group-hover:border-brand group-hover:bg-brand" aria-hidden="true" />
              <img src={e.icon} alt="" className="size-11" />
              <h3 className="mt-[34px] max-w-[230px] text-[22px] leading-[1.5] font-semibold">{e.title}</h3>
              <p className="mt-[18px] max-w-[260px]">{e.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
