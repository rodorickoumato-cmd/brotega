'use client';

import { Suspense } from 'react';
import SetupContent from './setup-content';

export default function SetupPseudoPinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">⏳</div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <SetupContent />
    </Suspense>
  );
}
