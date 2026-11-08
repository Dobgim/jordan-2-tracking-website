import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { CutButton, Reveal } from '../components/ui.jsx';
import { company, quote as q } from '../data/site.jsx';
import { submitQuote } from '../lib/publicApi.js';

const empty = {
  name: '',
  email: '',
  phone: '',
  dimensions: '',
  freightType: q.freightTypes[0],
  incoterms: q.incoterms[0],
  origin: '',
  destination: '',
  service: q.services[0],
};

/** Outlined field whose label rides on the border once it has focus or a value. */
function Input({ label, value, onChange, type = 'text', required, autoComplete }) {
  return (
    <label className="group relative block">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        placeholder=" "
        className="peer h-[55px] w-full rounded-lg border border-line bg-white px-[17px] text-[15px] text-navy outline-none transition-colors focus:border-navy"
      />
      <span className="pointer-events-none absolute top-1/2 left-[17px] -translate-y-1/2 bg-white px-0 text-[15px] text-body transition-all duration-200 peer-focus:top-0 peer-focus:px-1.5 peer-focus:text-[15px] peer-focus:text-navy peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:text-navy">
        {label}
        {required && '*'}
      </span>
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="relative block">
      <span className="absolute top-0 left-[11px] z-10 -translate-y-1/2 bg-white px-1.5 text-[15px] text-navy">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[55px] w-full cursor-pointer appearance-none rounded-lg border border-line bg-white px-[17px] text-[15px] text-body outline-none focus:border-navy"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <Icon name="chevronDown" size={18} strokeWidth={2} className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 text-navy" />
    </label>
  );
}

function QuoteForm() {
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (status.state === 'sending') return;
    const data = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]));
    if (!data.name || !data.email || !data.phone) {
      setStatus({ state: 'error', message: 'Please fill in your name, email and phone number.' });
      return;
    }
    setStatus({ state: 'sending', message: '' });
    try {
      await submitQuote(data);
      setForm(empty);
      setStatus({ state: 'sent', message: 'Thank you! Your quote request has been received. Our team will contact you shortly.' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  return (
    <form onSubmit={submit} noValidate className="relative rounded-[13px] bg-white p-6 sm:p-[35px] sm:pt-[42px]">
      <div className="flex items-end justify-between">
        <h2 className="text-[32px] font-semibold">Request A Quote</h2>
        <svg viewBox="0 0 33 80" className="mr-[30%] hidden h-[82px] w-8 sm:block" aria-hidden="true">
          <path d="M16.5 0v78M2 63l14.5 15L31 63" stroke="#FE000B" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="mt-8 grid gap-x-4 gap-y-[18px] sm:grid-cols-2">
        <Input label="Name" value={form.name} onChange={set('name')} required autoComplete="name" />
        <Input label="Email" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        <Input label="Phone Number" type="tel" value={form.phone} onChange={set('phone')} required autoComplete="tel" />
        <Input label="Dimensions (L × W × H)" value={form.dimensions} onChange={set('dimensions')} />
        <div className="pt-3.5">
          <Select label="Freight Type" value={form.freightType} onChange={set('freightType')} options={q.freightTypes} />
        </div>
        <div className="pt-3.5">
          <Select label="Incoterms" value={form.incoterms} onChange={set('incoterms')} options={q.incoterms} />
        </div>
        <Input label="Origin Location" value={form.origin} onChange={set('origin')} />
        <Input label="Destination Location" value={form.destination} onChange={set('destination')} />
      </div>

      <fieldset className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
        <legend className="sr-only">Service</legend>
        {q.services.map((s) => (
          <label key={s} className="flex cursor-pointer items-center gap-2.5 text-[16px]">
            <input type="radio" name="service" value={s} checked={form.service === s} onChange={() => set('service')(s)} className="peer sr-only" />
            <span className="grid size-6 place-items-center rounded-full border border-line bg-mist text-white transition-colors peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-navy/40">
              <Icon name="check" size={13} strokeWidth={2.6} />
            </span>
            {s}
          </label>
        ))}
      </fieldset>

      <CutButton type="submit" className="mt-10" disabled={status.state === 'sending'}>
        {status.state === 'sending' ? 'Sending…' : 'Request A Quote'}
      </CutButton>

      {status.message && (
        <p
          role="status"
          className={`mt-6 rounded-md border px-4 py-3 text-[14px] ${
            status.state === 'sent' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {status.message}
        </p>
      )}
    </form>
  );
}

export default function Quote() {
  return (
    <section id="quote" className="container-wide scroll-mt-24 pt-[110px] lg:pt-[150px]">
      <div className="relative overflow-hidden rounded-[13px] bg-navy bg-cover bg-center p-4 sm:p-[35px]" style={{ backgroundImage: `url(${q.image})` }}>
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900/40 via-navy-900/50 to-navy-900/30" aria-hidden="true" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[670px_1fr] lg:gap-5">
          <Reveal>
            <QuoteForm />
          </Reveal>
          <Reveal delay={150} className="px-2 pb-6 text-white sm:px-0 lg:pt-[150px] lg:pb-0">
            <h2 className="max-w-[480px] text-[38px] leading-[1.12] font-bold text-white sm:text-[56px]">{q.title}</h2>
            <p className="mt-5 max-w-[470px] font-heading text-[17px] text-white/90">{q.text}</p>
            <ul className="mt-9 space-y-7">
              <li className="flex items-center gap-6">
                <span className="grid size-[63px] shrink-0 place-items-center rounded-full bg-brand">
                  <Icon name="pinFlag" size={24} />
                </span>
                <p className="font-heading text-[17px] leading-[1.6] font-medium">
                  {company.address}
                  <br />
                  {company.city}
                </p>
              </li>
              <li className="flex items-center gap-6">
                <span className="grid size-[63px] shrink-0 place-items-center rounded-full bg-brand">
                  <Icon name="send" size={22} />
                </span>
                <p className="font-heading text-[17px] leading-[1.6] font-medium">
                  <a href={company.phoneHref} className="hover:underline">
                    {company.phone.replace('–', '-')}
                  </a>
                  <br />
                  <a href={`mailto:${company.email}`} className="hover:underline">
                    {company.email}
                  </a>
                </p>
              </li>
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
