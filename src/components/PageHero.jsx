import { Stripes } from './ui.jsx';
import { IMG } from '../data/site.jsx';

/** Banner at the top of every inner page: image, navy overlay, title, breadcrumb. */
export default function PageHero({ title, text, crumb, image = IMG('h4-1.webp'), children }) {
  return (
    <section className="container-wide">
      <div
        className="relative overflow-hidden rounded-[13px] bg-navy bg-cover bg-center px-5 py-16 sm:px-10 sm:py-20 lg:py-[110px]"
        style={{ backgroundImage: `url(${image})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900/90 via-navy/75 to-royal/50" aria-hidden="true" />
        <Stripes className="pointer-events-none absolute right-0 bottom-0 hidden h-full w-auto text-white/[0.06] md:block" />
        <div className="relative mx-auto max-w-[860px] text-center">
          <nav aria-label="Breadcrumb" className="flex flex-wrap justify-center gap-2 text-[14px] text-white/70">
            <a href="/" className="hover:text-white">
              Home
            </a>
            {(Array.isArray(crumb) ? crumb : [crumb || title]).map((c, i, arr) => (
              <span key={i} className="flex gap-2">
                <span aria-hidden="true">/</span>
                {typeof c === 'object' && i < arr.length - 1 ? (
                  <a href={c.href} className="hover:text-white">
                    {c.label}
                  </a>
                ) : (
                  <span className="text-white">{typeof c === 'object' ? c.label : c}</span>
                )}
              </span>
            ))}
          </nav>
          <h1 className="mt-4 text-[34px] leading-[1.15] font-semibold break-words text-white sm:text-[48px] lg:text-[60px]">{title}</h1>
          {text && <p className="mx-auto mt-4 max-w-[600px] text-[16px] text-white/80 sm:text-[17px]">{text}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}
