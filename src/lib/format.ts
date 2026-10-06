export const formatPeso = (value: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(value);
};

export const formatCount = (value: number) => {
  return new Intl.NumberFormat('en-US').format(value);
};