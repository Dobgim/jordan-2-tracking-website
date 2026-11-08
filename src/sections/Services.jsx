import { CutButton, LongArrow, Reveal } from '../components/ui.jsx';
import { serviceBlocks, servicesIntro } from '../data/site.jsx';

function ServiceBlock({ block, flip }) {
  return (
    <Reveal className="relative rounded-xl border border-line bg-white">
      <div className={`grid items-stretch gap-8 p-5 sm:p-[26px] lg:grid-cols-2 lg:gap-10 ${flip ? 'xl:grid-cols-[554px_minmax(0,1fr)] xl:gap-[85px]' : 'xl:grid-cols-[minmax(0,1fr)_554px] xl:gap-[60px]'}`}>
        <div className={`flex min-w-0 flex-col justify-center py-4 lg:py-[22px] ${flip ? 'lg:order-2' : ''}`}>
          <h3 className="text-[28px] leading-tight font-semibold sm:text-[40px]">{block.title}</h3>
          <p className="mt-5 max-w-[470px]">{block.text}</p>
          <div className="mt-7">
            <CutButton href="/contact">{block.cta}</CutButton>
          </div>
          <h5 className="mt-14 text-[19px] font-medium">Service Included:</h5>
          <ul className="mt-6 flex max-w-[560px] flex-wrap gap-3">
            {block.included.map((item) => (
              <li key={item}>
                <a
                  href="/contact"
                  className="block rounded-md border border-line bg-mist px-4 py-[10px] font-heading text-[15px] sm:px-6 sm:py-[11px] sm:text-[16px] font-medium text-navy transition-colors duration-300 hover:border-navy hover:bg-navy hover:text-white"
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className={`relative ${flip ? 'lg:order-1' : ''}`}>
          <img
            src={block.image}
            alt=""
            loading="lazy"
            className="h-[300px] w-full rounded-[13px] object-cover sm:h-[380px] lg:h-full xl:absolute xl:inset-x-0 xl:-top-12 xl:-bottom-12 xl:h-[calc(100%+96px)]"
          />
        </div>
      </div>
    </Reveal>
  );
}

export default function Services() {
  return (
    <section id="services" className="overflow-x-clip scroll-mt-28 pt-[80px] lg:pt-[120px] xl:pt-[180px]">
      <div className="relative">
        <LongArrow className="absolute top-0 left-0 hidden w-[232px] animate-marquee-x xl:block" />
        <div className="container-x xl:pl-[254px]">
          <Reveal as="h2" className="max-w-[640px] text-[38px] leading-[1.1] font-semibold sm:text-[55px] xl:pt-[100px]">
            {servicesIntro.title}
          </Reveal>
          <Reveal as="p" delay={150} className="mt-6 max-w-[530px] text-[17px]">
            {servicesIntro.text}
          </Reveal>
        </div>
      </div>

      <div className="container-x mt-12 space-y-10 lg:mt-[70px] lg:space-y-14 xl:mt-[96px] xl:space-y-[88px]">
        {serviceBlocks.map((b, i) => (
          <ServiceBlock key={b.title} block={b} flip={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}
