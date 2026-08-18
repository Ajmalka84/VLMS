import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'highlight';
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'glass',
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-slate-900 border border-slate-800',
    glass: 'glass-card text-slate-100 shadow-xl',
    highlight:
      'glass-card border-amber-500/30 glow-amber bg-slate-900/80 text-slate-100 shadow-xl',
  };

  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 transition-all duration-200 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
