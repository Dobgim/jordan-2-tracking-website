/*
 * All of the website's copy, links and images in one place.
 * Edit text here — the components only handle layout.
 */

export const IMG = (name) => `/images/${name}`;

export const company = {
  name: 'TheJordans',
  phone: '+1800 – 668 333',
  phoneHref: 'tel:+1800668333',
  email: 'info@example.com',
  address: '1234 Elmwood Avenue, Suite 500',
  city: 'Atlanta, GA 30308, United States',
  addressShort: '1234 Elmwood Ave, Ste 500, Atlanta, GA',
  hours: ['Monday - Saturday: 7.30am - 17.30pm', 'Sunday - Holiday: Closes'],
  // the floating "Track & Help" widget
  supportPhone: '1654987638',
  supportEmail: 'thejordans@support.com',
};

export const nav = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'Services', href: '/services' },
  { label: 'News', href: '/news' },
  { label: 'Tracking', href: '/track' },
  { label: 'Contact Us', href: '/contact' },
];

export const topbar = {
  update: { label: 'New Update:', text: 'Handling Issues Related To Storage' },
  languages: ['En', 'CN', 'VN', 'AR'],
  locations: ['Texas, United States', 'Greater London, UK', 'Illinois, United States', 'West Midlands , UK'],
};

export const hero = {
  image: IMG('h4-1.webp'),
  title: 'Smart Logistics Solutions That Move Your Business Forward.',
  text: 'From pickup to delivery, track and manage every shipment in one unified platform, built for speed, clarity, and operational efficiency.',
  primary: { label: 'Ship immediately', href: '/contact' },
  secondary: { label: 'Calculate Fee', href: '/contact' },
};

export const heroStats = [
  { icon: 'globe', label: '120+ Countries' },
  { icon: 'plane', label: '10M+ Shipments' },
  { icon: 'shield', label: 'Trusted Worldwide' },
];

export const getStarted = [
  {
    icon: 'hand',
    title: 'How to Get Started',
    text: 'Quick guides to help you book, track, and manage shipments with ease.',
    link: { label: 'Get Started', href: '/contact' },
  },
  {
    icon: 'layout',
    title: 'Book & Manage Shipments',
    text: 'Plan, manage, and pay for your shipments through one simple platform.',
    link: { label: 'Book Now', href: '/contact' },
  },
  {
    icon: 'edit',
    title: 'Logistics Insights',
    text: 'Articles, guides, and resources to help you optimise your supply chain.',
    link: { label: 'Explore Resources', href: '/news' },
  },
];

export const servicesIntro = {
  title: 'Logistics Services Built For Every Business.',
  text: 'Flexible logistics solutions designed for businesses of all sizes, from growing brands to global operations.',
};

export const serviceBlocks = [
  {
    title: 'Services For Businesses',
    text: 'End-to-end logistics solutions for companies managing regular shipments, bulk transportation, and complex supply chains.',
    cta: 'View Business Solutions',
    image: IMG('h4-2.webp'),
    included: ['Freight & Transportation', 'Warehousing & Fulfillment', 'Supply Chain Management', 'Dedicated Logistics Support'],
  },
  {
    title: 'Services For E-Commerce',
    text: 'Fast, reliable delivery and fulfillment services designed to support online stores and growing e-commerce operations.',
    cta: 'Explore E-Commerce Logistics',
    image: IMG('h4-3.webp'),
    included: ['Parcel Delivery & Distribution', 'Order Fulfillment', 'Real-Time Shipment Tracking', 'Returns & Reverse Logistics'],
  },
];

export const industriesIntro = {
  title: 'Logistics Solutions For Every Industry.',
  text: 'Tailored logistics services designed to meet the unique needs of different industries, from fast-moving consumer goods to complex supply chains.',
};

const industryText =
  'Reliable logistics for fashion brands managing seasonal collections, high inventory turnover, and time-sensitive deliveries across multiple channels.';

export const industries = [
  { title: 'Fashion & Apparel', icon: IMG('id1.svg'), text: industryText },
  { title: 'Fresh Produce & Agriculture', icon: IMG('id3.svg'), text: industryText },
  { title: 'Healthcare & Pharmaceuticals', icon: IMG('id4.svg'), text: industryText },
  { title: 'Electronics & Technology', icon: IMG('id2.svg'), text: industryText },
];

export const about = {
  images: [IMG('h4-4.webp'), IMG('h4-5.webp'), IMG('h4-6-1.webp')],
  title: 'Built By People Who Understand Logistics.',
  paragraphs: [
    'TheJordans is a logistics partner built for fast-moving businesses. We combine experienced operations, clear communication, and reliable execution — so your shipments move smoothly, every step of the way.',
    'Our hands-on team supports both B2B and e-commerce operations, delivering consistent performance and dependable logistics at every stage.',
  ],
  points: [
    'Operations Team With Real-World Logistics Experience',
    'Structured Processes For B2B & E-Commerce',
    'Transparent Tracking & Responsive Support',
    'Designed To Scale With Growing Businesses',
  ],
  cta: { label: 'More About Us', href: '/about' },
};

