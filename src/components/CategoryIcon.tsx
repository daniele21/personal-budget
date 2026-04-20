import React from 'react';
import { 
  Home, 
  ShoppingCart, 
  Utensils, 
  Bus, 
  Film, 
  Dumbbell, 
  Wallet, 
  Landmark, 
  ShoppingBag, 
  PieChart 
} from 'lucide-react';
import { cn } from '../lib/utils';

export const CategoryIcon = ({ category, className }: { category: string, className?: string }) => {
  const iconProps = { className: cn("w-5 h-5", className) };
  switch (category) {
    case 'Housing':
    case 'Rent':
      return <Home {...iconProps} />;
    case 'Groceries':
      return <ShoppingCart {...iconProps} />;
    case 'Dining':
      return <Utensils {...iconProps} />;
    case 'Transport':
      return <Bus {...iconProps} />;
    case 'Entertainment':
      return <Film {...iconProps} />;
    case 'Health':
      return <Dumbbell {...iconProps} />;
    case 'Salary':
      return <Wallet {...iconProps} />;
    case 'Utilities':
      return <Landmark {...iconProps} />;
    case 'Shopping':
      return <ShoppingBag {...iconProps} />;
    default:
      return <PieChart {...iconProps} />;
  }
};
