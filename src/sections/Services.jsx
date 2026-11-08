import { CutButton, LongArrow, Reveal } from '../components/ui.jsx';
import { serviceBlocks, servicesIntro } from '../data/site.jsx';

function ServiceBlock({ block, flip }) {
  return (
    <Reveal className="relative rounded-xl border border-line bg-white">
      <div className={`grid items-stretch gap-8 p-5 sm:p-[26px] lg:gap-[60px] ${flip ? 'lg:grid-cols-[554px_minmax(0,1fr)] lg:gap-[85px]' : 'lg:grid-cols-[minmax(0,1fr)_554px]'}`}>
        <div className={`flex flex-col justify-center py-4 lg:py-[22px] ${flip ? 'lg:order-2' : ''}`}>
          <h3 className="text-[32px] leading-tight font-semibold sm:text-[40px]">{block.title}</h3>
          <p className="mt-5 max-w-[470px]">{block.text}</p>
          <div className="mt-7">
            <CutButton href="/#quote">{block.cta}</CutButton>
          </div>
          <h5 className="mt-14 text-[19px] font-medium">Service Included:</h5>
          <ul className="mt-6 flex max-w-[560px] flex-wrap gap-3">
            {block.included.map((item) => (
              <li key={item}>
                <a
                  href="/#quote"
                  className="block rounded-md border border-line bg-mist px-6 py-[11px] font-heading text-[16px] font-medium text-navy transition-colors duration-300 hover:border-navy hover:bg-navy hover:text-white"
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className={`relative min-h-[320px] ${flip ? 'lg:order-1' : ''}`}>
          <img
            src={block.image}
            alt=""
            loading="lazy"
            className="size-full rounded-[13px] object-cover lg:absolute lg:inset-x-0 lg:-top-12 lg:-bottom-12 lg:h-[calc(100%+96px)]"
          />
        </div>
      </div>
    </Reveal>
  );
}

export default function Services() {
  return (
    <section id="services" className="scroll-mt-28 pt-[100px] lg:pt-[180px]">
      <div className="relative">
        <LongArrow className="absolute top-0 left-0 hidden w-[232px] animate-marquee-x lg:block" />
        <div className="container-x lg:pl-[254px]">
          <Reveal as="h2" className="max-w-[640px] text-[38px] leading-[1.1] font-semibold sm:text-[55px] lg:pt-[100px]">
            {servicesIntro.title}
          </Reveal>
          <Reveal as="p" delay={150} className="mt-6 max-w-[530px] text-[17px]">
            {servicesIntro.text}
          </Reveal>
        </div>
      </div>

      <div className="container-x mt-16 space-y-[88px] lg:mt-[96px] lg:space-y-[88px]">
        {serviceBlocks.map((b, i) => (
          <ServiceBlock key={b.title} block={b} flip={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}
