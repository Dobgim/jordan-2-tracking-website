import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Overlays from './components/Overlays.jsx';
import { HelpWidget, ScrollTop } from './components/Floating.jsx';
import { UIProvider } from './components/ui.jsx';
import Hero, { GetStarted } from './sections/Hero.jsx';
import Services from './sections/Services.jsx';
import Industries from './sections/Industries.jsx';
import About from './sections/About.jsx';
import Capacity from './sections/Capacity.jsx';
import Delivery from './sections/Delivery.jsx';
import Sustainability, { FreightModes } from './sections/Sustainability.jsx';
import Testimonials, { Partners } from './sections/Testimonials.jsx';
import Quote from './sections/Quote.jsx';
import Insights, { HelpLinks } from './sections/Insights.jsx';
import TrackPage from './pages/TrackPage.jsx';
import { isTrackPath } from './lib/navigation.js';

function Home() {
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

// two pages, both served by index.html: the home page and /track
const onTrackPage = isTrackPath(window.location.pathname);

export default function App() {
  return (
    <UIProvider>
      <Header />
      {onTrackPage ? <TrackPage /> : <Home />}
      {onTrackPage && <div className="h-10" />}
      <Footer />
      <ScrollTop />
      <HelpWidget />
      <Overlays />
    </UIProvider>
  );
}
