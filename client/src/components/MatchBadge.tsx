// client/src/components/MatchBadge.tsx
//
// Displays a resume match score (0–100) as a colour-coded badge.
// Renders nothing if score is undefined — clean no-resume fallback.

interface Props {
  score: number | undefined;
}

function getScoreStyle(score: number): {
  label: string;
  className: string;
} {
  if (score >= 75)
    return {
      label: `${score}% match`,
      className:
        "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    };
  if (score >= 50)
    return {
      label: `${score}% match`,
      className:
        "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    };
  return {
    label: `${score}% match`,
    className: "bg-muted text-muted-foreground border-border",
  };
}

export default function MatchBadge({ score }: Props) {
  if (score === undefined) return null;

  const { label, className } = getScoreStyle(score);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums ${className}`}
    >
      {label}
    </span>
  );
}
