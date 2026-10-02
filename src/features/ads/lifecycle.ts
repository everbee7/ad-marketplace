import type { AdStatus } from "@/config/enums";

// PRD §9.1 burst-ad lifecycle as data. Pure, so it can be unit-tested exhaustively.

export const AD_TRANSITIONS: Record<AdStatus, readonly AdStatus[]> = {
  uploading: ["pending_review", "failed"],
  failed: ["uploading"],
  pending_review: ["live", "rejected"],
  live: ["unlisted", "removed", "pending_review"],
  unlisted: ["live"],
  rejected: ["pending_review"],
  removed: [],
};

export function canTransition(from: AdStatus, to: AdStatus): boolean {
  return AD_TRANSITIONS[from].includes(to);
}

type VisibilityInput = {
  status: AdStatus;
  approvedAt: Date | null;
  pendingVideo: unknown;
  video: unknown;
  deletedAt: Date | null;
};

/** ADR-0006: what the Marketplace shows and what can be placed in projects. */
export function computeInMarketplace(ad: VisibilityInput): boolean {
  if (ad.deletedAt || !ad.video) return false;
  if (ad.status === "live") return true;
  return ad.status === "pending_review" && ad.approvedAt !== null && ad.pendingVideo != null;
}

/** Business-facing labels and tooltips (AD-03 AC2). */
export const AD_STATUS_INFO: Record<AdStatus, { label: string; tooltip: string }> = {
  uploading: {
    label: "Uploading…",
    tooltip: "Your video is uploading. Keep this tab open until it finishes.",
  },
  failed: {
    label: "Failed",
    tooltip: "The upload or the automatic check failed. Replace the video to try again.",
  },
  pending_review: {
    label: "In review",
    tooltip: "An admin is reviewing this ad. It goes live once it's approved.",
  },
  live: {
    label: "Live",
    tooltip: "Visible in the Marketplace. Creators can place it in their videos.",
  },
  unlisted: {
    label: "Unlisted",
    tooltip: "Hidden from the Marketplace. Relist it any time without a new review.",
  },
  rejected: {
    label: "Rejected",
    tooltip: "An admin rejected this ad. See the reason, edit it and resubmit.",
  },
  removed: {
    label: "Removed",
    tooltip: "Removed by an admin for breaking the content rules. This is final.",
  },
};
