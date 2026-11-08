import { CutButton, Reveal, Stripes } from '../components/ui.jsx';
import { about } from '../data/site.jsx';

export default function About() {
  const [left, center, right] = about.images;
  return (
    <section id="about" className="relative mt-[110px] scroll-mt-24 lg:mt-[150px]">
      {/* navy band starts under the top of the centre photo */}
      <div className="absolute inset-x-0 top-[120px] bottom-0 overflow-hidden bg-gradient-to-r from-navy to-royal lg:top-[47px]" aria-hidden="true">
        <Stripes className="absolute bottom-0 left-0 h-[330px] w-auto text-white/[0.05]" />
      </div>

      <div className="relative">
        {/* photo collage */}
        <div className="grid grid-cols-2 gap-4 px-4 sm:gap-5 lg:grid-cols-[minmax(0,496fr)_minmax(0,449fr)_minmax(0,440fr)] lg:items-start lg:pr-0 lg:pl-[15px]">
          <Reveal className="hidden lg:mt-[122px] lg:block">
            <img src={left} alt="Logistics specialist checking a shipment" loading="lazy" className="aspect-[496/330] w-full rounded-lg object-cover" />
          </Reveal>
          <Reveal delay={120} className="col-span-2 sm:col-span-1">
            <img src={center} alt="TheJordans delivery truck" loading="lazy" className="aspect-[449/462] w-full rounded-lg object-cover" />
          </Reveal>
          <Reveal delay={240} className="hidden sm:block lg:mt-[247px]">
            <img src={right} alt="Fleet of trucks at a distribution centre" loading="lazy" className="aspect-[440/238] w-full rounded-l-lg object-cover sm:aspect-auto sm:h-full lg:aspect-[440/238] lg:h-auto" />
          </Reveal>
        </div>

        <div className="container-x pt-14 pb-[90px] lg:pt-[75px] lg:pb-[130px] lg:pl-[420px]">
          <Reveal as="h2" className="max-w-[660px] text-[38px] leading-[1.1] font-semibold text-white sm:text-[55px]">
            {about.title}
          </Reveal>
          <div className="mt-12 grid gap-10 lg:grid-cols-[465px_1fr] lg:gap-[35px]">
            <Reveal delay={100} className="space-y-6 text-white/85">
              {about.paragraphs.map((p) => (
                <p key={p.slice(0, 20)}>{p}</p>
              ))}
            </Reveal>
            <Reveal delay={200}>
              <ul className="space-y-[7px]">
                {about.points.map((pt) => (
                  <li key={pt} className="flex gap-3 font-heading text-[16px] font-medium text-white">
                    <span className="mt-[11px] size-[5px] shrink-0 rounded-full bg-white" />
                    {pt}
                  </li>
                ))}
              </ul>
              <CutButton href={about.cta.href} className="mt-6">
                {about.cta.label}
              </CutButton>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
