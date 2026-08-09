import { type ReactNode, useState } from 'react';
import { motion } from 'motion/react';
import { BellRing, Check, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';

type UseCaseKey = 'safe' | 'budget' | 'categories' | 'compare';
type SafeLens = 'actual' | 'net';

interface UseCaseContent {
  tab: string;
  eyebrow: string;
  title: string;
  story: ReactNode;
  result: ReactNode;
  src: string;
  alt: string;
}

const useCaseOrder: UseCaseKey[] = ['safe', 'budget', 'categories', 'compare'];

const useCases: Record<Exclude<UseCaseKey, 'safe'>, UseCaseContent> = {
  budget: {
    tab: 'Budget status',
    eyebrow: 'Case 2 · Budget control',
    title: 'Are Daniele’s category limits still under control?',
    story: <>Daniele set limits for <strong className="font-extrabold text-primary">Home, Groceries and Transport</strong>. He wants to know which categories need attention before the month gets away from him.</>,
    result: <>Aura surfaces the problem immediately: <strong>Home is at 195%</strong> in Actual, while <strong>Groceries is at 28%</strong> and <strong>Transport at 39%</strong>. He knows which alert is caused by the one-off purchase.</>,
    src: '/landing/aura-budgets.png',
    alt: 'Aura Budgets screen showing category limits, usage percentages and an over-budget Home alert',
  },
  categories: {
    tab: 'Where to cut',
    eyebrow: 'Case 3 · Category trend',
    title: 'Where can Daniele cut recurring spending?',
    story: <>Daniele opens <strong className="font-extrabold text-primary">twelve months of category analytics</strong>, then selects <strong className="font-extrabold text-primary">Groceries</strong> to see its monthly trend instead of relying on a single total.</>,
    result: <>The trend exposes <strong>expensive months</strong> and his <strong>recurring baseline</strong>. He can set a realistic grocery target without confusing the furniture purchase with daily habits.</>,
    src: '/landing/aura-reports-category-groceries.png',
    alt: 'Aura Groceries category report showing twelve-month spending, monthly average and trend chart',
  },
  compare: {
    tab: 'Month vs month',
    eyebrow: 'Case 4 · Comparison',
    title: 'What changed compared with last month?',
    story: <>Daniele wants to understand <strong className="font-extrabold text-primary">why August cost more than July</strong> and which categories created the difference.</>,
    result: <>Compare explains the <strong>€828 increase</strong>, shows the <strong>53.4% change</strong> and breaks both periods down by category so the furniture spike is visible, not mysterious.</>,
    src: '/landing/aura-reports-compare.png',
    alt: 'Aura Compare report explaining the difference between August and July with category bars',
  },
};

const safeScreens: Record<SafeLens, Pick<UseCaseContent, 'src' | 'alt' | 'result'>> = {
  actual: {
    src: '/landing/aura-home.png',
    alt: 'Aura Home in Actual view showing €622 available after a €1,200 one-off furniture purchase',
    result: <><strong>Actual includes everything that happened:</strong> Daniele has <strong>€622 available</strong> after spending <strong>€2,378</strong>.</>,
  },
  net: {
    src: '/landing/aura-home-net.png',
    alt: 'Aura Home in Net view showing €1,760.23 available after separating the furniture purchase',
    result: <><strong>Net separates the €1,200 Extra:</strong> recurring spending is <strong>€1,178</strong> and the comparable safe-to-spend becomes <strong>€1,760.23</strong>.</>,
  },
};

function safeContent(lens: SafeLens): UseCaseContent {
  return {
    tab: 'Safe to spend',
    eyebrow: 'Case 1 · One-off purchase',
    title: 'Did new furniture really break Daniele’s monthly habits?',
    story: <>Daniele spent <strong className="font-extrabold text-primary">€1,200 furnishing his home</strong>. It is real spending, but a <strong className="font-extrabold text-primary">one-time cost</strong>. He marks it <strong className="font-extrabold text-primary">Extra</strong> and checks both the complete month and his repeatable spending.</>,
    ...safeScreens[lens],
  };
}

const reveal = {
  initial: { opacity: 1, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
};

export function PortalUseCases() {
  const [selectedCase, setSelectedCase] = useState<UseCaseKey>('safe');
  const [safeLens, setSafeLens] = useState<SafeLens>('actual');
  const selected = selectedCase === 'safe' ? safeContent(safeLens) : useCases[selectedCase];
  const selectedIndex = useCaseOrder.indexOf(selectedCase);

  const move = (direction: -1 | 1) => {
    const next = (selectedIndex + direction + useCaseOrder.length) % useCaseOrder.length;
    setSelectedCase(useCaseOrder[next]);
  };

  return (
    <section className="bg-surface py-24 sm:py-32" aria-labelledby="use-cases-title">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_27rem] lg:items-stretch lg:gap-16 xl:gap-24">
          <motion.article {...reveal} className="flex min-w-0 flex-col lg:min-h-[56rem] lg:max-w-2xl">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-cyan-700">Four decisions, one private ledger</p>
              <h2 id="use-cases-title" className="mt-4 font-headline text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">See the answer, not just another chart.</h2>
              <p className="mt-5 text-lg leading-relaxed text-on-surface-variant">Follow Daniele through <strong className="font-extrabold text-primary">four everyday questions</strong> using screens captured from the <strong className="font-extrabold text-primary">real Aura mobile UI</strong>.</p>
            </div>

            <div className="mb-10 mt-10 overflow-x-auto pb-2 lg:overflow-visible lg:pb-0" role="tablist" aria-label="Choose a concrete Aura use case">
              <div className="portal-shadow-soft grid min-w-[42rem] grid-cols-4 gap-2 rounded-2xl bg-white p-2 lg:min-w-0">
                {useCaseOrder.map((key) => {
                  const label = key === 'safe' ? 'Safe to spend' : useCases[key].tab;
                  return (
                    <button key={key} type="button" role="tab" aria-selected={selectedCase === key} onClick={() => setSelectedCase(key)} className={`min-h-12 rounded-xl px-2 text-center text-sm font-extrabold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${selectedCase === key ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-cyan-800">{selected.eyebrow}</p>
            <motion.h3 key={`${selectedCase}-title`} initial={{ opacity: 0.55, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 font-headline text-3xl font-extrabold text-primary">{selected.title}</motion.h3>
            <p className="mt-5 text-lg leading-relaxed text-on-surface-variant">{selected.story}</p>

            {selectedCase === 'safe' && (
              <div className="mt-7">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-on-surface-variant">Show safe to spend</p>
                <div className="mt-2 inline-flex rounded-xl bg-white p-1" role="group" aria-label="Choose Daniele safe-to-spend view">
                  {(['actual', 'net'] as SafeLens[]).map((lens) => (
                    <button key={lens} type="button" onClick={() => setSafeLens(lens)} aria-pressed={safeLens === lens} className={`min-h-11 rounded-lg px-5 text-xs font-extrabold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${safeLens === lens ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-surface-container-low'}`}>
                      {lens === 'actual' ? 'Actual' : 'Net of extras'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <motion.div key={`${selectedCase}-${safeLens}-result`} initial={{ opacity: 0.5, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-7 border-l-4 border-cyan-600 bg-portal-highlight px-5 py-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-cyan-800">What Daniele learns</p>
              <p className="mt-2 text-sm font-medium leading-relaxed text-primary [&_strong]:font-extrabold [&_strong]:text-cyan-900">{selected.result}</p>
            </motion.div>

            <p className="mt-auto pt-8 text-xs leading-relaxed text-on-surface-variant"><strong className="text-primary">Same ledger, different question.</strong> Changing a view never deletes or rewrites a transaction.</p>
          </motion.article>

          <motion.figure {...reveal} className="portal-shadow-frame relative flex w-full max-w-[22rem] justify-self-center flex-col overflow-hidden rounded-[2rem] border border-outline-variant/40 bg-white p-3 sm:p-4 lg:max-w-[25rem] lg:self-start lg:justify-self-end">
            <div className="overflow-hidden rounded-[1.4rem] bg-surface-container-low">
              <motion.img key={selected.src} initial={{ opacity: 0.45 }} animate={{ opacity: 1 }} src={selected.src} alt={selected.alt} className="block h-auto w-full" />
            </div>
            <div className="flex items-center justify-between gap-3 px-1 pb-1 pt-3">
              <button type="button" onClick={() => move(-1)} aria-label="Show previous use case" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button>
              <figcaption className="text-center text-[10px] font-extrabold uppercase tracking-[0.12em] text-on-surface-variant">{selectedIndex + 1} / 4 · Real Aura screen</figcaption>
              <button type="button" onClick={() => move(1)} aria-label="Show next use case" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"><ChevronRight className="h-5 w-5" aria-hidden="true" /></button>
            </div>
          </motion.figure>
        </div>
      </div>
    </section>
  );
}

export function PaymentDetectionShowcase() {
  return (
    <section className="bg-white py-24 sm:py-32" aria-labelledby="payment-detection-showcase-title">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,28rem)] lg:gap-20">
        <motion.div {...reveal} className="max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-cyan-700">Less typing, still your decision</p>
          <h2 id="payment-detection-showcase-title" className="mt-4 font-headline text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">A payment becomes a suggestion—not a transaction.</h2>
          <p className="mt-6 text-lg leading-relaxed text-on-surface-variant">Aura can recognise supported purchase notifications from <strong className="font-extrabold text-primary">Intesa Sanpaolo Mobile, Google Wallet and PayPal</strong>. Detection happens <strong className="font-extrabold text-primary">locally on Android</strong>.</p>
          <div className="mt-8 divide-y divide-outline-variant/35 border-y border-outline-variant/35">
            {[
              ['1', 'Detect locally', 'Aura filters only the supported apps you explicitly enable.'],
              ['2', 'Prepare a review', 'Amount, merchant and source become a pending candidate outside your ledger.'],
              ['3', 'You confirm', 'Edit, confirm or ignore it. Nothing is recorded automatically.'],
            ].map(([step, title, text]) => (
              <div key={step} className="grid grid-cols-[2rem_1fr] gap-4 py-5">
                <span className="font-headline text-lg font-extrabold text-cyan-700">{step}</span>
                <div><h3 className="text-sm font-extrabold text-primary">{title}</h3><p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{text}</p></div>
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-xs font-bold text-on-surface-variant">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-700" aria-hidden="true" />On-device processing</span>
            <span className="inline-flex items-center gap-2"><BellRing className="h-4 w-4 text-cyan-700" aria-hidden="true" />Three supported sources</span>
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-cyan-700" aria-hidden="true" />Always reviewed by you</span>
          </div>
        </motion.div>

        <motion.figure {...reveal} className="portal-shadow-frame w-full max-w-[28rem] justify-self-center overflow-hidden rounded-[2rem] border border-outline-variant/40 bg-surface p-3 sm:p-4 lg:justify-self-end">
          <div className="max-h-[40rem] overflow-hidden rounded-[1.4rem] bg-surface-container-low">
            <img src="/landing/aura-payment-detection.png" alt="Aura Payments to review showing local suggestions from Intesa Sanpaolo Mobile, Google Wallet and PayPal" className="block h-auto w-full" />
          </div>
          <figcaption className="px-2 pb-1 pt-4 text-center text-[10px] font-extrabold uppercase tracking-[0.12em] text-on-surface-variant">Real Aura UI · synthetic bridge data</figcaption>
        </motion.figure>
      </div>
    </section>
  );
}
