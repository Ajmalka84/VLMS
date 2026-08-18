import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Construction, ArrowLeft } from 'lucide-react';
import { Card } from '../components/common/Card';

interface PlaceholderPageProps {
  title: string;
  hurdleNumber: number;
  description: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  hurdleNumber,
  description,
}) => {
  const location = useLocation();

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-12 space-y-6">
      <Card variant="glass" className="text-center py-12 px-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-500/10">
          <Construction className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Hurdle {hurdleNumber} Roadmap
          </span>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">{description}</p>
        </div>

        <div className="pt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-sm font-medium text-slate-200 hover:text-amber-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </Card>
    </div>
  );
};
