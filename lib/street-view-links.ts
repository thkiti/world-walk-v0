export type StreetViewLinkInfo = {
  pano: string;
  heading: number;
  description?: string;
};

export type ForwardLinkAnalysis = {
  isDecisionPoint: boolean;
  forwardLink: StreetViewLinkInfo | null;
};

const FORWARD_TOLERANCE_DEGREES = 45;
const DECISION_MIN_ANGLE_DEGREES = 25;

function normalizeAngleDiff(a: number, b: number): number {
  return Math.abs(((a - b + 180) % 360) - 180);
}

export function analyzeForwardLink(
  links: (google.maps.StreetViewLink | null)[] | null | undefined,
  currentHeading: number
): ForwardLinkAnalysis {
  if (!links || links.length === 0) {
    return { isDecisionPoint: false, forwardLink: null };
  }

  const scored = links
    .filter(
      (link): link is google.maps.StreetViewLink =>
        link != null && Boolean(link.pano)
    )
    .map((link) => ({
      pano: link.pano!,
      heading: link.heading ?? 0,
      description: link.description ?? undefined,
      angleDiff: normalizeAngleDiff(link.heading ?? 0, currentHeading),
    }));

  if (scored.length === 0) {
    return { isDecisionPoint: false, forwardLink: null };
  }

  scored.sort((a, b) => a.angleDiff - b.angleDiff);

  const closeLinks = scored.filter(
    (link) => link.angleDiff <= FORWARD_TOLERANCE_DEGREES
  );

  if (closeLinks.length === 0) {
    return { isDecisionPoint: false, forwardLink: null };
  }

  if (closeLinks.length === 1) {
    const best = closeLinks[0];
    return {
      isDecisionPoint: false,
      forwardLink: {
        pano: best.pano,
        heading: best.heading,
        description: best.description,
      },
    };
  }

  const best = closeLinks[0];
  const hasMeaningfulBranch = closeLinks.some(
    (candidate, index) =>
      index > 0 &&
      normalizeAngleDiff(candidate.heading, best.heading) >=
        DECISION_MIN_ANGLE_DEGREES
  );

  if (hasMeaningfulBranch) {
    return { isDecisionPoint: true, forwardLink: null };
  }

  return {
    isDecisionPoint: false,
    forwardLink: {
      pano: best.pano,
      heading: best.heading,
      description: best.description,
    },
  };
}
