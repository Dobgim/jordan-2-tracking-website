import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import PageHero from '../components/PageHero.jsx';
import { CutButton, Reveal } from '../components/ui.jsx';
import { IMG, articleBody, company, contactFaqs, posts } from '../data/site.jsx';
import Hero, { GetStarted } from '../sections/Hero.jsx';
import Services from '../sections/Services.jsx';
import Industries from '../sections/Industries.jsx';
import About from '../sections/About.jsx';
import Capacity from '../sections/Capacity.jsx';
import Delivery from '../sections/Delivery.jsx';
import Sustainability, { Accordion, FreightModes } from '../sections/Sustainability.jsx';
import Testimonials, { Partners } from '../sections/Testimonials.jsx';
import Quote from '../sections/Quote.jsx';
import Insights, { HelpLinks, PostCard } from '../sections/Insights.jsx';
import { goToTracking } from '../lib/navigation.js';

const SITE = 'TheJordans – Logistics & Freight';
function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} – TheJordans Logistics & Freight` : SITE;
  }, [title]);
}

/** Red call-to-action band used at the bottom of inner pages. */
function CtaBand() {
  return (
    <section className="container-x pt-[90px] lg:pt-[120px]">
      <Reveal className="relative overflow-hidden rounded-[13px] bg-gradient-to-r from-royal to-navy px-6 py-12 sm:px-12 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:py-14">
        <div>
          <h2 className="text-[30px] leading-tight font-semibold text-white sm:text-[40px]">Ready to ship smarter?</h2>
          <p className="mt-3 max-w-[560px] text-white/80">Tell us about your route and volume — we'll come back with a tailored quote.</p>
        </div>
        <div className="mt-8 flex flex-wrap gap-4 lg:mt-0 lg:shrink-0">
          <CutButton href="/contact">Request A Quote</CutButton>
          <CutButton href="/track" variant="light">
            Track Shipment
          </CutButton>
        </div>
      </Reveal>
    </section>
  );
}

export function HomePage() {
  useTitle('');
  return (
    <main>
      <Hero />
      <GetStarted />
      <Services />
      <Industries />
      <About />
      <Capacity />
      <Delivery />
      <Sustainability />
      <FreightModes />
      <Testimonials />
      <Partners />
      <Quote />
      <Insights />
      <HelpLinks />
    </main>
  );
}

export function AboutPage() {
  useTitle('About Us');
  return (
    <main>
      <PageHero
        title="About Us"
        text="A logistics partner built for fast-moving businesses — experienced operations, clear communication and reliable execution."
        image={IMG('h4-6-1.webp')}
      />
      <About />
      <Capacity />
      <Sustainability />
      <Testimonials />
      <Partners />
      <CtaBand />
      <HelpLinks />
    </main>
  );
}

export function ServicesPage() {
  useTitle('Our Services');
  return (
    <main>
      <PageHero
        title="Our Services"
        text="End-to-end freight, warehousing and fulfilment for businesses and e-commerce brands of every size."
        image={IMG('h4-2.webp')}
      />
      <GetStarted />
      <Services />
      <FreightModes />
      <Industries />
      <Delivery />
      <CtaBand />
      <HelpLinks />
    </main>
  );
}

export function NewsPage() {
  useTitle('News & Insights');
  return (
    <main>
      <PageHero
        title="News & Insights"
        crumb="News"
        text="Expert perspectives, industry trends and practical insights shaping efficient and reliable delivery operations."
        image={IMG('p9.webp')}
      />
      <section className="container-x pt-[70px] lg:pt-[100px]">
        <div className="grid gap-x-[30px] gap-y-14 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (
            <Reveal key={p.slug} delay={(i % 3) * 100}>
              <PostCard post={p} />
            </Reveal>
          ))}
        </div>
      </section>
      <CtaBand />
      <HelpLinks />
    </main>
  );
}

function SidebarTrack() {
  const submit = (e) => {
    e.preventDefault();
    const code = new FormData(e.currentTarget).get('code')?.toString().trim();
    if (code) goToTracking(code);
  };
  return (
    <form onSubmit={submit} className="rounded-xl bg-gradient-to-br from-royal to-navy p-7 text-white">
      <h3 className="text-[22px] font-semibold text-white">Track a shipment</h3>
      <p className="mt-2 text-[15px] text-white/75">Enter your tracking number to see it live on the map.</p>
      <input
        name="code"
        placeholder="Tracking number"
        aria-label="Tracking number"
        autoComplete="off"
        className="mt-5 h-12 w-full rounded-md bg-white px-4 text-navy outline-none placeholder:text-body"
      />
      <button type="submit" className="mt-3 h-12 w-full rounded-md bg-brand font-heading font-semibold text-white transition-colors hover:bg-white hover:text-navy">
        Track Now
      </button>
    </form>
  );
}

export function NewsDetailPage() {
  const { slug } = useParams();
  const post = posts.find((p) => p.slug === slug);
  useTitle(post ? post.title : 'Article not found');
  if (!post) return <NotFoundPage />;
  const recent = posts.filter((p) => p.slug !== slug).slice(0, 3);

  return (
    <main>
      <PageHero title={post.title} crumb={[{ label: 'News', href: '/news' }, { label: 'Article' }]} image={post.image} />
      <section className="container-x grid gap-12 pt-[60px] lg:grid-cols-[minmax(0,1fr)_360px] lg:pt-[90px]">
        <article className="min-w-0">
          <img src={post.image} alt="" className="aspect-[16/9] w-full rounded-[13px] object-cover" />
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <span className="rounded-[4px] bg-brand px-3.5 py-[3px] font-heading text-[15px] font-medium text-white">{post.date}</span>
            {post.tags.map((t) => (
              <span key={t} className="rounded-[4px] bg-mist px-3.5 py-[3px] text-[14px] text-navy">
                {t}
              </span>
            ))}
          </div>
          <h2 className="mt-6 text-[30px] leading-tight font-semibold sm:text-[40px]">{post.title}</h2>
          <div className="mt-6 space-y-5 text-[17px]">
            {articleBody.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
          <blockquote className="mt-8 border-l-4 border-brand bg-mist px-6 py-5 font-heading text-[19px] leading-relaxed text-navy">
            “In logistics, small mistakes matter — so we design every step to get it right the first time.”
          </blockquote>
          <div className="mt-10">
            <CutButton href="/news" variant="light" className="border border-line">
              Back to all news
            </CutButton>
          </div>
        </article>

        <aside className="space-y-8 lg:sticky lg:top-[120px] lg:self-start">
          <SidebarTrack />
          <div className="rounded-xl border border-line p-7">
            <h3 className="text-[20px] font-semibold">Recent posts</h3>
            <ul className="mt-5 space-y-5">
              {recent.map((r) => (
                <li key={r.slug}>
                  <a href={`/news/${r.slug}`} className="group flex gap-4">
                    <img src={r.image} alt="" className="size-[72px] shrink-0 rounded-lg object-cover" />
                    <span className="min-w-0">
                      <span className="block text-[13px] text-brand">{r.date}</span>
                      <span className="block font-heading text-[16px] leading-snug text-navy group-hover:text-brand">{r.title}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
      <HelpLinks />
    </main>
  );
}

export function ContactPage() {
  useTitle('Contact Us');
  const cards = [
    { icon: 'pin', title: 'Our Location', lines: [company.address, company.city] },
    {
      icon: 'phone',
      title: 'Call or Email',
      lines: [
        <a key="p" href={company.phoneHref} className="hover:text-brand">
          {company.phone}
        </a>,
        <a key="e" href={`mailto:${company.email}`} className="hover:text-brand">
          {company.email}
        </a>,
      ],
    },
    { icon: 'clock', title: 'Working Hours', lines: company.hours },
  ];
  return (
    <main>
      <PageHero title="Contact Us" text="Questions, quotes or shipment support — our team usually replies within a few hours." image={IMG('h3-3.webp')} />

      <section className="container-x pt-[60px] lg:pt-[90px]">
        <div className="grid gap-5 md:grid-cols-3 lg:gap-[30px]">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 100} className="rounded-xl border border-line p-7 sm:p-8">
              <span className="grid size-[60px] place-items-center rounded-full bg-brand text-white">
                <Icon name={c.icon} size={24} />
              </span>
              <h3 className="mt-6 text-[22px] font-semibold">{c.title}</h3>
              <div className="mt-3 space-y-1 break-words">
                {c.lines.map((l, j) => (
                  <p key={j}>{l}</p>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <Quote />

      <section id="faq" className="container-x scroll-mt-28 pt-[90px] lg:pt-[120px]">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-[60px]">
          <Reveal>
            <h2 className="text-[34px] leading-[1.12] font-semibold sm:text-[46px]">Frequently Asked Questions</h2>
            <p className="mt-4 max-w-[480px]">Can't find what you're looking for? Use the Track &amp; Help button or call us on {company.phone}.</p>
            <div className="mt-8">
              <Accordion items={contactFaqs} />
            </div>
          </Reveal>
          <Reveal delay={150} className="min-h-[340px] overflow-hidden rounded-[13px] border border-line">
            <iframe
              title="TheJordans office location"
              src="https://maps.google.com/maps?q=1939%20Goldsmith%20Ln%2C%20Louisville%2C%20KY%2040218&z=14&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="size-full min-h-[340px]"
            />
          </Reveal>
        </div>
      </section>
      <HelpLinks />
    </main>
  );
}

export function NotFoundPage() {
  useTitle('Page not found');
  return (
    <main>
      <PageHero title="Page Not Found" crumb="404" text="The page you are looking for has moved or doesn't exist.">
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <CutButton href="/">Back to Home</CutButton>
          <CutButton href="/track" variant="light">
            Track Shipment
          </CutButton>
        </div>
      </PageHero>
    </main>
  );
}
