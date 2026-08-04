import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { BrandMark } from '../components/BrandMark';
import { PortalAccountDeletion } from './PortalAccountDeletion';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <header className="border-b border-outline-variant/20 bg-surface-container-lowest">
        <nav className="mx-auto flex min-h-16 max-w-3xl items-center gap-4 px-5" aria-label="Public navigation">
          <Link to="/" aria-label="Aura home"><BrandMark wordmark iconClassName="h-9 w-9" /></Link>
          <div className="ml-auto flex items-center gap-4 text-sm font-bold text-primary">
            <Link to="/privacy">Privacy</Link>
            <Link to="/support">Support</Link>
            <Link to="/account-deletion">Delete account</Link>
          </div>
        </nav>
      </header>
      {children}
    </div>
  );
}

function Landing() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="text-sm font-bold uppercase text-primary">Aura Finance for Android</p>
      <h1 className="mt-3 max-w-2xl font-headline text-4xl font-extrabold text-on-surface">A private, local-first way to understand your budget.</h1>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-on-surface-variant">Aura keeps the financial workspace on your device. Optional cloud recovery stores only encrypted versions associated with your authenticated account.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary" to="/support">Get support</Link>
        <Link className="rounded-xl border border-outline-variant/30 px-5 py-3 text-sm font-bold text-primary" to="/privacy">Read privacy information</Link>
      </div>
    </main>
  );
}

function Privacy() {
  return (
    <main className="mx-auto max-w-3xl space-y-5 px-5 py-12">
      <h1 className="font-headline text-3xl font-extrabold">Privacy</h1>
      <p className="leading-relaxed text-on-surface-variant">Aura processes budget, transaction, category, reminder and recovery data primarily on the device. Cloud backup is optional and contains up to five client-encrypted recovery versions. Aura administrators cannot decrypt their financial contents.</p>
      <p className="leading-relaxed text-on-surface-variant">You can delete the managed cloud versions and your authentication identity through the account-deletion page. Files you exported remain under your control and cannot be deleted by Aura.</p>
      <p className="text-sm text-on-surface-variant">This page is an engineering transparency summary, not a legal certification. Contact <a className="font-bold text-primary" href="mailto:support@staituned.com">support@staituned.com</a> for privacy requests.</p>
    </main>
  );
}

function Support() {
  return (
    <main className="mx-auto max-w-3xl space-y-5 px-5 py-12">
      <h1 className="font-headline text-3xl font-extrabold">Support</h1>
      <p className="leading-relaxed text-on-surface-variant">For access, recovery, deletion or Android-app problems, email <a className="font-bold text-primary" href="mailto:support@staituned.com">support@staituned.com</a>. The current target response time is within one week.</p>
      <Link className="inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary" to="/account-deletion">Delete an Aura account</Link>
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
