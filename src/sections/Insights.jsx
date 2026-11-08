import Icon from '../components/Icon.jsx';
import { Reveal, useCarousel } from '../components/ui.jsx';
import { helpLinks, posts } from '../data/site.jsx';

export function PostCard({ post }) {
  return (
    <article className="group">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <span className="rounded-[4px] bg-brand px-3.5 py-[3px] font-heading text-[15px] font-medium text-white">{post.date}</span>
        <span className="flex min-w-0 flex-wrap items-center gap-2 rounded-[4px] bg-mist px-3.5 py-[3px] text-[14px] text-navy">
          {post.tags.map((tag, i) => (
            <span key={tag} className="flex items-center gap-2">
              {i > 0 && <span className="size-1 rounded-full bg-brand" />}
              {tag}
            </span>
          ))}
        </span>
      </div>
      <h3 className="mt-5 text-[22px] leading-[1.36] font-medium">
        <a href={`/news/${post.slug}`} className="transition-colors hover:text-brand">
          {post.title}
        </a>
      </h3>
      <p className="mt-4">{post.excerpt}</p>
      <a href={`/news/${post.slug}`} className="relative mt-7 block h-[325px] overflow-hidden rounded-[13px]">
        <img src={post.image} alt="" loading="lazy" className="size-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105" />
        <span className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-navy-900/95" aria-hidden="true" />
        <span className="absolute right-6 bottom-6 flex items-center gap-2.5 font-heading text-[16px] font-semibold text-white">
          Read The Article
          <span className="grid size-[26px] place-items-center rounded-full bg-brand transition-transform duration-300 group-hover:translate-x-1">
            <Icon name="arrowRight" size={13} strokeWidth={2.2} />
          </span>
        </span>
      </a>
    </article>
  );
}

export default function Insights() {
  const c = useCarousel({ count: posts.length, perView: { base: 1, md: 2, lg: 3 }, autoplay: 6000 });
  return (
    <section id="insights" className="container-x scroll-mt-24 pt-[110px] lg:pt-[150px]">
      <Reveal className="text-center">
        <span className="inline-block rounded-md bg-brand px-4 py-1.5 font-heading text-[16px] font-medium text-white">New Latest</span>
        <h2 className="mx-auto mt-6 max-w-[760px] text-[38px] leading-[1.1] font-semibold sm:text-[55px]">Insights on Modern Delivery &amp; Logistics</h2>
        <p className="mx-auto mt-6 max-w-[650px] text-[17px]">
          Explore Expert Perspectives, Industry Trends, And Practical Insights Shaping The Future Of Efficient And Reliable Delivery Operations.
        </p>
      </Reveal>

      <div className="mt-14 overflow-hidden lg:mt-[75px]" {...c.handlers}>
        <ul className="-mx-[15px] flex items-start transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={c.trackStyle}>
          {posts.map((p, i) => (
            <li key={p.title + i} style={c.slideStyle} className="px-[15px]">
              <PostCard post={p} />
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-14 flex justify-center gap-5">
        {Array.from({ length: c.pages }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => c.setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`size-2 rounded-full transition-colors ${c.index === i ? 'bg-royal' : 'bg-royal/20 hover:bg-royal/50'}`}
          />
        ))}
      </div>
    </section>
  );
}

export function HelpLinks() {
  return (
    <section className="container-x pt-[110px] pb-[80px]">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-[30px]">
        {helpLinks.map((l, i) => (
          <Reveal key={l.label} delay={i * 100}>
            <a href={l.href} className="group flex items-center justify-between rounded-md border border-line bg-mist p-2 pl-[25px] transition-colors duration-300 hover:border-navy hover:bg-navy">
              <span className="font-heading text-[16px] font-medium text-navy transition-colors group-hover:text-white">{l.label}</span>
              <span className="grid size-[54px] place-items-center rounded-md bg-white text-brand">
                <Icon name="arrowRight" size={18} strokeWidth={2} className="transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
