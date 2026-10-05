'use client';

import { Suspense } from 'react';
import ScanContent from './scan-content';

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">⏳</div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <ScanContent />
    </Suspense>
  );
}
