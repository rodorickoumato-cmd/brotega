"use client";

import { Suspense } from "react";
import VerifyRegistrationContent from "./content";

export default function VerifyRegistrationPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyRegistrationContent />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Chargement...</p>
      </div>
    </div>
  );
}
