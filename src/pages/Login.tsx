import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { APP_CONFIG } from '../constants';
import { BrandMark } from '../components/BrandMark';

interface LoginProps {
  onSignIn: () => Promise<void>;
  error: string | null;
}

export const Login = ({ onSignIn, error }: LoginProps) => {
  const [loading, setLoading] = React.useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    await onSignIn();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface px-6 py-8 transition-colors duration-300">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm flex-col justify-center gap-10">
        <motion.div 
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="space-y-7 text-center"
        >
          <BrandMark className="justify-center" iconClassName="h-28 w-full max-w-[300px]" />
          <div className="space-y-3">
            <h1 className="font-headline text-4xl font-extrabold leading-tight text-primary">{APP_CONFIG.tagline}</h1>
            <p className="mx-auto max-w-[280px] text-sm font-medium leading-relaxed text-on-surface-variant">
              {APP_CONFIG.description}
            </p>
          </div>
        </motion.div>
      
        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.35, ease: 'easeOut' }}
          className="space-y-4"
        >
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest px-6 py-4 text-on-surface shadow-[0_16px_40px_rgba(0,52,97,0.08)] transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_20px_48px_rgba(0,52,97,0.12)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
          >
            {loading ? (
              <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-low text-sm font-extrabold text-primary" aria-hidden="true">G</span>
            )}
            <span className="font-headline text-sm font-bold">{loading ? 'Signing in...' : 'Continue with Google'}</span>
            {!loading && <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" />}
          </button>

          {error && (
            <p className="text-center text-xs font-medium text-tertiary">{error}</p>
          )}
        
          <div className="rounded-3xl border border-outline-variant/25 bg-surface-container-low p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
              <p className="text-xs font-medium leading-relaxed text-on-surface-variant">
                Your data stays on this device. Cloud backup is optional and encrypted when you turn it on.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
