export const formatCurrency = (amount: number, currency: string = '€') => {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount).replace('€', currency);
};

export const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
