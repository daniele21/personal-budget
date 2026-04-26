import React from 'react';
import { motion } from 'motion/react';
import { APP_CONFIG } from '../constants';

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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-12 bg-surface transition-colors duration-300">
      <div className="text-center space-y-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-primary/20 overflow-hidden"
        >
          <img src="/logo.png" alt="Aura Finance" className="w-full h-full object-cover" />
        </motion.div>
        <div className="space-y-2">
          <h1 className="text-5xl font-headline font-extrabold text-primary tracking-tighter">{APP_CONFIG.name}</h1>
          <p className="text-on-surface-variant text-sm font-medium tracking-wide">{APP_CONFIG.tagline}</p>
        </div>
        <p className="text-on-surface-variant/70 max-w-[240px] mx-auto text-sm leading-relaxed">
          {APP_CONFIG.description}
        </p>
      </div>
      
      <div className="w-full max-w-xs space-y-4">
        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-surface-container-lowest text-on-surface py-4 px-6 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.97] border border-outline-variant/10 disabled:opacity-60 disabled:pointer-events-none"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          )}
          <span className="font-bold text-sm">{loading ? 'Signing in...' : 'Continue with Google'}</span>
        </button>

        {error && (
          <p className="text-xs text-tertiary text-center font-medium">{error}</p>
        )}
        
        <div className="flex items-center gap-4 py-2">
          <div className="h-px bg-outline-variant/20 flex-1"></div>
          <span className="text-micro font-bold text-on-surface-variant/40">Secure Access</span>
          <div className="h-px bg-outline-variant/20 flex-1"></div>
        </div>
        
        <p className="text-micro text-on-surface-variant/50 text-center leading-relaxed">
          By continuing, you agree to our <br/>
          <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
};
