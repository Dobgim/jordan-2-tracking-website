import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { CutButton, Reveal, useUI } from '../components/ui.jsx';
import { freightModes, sustainability as s } from '../data/site.jsx';

function Accordion() {
  const [open, setOpen] = useState(0);
  return (
    <ul>
      {s.faqs.map((f, i) => {
        const isOpen = open === i;
        return (
          <li key={f.q + i} className="border-b border-line">
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-6 py-[18px] text-left font-heading text-[20px] font-medium text-navy"
              >
                {f.q}
                <span
                  className={`grid size-[30px] shrink-0 place-items-center rounded-[3px] transition-colors duration-300 ${
                    isOpen ? 'bg-brand text-white' : 'bg-mist text-navy'
                  }`}
                >
                  <Icon name={isOpen ? 'minus' : 'plus'} size={16} strokeWidth={1.6} />
                </span>
              </button>
            </h3>
            <div className={`grid transition-[grid-template-rows] duration-500 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden">
                <p className="border-t border-line pt-6 pb-6">{f.a}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function Sustainability() {
  const { open } = useUI();
  return (
    <section id="sustainability" className="container-x scroll-mt-28 pt-[110px] lg:pt-[150px]">
      <Reveal as="h2" className="max-w-[820px] text-[38px] leading-[1.1] font-semibold sm:text-[55px]">
        {s.title}
      </Reveal>

      <div className="mt-10 lg:mt-[70px]">
        <Reveal className="relative z-10 flex flex-col gap-7 sm:flex-row sm:items-start sm:justify-between lg:h-[124px] lg:pl-[482px]">
          <p className="max-w-[450px] border-l-2 border-brand pl-[33px]">{s.text}</p>
          <CutButton href="/#quote" className="self-start">
            Explore More
          </CutButton>
        </Reveal>

        <div className="mt-10 grid gap-12 lg:mt-[-124px] lg:grid-cols-[660px_1fr] lg:gap-[89px]">
          <Reveal className="relative">
            <div className="relative h-[340px] overflow-hidden rounded-[13px] bg-black sm:h-[440px] lg:h-[538px]">
              <img src={s.image} alt="Aerial view of a distribution centre with trucks at the loading bays" loading="lazy" className="size-full object-cover lg:h-[500px]" />
            </div>
            {/* notch the paragraph sits in */}
            <span className="absolute top-0 right-0 hidden h-[124px] w-[238px] rounded-bl-[13px] bg-white lg:block" aria-hidden="true" />
            <button
              type="button"
              onClick={() => open({ video: s.video })}
              aria-label="Play video"
              className="absolute right-10 bottom-10 grid size-[88px] animate-pulse-ring place-items-center rounded-full bg-brand text-white transition-transform duration-300 hover:scale-105"
            >
              <Icon name="play" size={26} />
            </button>
          </Reveal>
          <Reveal delay={150} className="lg:pt-[194px]">
            <Accordion />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function FreightModes() {
  return (
    <section className="container-x pt-[100px] lg:pt-[140px]">
      <div className="grid gap-12 md:grid-cols-3 md:gap-0">
        {freightModes.map((m, i) => (
          <Reveal
            key={m.title}
            delay={i * 120}
            className={`group md:pr-10 ${i > 0 ? 'md:border-l md:border-line md:pl-[60px]' : ''}`}
          >
            <span className="grid size-[87px] place-items-center rounded-full bg-royal text-white transition-colors duration-500 group-hover:bg-brand">
              <Icon name={m.icon} size={34} strokeWidth={1.6} />
            </span>
            <h3 className="mt-10 max-w-[280px] text-[22px] leading-[1.36] font-medium">{m.title}</h3>
            <p className="mt-4 max-w-[350px]">{m.text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
