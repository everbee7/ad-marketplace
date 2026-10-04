import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Privacy policy" };

// PRD §11: the client provides the text before launch. TODO(launch, ROADMAP M8): replace with client copy.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>The full privacy policy will be published here before launch.</p>
      <p>
        Flashd collects only your email address and the profile details you enter. Creator videos
        are private to you and our moderators. You can delete your content at any time; to delete
        your account, contact us.
      </p>
    </LegalPage>
  );
}
