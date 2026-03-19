// client/src/components/SkillGapSidebar.tsx
//
// Shows a skill gap breakdown for a job when a resume is loaded.
// "Matched" = skill keyword appears in resume text (case-insensitive).
// "Missing" = skill keyword not found in resume text.
// This is keyword matching, not semantic — fast, transparent, explainable.

import { Badge } from "@/components/ui/badge";
import MatchBadge from "@/components/MatchBadge";
import { CheckCircle2, XCircle } from "lucide-react";

interface Props {
  jobSkills: string[];
  resumeText: string; // raw resume text, for keyword matching
  matchScore: number; // 0–100, from the worker
}

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9+#.]/g, " ")
    .trim();
}

function skillInResume(skill: string, resumeText: string): boolean {
  const normSkill = normalise(skill);
  const normResume = normalise(resumeText);
  // Multi-word skills: require all words present, in any order
  const words = normSkill.split(/\s+/).filter(Boolean);
  return words.every((word) => normResume.includes(word));
}

export default function SkillGapSidebar({
  jobSkills,
  resumeText,
  matchScore,
}: Props) {
  if (jobSkills.length === 0) return null;

  const matched = jobSkills.filter((s) => skillInResume(s, resumeText));
  const missing = jobSkills.filter((s) => !skillInResume(s, resumeText));

  return (
    <div className="px-6 py-4 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Resume Match
        </p>
        <MatchBadge score={matchScore} />
      </div>

      {/* Matched skills */}
      {matched.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            <span>You have ({matched.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {matched.map((skill) => (
              <Badge
                key={skill}
                variant="outline"
                className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              >
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Missing skills */}
      {missing.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <XCircle className="size-3.5" />
            <span>Gaps ({missing.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((skill) => (
              <Badge
                key={skill}
                variant="outline"
                className="opacity-60"
              >
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
