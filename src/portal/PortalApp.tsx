import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  CloudCog,
  LifeBuoy,
  LockKeyhole,
  Menu,
  Smartphone,
  WalletCards,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom';
import { PortalAccountDeletion } from './PortalAccountDeletion';
import { PaymentDetectionShowcase, PortalUseCases } from './PortalUseCases';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/support', label: 'Support' },
];

const reveal = {
  initial: { opacity: 1, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

function AuraWordmark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="Aura Finance">
      <img
        src={inverse ? '/aura-mark-dark.png' : '/aura-mark-light.png'}
        alt=""
        className="h-10 w-10 rounded-xl object-cover"
        aria-hidden="true"
      />
      <span className={`font-headline text-lg font-extrabold tracking-tight ${inverse ? 'text-white' : 'text-primary'}`}>
        Aura <span className="font-medium">Finance</span>
      </span>
    </span>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen overflow-x-hidden bg-surface text-on-surface">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#031b31]/95 text-white backdrop-blur-xl">
        <nav className="mx-auto flex min-h-18 max-w-7xl items-center px-5 sm:px-8" aria-label="Public navigation">
          <Link to="/" onClick={() => setMenuOpen(false)} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            <AuraWordmark inverse />
          </Link>
          <div className="ml-auto hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `rounded-xl px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-xl text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 md:hidden"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </nav>
        {menuOpen && (
          <div className="border-t border-white/10 px-5 py-3 md:hidden">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setMenuOpen(false)} className="block min-h-11 rounded-xl px-3 py-3 text-sm font-bold text-slate-200 hover:bg-white/10">
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </header>
      {children}
      <footer className="border-t border-outline-variant/30 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-sm">
            <AuraWordmark />
            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">Private, local-first personal budgeting for Android.</p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold text-primary" aria-label="Footer navigation">
            <Link to="/privacy">Privacy</Link>
            <Link to="/support">Support</Link>
            <Link to="/account-deletion">Delete account</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function AuthenticProductPreview() {
  return (
    <motion.figure
      initial={{ opacity: 0, y: 30, rotate: 1.5 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ delay: 0.18, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-[200px]"
    >
      <div className="absolute -inset-8 rounded-full bg-cyan-300/20 blur-3xl" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[2.4rem] border border-white/20 bg-[#f6f8fb] p-3 shadow-[0_40px_100px_-35px_rgba(0,0,0,0.75)]">
        <img
          src="/landing/aura-home.png"
          alt="Aura Android home showing August budget, available spending, cash flow and recent transactions"
          className="block h-auto w-full rounded-[1.8rem] bg-white"
        />
      </div>
      <figcaption className="mt-4 text-center text-[10px] font-extrabold uppercase tracking-[0.14em] text-cyan-100/75">
        Captured from Aura Android · synthetic demo data
      </figcaption>
    </motion.figure>
  );
}

function Landing() {
  return (
    <main>
      <section className="relative isolate min-h-[calc(100svh-4.5rem)] overflow-hidden bg-[#031b31] text-white">
        <div className="absolute inset-0 opacity-70" aria-hidden="true" style={{ background: 'radial-gradient(circle at 78% 42%, rgba(6,182,212,.22), transparent 30%), radial-gradient(circle at 15% 5%, rgba(132,204,22,.1), transparent 24%)' }} />
        <div className="absolute -right-40 top-12 h-[620px] w-[620px] rounded-full border border-cyan-300/10 md:-right-24" aria-hidden="true" />
        <div className="absolute -right-20 top-32 h-[460px] w-[460px] rounded-full border border-amber-300/10" aria-hidden="true" />
        <div className="relative mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }} className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-300">Private budgeting · Android</p>
            <h1 className="mt-6 font-headline text-5xl font-extrabold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Know what you can spend. <span className="text-cyan-300">Before you spend it.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300 sm:text-xl">Aura turns your budget, recurring commitments and daily spending into one calm, private view.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="mailto:support@staituned.com?subject=Aura%20Android%20early%20access" className="group inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-6 text-sm font-extrabold text-[#03213a] transition-all hover:-translate-y-0.5 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                Request early access <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </a>
              <a href="#how-it-works" className="inline-flex min-h-13 items-center justify-center rounded-2xl border border-white/20 px-6 text-sm font-extrabold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">See how Aura works</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-slate-300">
              {['Local-first workspace', 'Optional encrypted backup', 'No financial advice'].map((item) => <span key={item} className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-cyan-300" aria-hidden="true" />{item}</span>)}
            </div>
          </motion.div>
          <AuthenticProductPreview />
        </div>
      </section>

      <section id="how-it-works" className="bg-white py-24 sm:py-32">
        <motion.div {...reveal} className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-cyan-700">One clear monthly picture</p>
            <h2 className="mt-4 font-headline text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">Your money, without the noise.</h2>
            <p className="mt-5 text-lg leading-relaxed text-on-surface-variant">Set the month once. Aura keeps the daily decisions understandable.</p>
          </div>
          <div className="mt-16 grid gap-12 border-t border-outline-variant/40 pt-12 md:grid-cols-3">
            {[
              { icon: WalletCards, title: 'See what is truly available', text: 'Monthly budget, spending pace and commitments meet in one view.' },
              { icon: Smartphone, title: 'Review before it becomes data', text: 'On Android, supported payment notifications become suggestions—not automatic transactions.' },
              { icon: CloudCog, title: 'Recover on your terms', text: 'Keep up to five encrypted recovery versions only when you enable cloud backup.' },
            ].map(({ icon: Icon, title, text }, index) => (
              <motion.article key={title} initial={{ opacity: 1, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1, duration: 0.45 }}>
                <Icon className="h-7 w-7 text-cyan-700" strokeWidth={1.8} aria-hidden="true" />
                <h3 className="mt-6 font-headline text-xl font-extrabold text-primary">{title}</h3>
                <p className="mt-3 leading-relaxed text-on-surface-variant">{text}</p>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </section>

      <PortalUseCases />

      <PaymentDetectionShowcase />

      <section className="bg-[#eaf7f8] py-24 sm:py-32">
        <motion.div {...reveal} className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#003461] p-8 text-white sm:p-12">
            <div className="absolute right-[-10%] top-[-20%] h-64 w-64 rounded-full border-[42px] border-cyan-300/15" aria-hidden="true" />
            <LockKeyhole className="h-9 w-9 text-cyan-300" aria-hidden="true" />
            <p className="mt-20 text-sm font-bold text-cyan-200">Privacy is the architecture</p>
            <p className="mt-3 max-w-md font-headline text-3xl font-extrabold leading-tight">Your financial workspace stays on your device by default.</p>
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-cyan-800">Local first, explicitly</p>
            <h2 className="mt-4 font-headline text-4xl font-extrabold tracking-tight text-primary">Private by default. Recoverable by choice.</h2>
            <p className="mt-6 text-lg leading-relaxed text-on-surface-variant">Aura does not need a hosted copy of your ledger to help you understand it. If you enable recovery, backup content is encrypted before storage.</p>
            <Link to="/privacy" className="group mt-8 inline-flex items-center gap-2 text-sm font-extrabold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
              Read how Aura handles data <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="bg-white py-24 text-center sm:py-32">
        <motion.div {...reveal} className="mx-auto max-w-3xl px-5 sm:px-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-cyan-700">Aura for Android</p>
          <h2 className="mt-4 font-headline text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">A calmer budget starts with one clear month.</h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-on-surface-variant">Request access or ask us anything about setup, privacy and recovery.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="mailto:support@staituned.com?subject=Aura%20Android%20early%20access" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-extrabold text-white hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">Request early access <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
            <Link to="/support" className="inline-flex min-h-13 items-center justify-center rounded-2xl border border-outline-variant/60 px-6 text-sm font-extrabold text-primary hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">Contact support</Link>
          </div>
        </motion.div>
      </section>
    </main>
  );
}

function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="bg-[#031b31] px-5 py-20 text-white sm:px-8 sm:py-24">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-4xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-cyan-300">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl font-headline text-4xl font-extrabold tracking-tight sm:text-6xl">{title}</h1>
        <div className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">{children}</div>
      </motion.div>
    </section>
  );
}

function Privacy() {
  return (
    <main>
      <PageIntro eyebrow="Privacy" title="Your financial life is not our dataset.">Aura is designed around a local-first workspace and explicit recovery choices.</PageIntro>
      <section className="bg-white px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-4xl gap-14 lg:grid-cols-[.65fr_1.35fr]">
          <nav className="text-sm font-bold text-primary" aria-label="Privacy topics"><p className="text-on-surface-variant">On this page</p><ul className="mt-4 space-y-3"><li><a href="#device">On your device</a></li><li><a href="#recovery">Cloud recovery</a></li><li><a href="#control">Your controls</a></li></ul></nav>
          <div className="space-y-14">
            <article id="device"><h2 className="font-headline text-2xl font-extrabold text-primary">On your device</h2><p className="mt-4 leading-relaxed text-on-surface-variant">Budgets, transactions, categories, reminders and reports are primarily processed in Aura’s Android runtime. They are not uploaded merely to make the app work.</p></article>
            <article id="recovery"><h2 className="font-headline text-2xl font-extrabold text-primary">Optional cloud recovery</h2><p className="mt-4 leading-relaxed text-on-surface-variant">When enabled, Aura keeps up to five client-encrypted recovery versions associated with your authenticated account. Aura administrators cannot read their financial contents.</p></article>
            <article id="control"><h2 className="font-headline text-2xl font-extrabold text-primary">Your controls</h2><p className="mt-4 leading-relaxed text-on-surface-variant">You can export your workspace, delete managed cloud versions and request account deletion. Files you exported remain under your control and cannot be removed by Aura.</p><Link to="/account-deletion" className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-primary">Open account deletion <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></article>
            <p className="border-t border-outline-variant/40 pt-8 text-sm leading-relaxed text-on-surface-variant">This is an engineering transparency summary, not a legal certification. For privacy requests, email <a className="font-bold text-primary" href="mailto:support@staituned.com">support@staituned.com</a>.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Support() {
  return (
    <main>
      <PageIntro eyebrow="Support" title="Tell us where Aura got in your way.">Help with access, recovery, deletion or the Android app.</PageIntro>
      <section className="bg-white px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-10 border-b border-outline-variant/40 pb-16 md:grid-cols-3">
            {[['Access & setup', 'Sign-in, first-run and workspace setup.'], ['Recovery', 'Encrypted backups, exports and restore.'], ['Account controls', 'Privacy requests and account deletion.']].map(([title, text]) => <article key={title}><h2 className="font-headline text-lg font-extrabold text-primary">{title}</h2><p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{text}</p></article>)}
          </div>
          <div className="grid items-start gap-12 pt-16 md:grid-cols-[1fr_auto]">
            <div><LifeBuoy className="h-8 w-8 text-cyan-700" aria-hidden="true" /><h2 className="mt-6 font-headline text-3xl font-extrabold text-primary">Email Aura support</h2><p className="mt-4 max-w-xl leading-relaxed text-on-surface-variant">Include the screen you were using and what you expected to happen. Do not send passwords, authentication codes, bank statements or complete financial exports.</p><p className="mt-4 text-sm font-semibold text-on-surface-variant">Current target response time: within one week.</p></div>
            <a href="mailto:support@staituned.com?subject=Aura%20support" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-extrabold text-white hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">support@staituned.com <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
          </div>
        </div>
      </section>
    </main>
  );
}

export function PortalApp() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/support" element={<Support />} />
          <Route path="/account-deletion" element={<PortalAccountDeletion />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}