export const capacity = [
  {
    title: 'Hourly Part Processing Capacity',
    value: 250000,
    text: (
      <>
        We integrate transfer centers with technology and process approximately <b className="font-normal text-navy">250,000</b> packages
        per hour, visiting over <b className="font-normal text-navy">2.5 million</b> addresses per day.
      </>
    ),
  },
  {
    title: 'Total Operational Yard & Facility Area',
    value: 300000,
    suffix: 'm²',
    text: 'Providing the space and infrastructure needed to handle high-volume storage, sorting, and distribution efficiently.',
  },
  {
    title: 'Business & E-commerce Partners',
    value: 2683,
    text: 'Trusted by growing brands and business teams across diverse logistics operations, fulfillment models, and multi-channel delivery workflows.',
  },
];

export const expertise = [
  {
    icon: IMG('1.png'),
    title: 'Real-World Logistics Expertise',
    text: 'Hands-on teams with practical experience, managing shipments through proven operational workflows.',
  },
  {
    icon: IMG('2.png'),
    title: 'Clear, Responsive Communication',
    text: 'Transparent updates and fast support, keeping you informed at every stage of delivery.',
  },
  {
    icon: IMG('3.png'),
    title: 'Consistent, Reliable Execution',
    text: 'Accurate handling and dependable performance you can trust, shipment after shipment.',
  },
  {
    icon: IMG('4.png'),
    title: 'Focused On Getting It Right',
    text: 'We prioritize precision, accountability, and attention to detail — because in logistics, small mistakes matter.',
  },
];

export const deliveryCards = [
  {
    icon: 'box',
    tag: 'Delivery Flexibility',
    title: 'Flexible Delivery Adjustments',
    text: 'Support Address Changes And Delivery Preferences Through Structured Operational Workflows — Even After Shipments Are In Transit.',
    image: IMG('h4-8-1.webp'),
  },
  {
    icon: 'gift',
    tag: 'Shipment Visibility',
    title: 'End-To-End Shipment Visibility',
    text: 'Track Shipments Across Every Handling Point With Clear Status Updates And Predictable Delivery Timelines.',
    image: IMG('h4-9-1.webp'),
  },
  {
    icon: 'dolly',
    tag: 'Controlled Handover',
    title: 'Multiple Delivery Options',
    text: 'Enable Delivery To Warehouses, Partners, Or Designated Pickup Points Based On Operational Needs.',
    image: IMG('h4-10-1.webp'),
  },
];

export const sustainability = {
  title: 'Driving Sustainable Logistics Through Smarter Operations.',
  text: 'We focus on efficient operations and long-term responsibility to reduce waste while maintaining reliable logistics performance.',
  image: IMG('h4-11.webp'),
  video: 'https://www.youtube.com/embed/SF4aHwxHtZ0?autoplay=1',
  faqs: [
    {
      q: 'Efficient Routing & Reduced Waste',
      a: 'We offer solutions tailored to customer needs by integrating transportation, storage, inventory management and distribution processes, using an experienced team and advanced technology.',
    },
    {
      q: 'Smarter Infrastructure Usage',
      a: 'We focus on vibrant communities and modern living spaces, creating long-term value in areas with strong population and income growth.',
    },
    {
      q: 'Long-Term Operational Responsibility',
      a: 'We focus on vibrant communities and modern living spaces, creating long-term value in areas with strong population and income growth.',
    },
  ],
};

export const freightModes = [
  {
    icon: 'truck',
    title: 'Reliable Ground Delivery Across Regions',
    text: 'Dependable road transport supporting regional and cross-border deliveries.',
  },
  {
    icon: 'ship',
    title: 'Energy-Efficient Glazing And Insulation',
    text: 'Cost-effective ocean shipping for international and long-distance logistics needs.',
  },
  {
    icon: 'plane',
    title: 'Smart Ventilation Ensuring Year-Round Comfort',
    text: 'Time-critical air freight solutions ensuring speed and handling accuracy.',
  },
];

export const testimonials = {
  title: 'What Our Partners Say About Us?',
  text: 'Real Feedback From Teams Who Rely On TheJordans For Consistent, Dependable Logistics Support.',
  satisfaction: 98,
  items: [
    {
      quote:
        '“TheJordans has been a reliable logistics partner for our day-to-day operations. Their team communicates clearly, handles shipments consistently, and makes complex deliveries much easier to manage.”',
      name: 'Lucas Chang',
      role: 'Operations Manager',
      image: IMG('h4-12.webp'),
    },
    {
      quote:
        '“What we value most is the consistency and transparency TheJordans brings to our logistics workflows. Their approach fits perfectly with fast-moving e-commerce operations.”',
      name: 'Laura Julian',
      role: 'E-commerce Director',
      image: IMG('h4-13.webp'),
    },
  ],
};

