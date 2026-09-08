import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Card } from './Card';

export type ModalMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  maxWidth?: ModalMaxWidth;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  overlayClassName?: string;
}

export const Modal = React.memo<ModalProps>(({
  isOpen,
  onClose,
  title,
  description,
  icon,
  maxWidth = 'md',
  children,
  footer,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  overlayClassName = '',
}) => {
  // Listen for Escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthStyles: Record<ModalMaxWidth, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    full: 'max-w-5xl',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 animate-fade-in ${overlayClassName}`}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />

      {/* Dialog Container */}
      <Card
        variant="highlight"
        className={`w-full ${maxWidthStyles[maxWidth]} relative z-10 p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-800 bg-slate-900/95 max-h-[90vh] flex flex-col ${className}`}
      >
        {/* Header */}
        {(title || icon) && (
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800/80 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {icon && <div className="shrink-0 text-amber-400">{icon}</div>}
              <div className="min-w-0">
                {typeof title === 'string' ? (
                  <h3 className="text-base sm:text-lg font-black text-white truncate tracking-tight">
                    {title}
                  </h3>
                ) : (
                  title
                )}
                {description && (
                  <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                    {description}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer active:scale-95 touch-manipulation shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </Card>
    </div>
  );
});

Modal.displayName = 'Modal';
