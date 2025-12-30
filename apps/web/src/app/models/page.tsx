/**
 * Models Page
 *
 * Model management and catalog route.
 * Story 2.2: Model Catalog & Cards
 *
 * AC1: Model Catalog Display
 * AC2: Model Card Details
 * AC3: Hardware-Based Recommendations
 * AC4: Vulnerability Warnings
 */

import { ModelsPageContent } from "./page-content";

export const metadata = {
  title: "Models - Continuum",
  description: "Browse and manage AI models",
};

export default function ModelsPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <ModelsPageContent />
    </main>
  );
}
