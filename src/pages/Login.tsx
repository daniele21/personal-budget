import React from 'react';
import { motion } from 'motion/react';
import { Landmark } from 'lucide-react';
import { User } from '../types';
import { APP_CONFIG } from '../constants';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login = ({ onLogin }: LoginProps) => {
  const handleFakeGoogleLogin = () => {
    const fakeUser: User = {
      id: 'google_' + Math.random().toString(36).substr(2, 9),
      name: 'Daniele Moltisanti',
      email: 'danielemoltisanti@gmail.com',
      photoUrl: 'https://picsum.photos/seed/daniele/100/100'
    };
    onLogin(fakeUser);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-12 bg-surface transition-colors duration-300">
      <div className="text-center space-y-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-primary/20"
        >
          <Landmark className="w-12 h-12 text-on-primary" />
        </motion.div>
        <div className="space-y-2">
          <h1 className="text-5xl font-headline font-extrabold text-primary tracking-tighter">{APP_CONFIG.name}</h1>
          <p className="text-on-surface-variant text-sm font-medium tracking-wide uppercase">{APP_CONFIG.tagline}</p>
        </div>
        <p className="text-on-surface-variant/70 max-w-[240px] mx-auto text-sm leading-relaxed">
          {APP_CONFIG.description}
        </p>
      </div>
      
      <div className="w-full max-w-xs space-y-4">
        <button 
          onClick={handleFakeGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-surface-container-lowest text-on-surface py-4 px-6 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.97] border border-outline-variant/10"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          <span className="font-bold text-sm">Continue with Google</span>
        </button>
        
        <div className="flex items-center gap-4 py-2">
          <div className="h-px bg-outline-variant/20 flex-1"></div>
          <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Secure Access</span>
          <div className="h-px bg-outline-variant/20 flex-1"></div>
        </div>
        
        <p className="text-[10px] text-on-surface-variant/50 text-center leading-relaxed">
          By continuing, you agree to our <br/>
          <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
};
