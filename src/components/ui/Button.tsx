import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-chalkboard text-chalk hover:bg-chalkboard-deep',
  secondary: 'border-2 border-chalkboard text-chalkboard hover:bg-chalkboard/5',
  danger: 'bg-kumkum text-white hover:bg-kumkum-deep',
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`rounded-full px-6 py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turmeric-deep ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
