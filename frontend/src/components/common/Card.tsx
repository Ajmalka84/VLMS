import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'highlight';
  className?: string;
}

export const Card: React.FC<CardProps> = React.memo(({
  children,
  variant = 'glass',
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-surface-solid border border-subtle text-primary shadow-sm',
    glass: 'glass-card text-primary shadow-xl',
    highlight:
      'glass-card border-amber-500/30 text-primary shadow-xl',
  };

  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 transition-all duration-200 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';