export const partners = {
  title: 'Trusted by Logistics Partners and Businesses',
  text: 'We work alongside trusted partners to support reliable, scalable logistics operations.',
  logos: {
    top: [IMG('cl2.webp'), IMG('cl3.webp')],
    bottom: [IMG('cll8.webp'), IMG('cl9.webp'), IMG('cl10.webp'), IMG('cl11.webp')],
  },
};

export const quote = {
  image: IMG('h3-3.webp'),
  title: 'Fast, Reliable, and Secure.',
  text: 'Submit your request to receive a tailored quote based on your routes, volume, and delivery requirements.',
  freightTypes: ['Truck Freight', 'Ship Freight', 'Train Freight', 'Plane Freight'],
  incoterms: ['EXW', 'CFR', 'DAP'],
  services: ['Fragile', 'Express', 'Insurance', 'Packaging'],
};

const excerpt =
  'In modern logistics, efficiency starts with the route. By leveraging real-time data and intelligent planning, businesses can reduce. Lorem ipsum dolor sit amet,...';

export const posts = [
  { date: '25/02/26', tags: ['Green Logistics', 'Logistics'], title: 'Future Trends in E-Commerce Fulfillment', image: IMG('p9.webp') },
  { date: '25/02/26', tags: ['Logistics'], title: 'Urban vs Regional Delivery Strategies', image: IMG('p8.webp') },
  { date: '25/02/26', tags: ['Smart Routing'], title: 'Solving Last-Mile Delivery Challenges', image: IMG('p6.webp') },
  { date: '25/02/26', tags: ['Customer Experience'], title: 'The Role of Technology in Optimizing Fulfillment Operations', image: IMG('p4.webp') },
  { date: '25/02/26', tags: ['Sustainability'], title: 'Solving Last-Mile Delivery Challenges', image: IMG('p5.webp') },
  { date: '25/02/26', tags: ['Transports'], title: 'What Customers Expect From Fast Delivery Today', image: IMG('p2.webp') },
].map((p, i) => ({
  ...p,
  excerpt,
  slug: p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + (i === 4 ? '-2' : ''),
}));

export const helpLinks = [
  { label: 'Frequently Asked Questions', href: '/contact#faq' },
  { label: 'Ask TheJordans Logistic', href: '/contact' },
  { label: 'How Our Delivery Works', href: '/track' },
];

export const footer = {
  cta: 'Start Shipping Smarter With TheJordans Logistics.',
  newsletter: 'News & Insights, Straight To Your Inbox Every Week',
  links: [
    [
      { label: 'About', href: '/about' },
      { label: 'Our Services', href: '/services' },
      { label: 'Sustainability', href: '/about#sustainability' },
      { label: 'News & Media', href: '/news' },
      { label: 'Track a Shipment', href: '/track' },
    ],
    [
      { label: 'Air Freight', href: '/services' },
      { label: 'Sea Freight', href: '/services' },
      { label: 'Land Transport', href: '/services' },
      { label: 'Groupage', href: '/services' },
      { label: 'Consultancy', href: '/contact' },
    ],
  ],
  legal: ['Terms & Conditions', 'Site Map', 'Return and Refund Policy'],
  socials: ['facebook', 'twitter', 'telegram', 'pinterest'],
};

export const articleBody = [
  'Every delivery starts long before a truck leaves the yard. Route planning, load consolidation and accurate hand-over data decide how quickly — and how reliably — a shipment reaches its destination.',
  'By combining real-time tracking with structured operational workflows, our teams can spot delays early, re-route around disruption and keep customers informed at every checkpoint. The result is fewer failed deliveries, lower costs per parcel and a better experience for the receiver.',
  'For growing businesses the key is consistency: the same clear process for every order, whether it is a single parcel or a full truckload. That is the standard we hold ourselves to on every shipment we handle.',
];

export const contactFaqs = [
  {
    q: 'How do I track my shipment?',
    a: 'Enter the tracking number from your receipt or invoice on the Tracking page — or scan the QR code on your invoice. You will see the live status, the package on the map and the full checkpoint history.',
  },
  {
    q: 'How do I get a quote?',
    a: 'Fill in the Request A Quote form with your route, dimensions and freight type. Our team replies with a tailored quote, usually within a few hours on working days.',
  },
  {
    q: 'Which freight types do you handle?',
    a: 'Truck, rail, sea and air freight — from single parcels and e-commerce orders to full containers and dedicated loads.',
  },
  {
    q: 'Can I change the delivery address after shipping?',
    a: 'Yes. Contact our support team with your tracking number and we will update the delivery preferences while the shipment is in transit, where the route allows it.',
  },
];
