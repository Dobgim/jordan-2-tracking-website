import { LongArrow, Reveal, RoundArrow, useCarousel } from '../components/ui.jsx';
import { industries, industriesIntro } from '../data/site.jsx';

export default function Industries() {
  // duplicate the list so the loop always has slides to move through
  const slides = [...industries, ...industries];
  const c = useCarousel({ count: slides.length, perView: { base: 1, sm: 2, lg: 3, xl: 4 }, autoplay: 4500 });

  return (
    <section className="overflow-x-clip pt-[110px] lg:pt-[150px]">
      <div className="relative">
        <div className="container-x grid items-start gap-6 lg:grid-cols-[530px_340px] lg:gap-[70px] lg:px-[30px]">
          <Reveal as="h2" className="text-[38px] leading-[1.1] font-semibold sm:text-[55px]">
            {industriesIntro.title}
          </Reveal>
          <Reveal as="p" delay={150} className="pt-1 text-[17px]">
            {industriesIntro.text}
          </Reveal>
        </div>
        <LongArrow dir="left" className="absolute top-6 right-0 hidden w-[255px] animate-marquee-x xl:block" />
      </div>

      <div className="mt-14 flex gap-6 pr-4 pl-4 sm:pl-6 lg:mt-[70px] lg:pl-[max(24px,calc((100vw-1320px)/2+24px))] xl:pr-[15px]">
        <div className="hidden shrink-0 flex-col justify-center gap-3.5 md:flex">
          <RoundArrow dir="right" onClick={c.next} />
          <RoundArrow dir="left" onClick={c.prev} />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden" {...c.handlers}>
          <ul className="-mx-[15px] flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={c.trackStyle}>
            {slides.map((it, i) => (
              <li key={i} style={c.slideStyle} className="px-[15px]">
                <article className="group h-full rounded-xl border border-line bg-white p-[34px] transition-shadow duration-500 hover:shadow-[0_20px_50px_rgb(17_25_78/0.08)]">
                  <span
                    className={`grid size-[75px] place-items-center rounded-md transition-transform duration-500 group-hover:-translate-y-1 ${
                      i % 2 === 0 ? 'bg-brand' : 'bg-royal'
                    }`}
                  >
                    <img src={it.icon} alt="" className="size-9" />
                  </span>
                  <h3 className="mt-14 max-w-[230px] text-[26px] leading-[1.35] font-medium">
                    <a href="/services" className="transition-colors hover:text-brand">
                      {it.title}
                    </a>
                  </h3>
                  <p className="mt-5">{it.text}</p>
                </article>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex justify-center gap-3 md:hidden">
            <RoundArrow dir="left" onClick={c.prev} className="!size-12" />
            <RoundArrow dir="right" onClick={c.next} className="!size-12" />
          </div>
        </div>
      </div>
    </section>
  );
}
