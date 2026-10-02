import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Terms of service" };

// PRD §11: the client provides the text before launch. TODO(launch, ROADMAP M8): replace with client copy.
export default function TermsPage() {
  return (
    <LegalPage title="Terms of service">
      <p>The full terms of service will be published here before launch.</p>
      <p>
        In short: businesses may only upload ads they own the rights to. Every ad is reviewed before
        it appears in the Marketplace, and any live ad may be placed by creators in their own
        videos.
      </p>
    </LegalPage>
  );
}
