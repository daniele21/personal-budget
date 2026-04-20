import React from 'react';
import { AnimatePresence } from 'motion/react';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

export const Layout = ({ children, title }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-surface transition-colors duration-300">
      <TopBar title={title} />
      <main className="pt-18 px-4 max-w-md mx-auto sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  );
};
