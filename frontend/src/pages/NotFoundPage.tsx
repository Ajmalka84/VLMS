import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Card, Button } from '../components/common';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-6">
      <Card variant="glass" className="py-12 px-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center border border-rose-500/20">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white">404 — Page Not Found</h1>
          <p className="text-xs text-slate-400">
            The page you requested does not exist or has been moved.
          </p>
        </div>
        <div className="pt-4">
          <Link to="/">
            <Button
              variant="secondary"
              size="md"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
