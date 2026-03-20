// src/components/JobCard.tsx
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { JobDocument } from "@/types/job.interfaces";
import { MapPin, Building2, Clock } from "lucide-react";
import MatchBadge from "@/components/MatchBadge";
import { formatSalary } from "@/lib/utils";

type Job = Omit<JobDocument, "embedding">;

interface Props {
  job: Job;
  onSelect: () => void;
  matchScore?: number;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const MAX_VISIBLE_SKILLS = 4;

export default function JobCard({ job, onSelect, matchScore }: Props) {
  const salary = formatSalary(job.salary_min, job.salary_max);
  const visibleSkills = job.skills.slice(0, MAX_VISIBLE_SKILLS);
  const extraSkills = job.skills.length - MAX_VISIBLE_SKILLS;

  return (
    <button
      onClick={onSelect}
      className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{job.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="size-3.5 shrink-0" />
              {job.company}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5 shrink-0" />
              {job.location}
            </span>
            {salary && (
              <span className="font-medium text-foreground">{salary}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <MatchBadge score={matchScore} />
          {job.remote && <Badge variant="secondary">Remote</Badge>}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {timeAgo(job.posted_at)}
          </span>
        </div>
      </div>

      {visibleSkills.length > 0 && (
        <>
          <Separator className="my-3" />
          <div className="flex flex-wrap gap-1.5">
            {visibleSkills.map((skill) => (
              <Badge
                key={skill}
                variant="outline"
              >
                {skill}
              </Badge>
            ))}
            {extraSkills > 0 && (
              <Badge variant="ghost">+{extraSkills} more</Badge>
            )}
          </div>
        </>
      )}
    </button>
  );
}
