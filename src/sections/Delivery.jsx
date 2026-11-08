import Icon from '../components/Icon.jsx';
import { CutButton, Reveal, Stripes } from '../components/ui.jsx';
import { deliveryCards } from '../data/site.jsx';

export default function Delivery() {
  return (
    <section className="container-wide pt-[100px] lg:pt-[140px]">
      <div className="grid gap-[30px] md:grid-cols-2 xl:grid-cols-3">
        {deliveryCards.map((c, i) => (
          <Reveal key={c.title} delay={i * 120}>
            <article className="group relative isolate flex min-h-[408px] flex-col overflow-hidden rounded-[13px] bg-gradient-to-br from-royal to-[#16228a] p-5">
              {/* photo: covers most of the card, slides away on hover/focus */}
              <img
                src={c.image}
                alt=""
                loading="lazy"
                className="absolute inset-0 z-10 size-full object-cover transition-[clip-path] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [clip-path:inset(0_32%_0_0)] group-focus-within:[clip-path:inset(0_100%_0_0)] group-hover:[clip-path:inset(0_100%_0_0)]"
              />
              <Stripes className="pointer-events-none absolute bottom-0 left-0 -z-10 h-[115px] w-auto text-white/10" />

              <div className="relative flex items-center gap-4 border-b border-white/10 pb-[18px]">
                <span className="relative z-20 grid size-[76px] shrink-0 place-items-center rounded-md bg-brand text-white">
                  <Icon name={c.icon} size={34} strokeWidth={1.6} />
                </span>
                <span className="font-heading text-[16px] text-white">{c.tag}</span>
              </div>
              <h3 className="relative mt-7 text-[25px] font-semibold text-white">{c.title}</h3>
              <p className="relative mt-3 text-[16px] leading-[1.65] text-white/85">{c.text}</p>
              <div className="relative mt-auto flex justify-end pt-8">
                <CutButton href="/#quote" className="!py-3.5 !pr-7">
                  Read More
                </CutButton>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
