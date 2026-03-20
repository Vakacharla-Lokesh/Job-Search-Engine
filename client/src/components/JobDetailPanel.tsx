import { useQuery } from "@tanstack/react-query";
import { getJob } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { MapPin, Building2, ExternalLink } from "lucide-react";
import { formatSalary } from "@/lib/utils";
import SkillGapSidebar from "@/components/SkillGapSidebar";

interface Props {
  jobId: string | null;
  onClose: () => void;
  matchScore?: number;
  resumeText?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  remotive: "Remotive",
  hn: "Hacker News",
  arbeitnow: "Arbeitnow",
  themuse: "The Muse",
  adzuna: "Adzuna",
};

function DetailSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
      <Separator />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-3 w-full"
          />
        ))}
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export default function JobDetailPanel({
  jobId,
  onClose,
  matchScore,
  resumeText,
}: Props) {
  const { data: job, isLoading } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJob(jobId!),
    enabled: jobId !== null,
    staleTime: 1000 * 60 * 5,
  });

  const salary = job ? formatSalary(job.salary_min, job.salary_max) : null;
  const showSkillGap =
    job !== undefined &&
    matchScore !== undefined &&
    resumeText !== undefined &&
    job.skills.length > 0;

  return (
    <Sheet
      open={jobId !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto p-0"
      >
        {isLoading && <DetailSkeleton />}

        {job && (
          <>
            <SheetHeader className="p-6 pb-4">
              <SheetTitle className="text-lg leading-snug">
                {job.title}
              </SheetTitle>
              <SheetDescription asChild>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="size-3.5" />
                    {job.company}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {job.location}
                  </span>
                  {salary && (
                    <span className="font-medium text-foreground">
                      {salary}
                    </span>
                  )}
                  {job.remote && <Badge variant="secondary">Remote</Badge>}
                </div>
              </SheetDescription>
            </SheetHeader>

            <Separator />

            {/* Skill gap — only when resume is loaded */}
            {showSkillGap && (
              <>
                <SkillGapSidebar
                  jobSkills={job.skills}
                  resumeText={resumeText!}
                  matchScore={matchScore!}
                />
                <Separator />
              </>
            )}

            {/* Skills list — only when no resume (skill gap replaces it) */}
            {!showSkillGap && job.skills.length > 0 && (
              <>
                <div className="px-6 py-4 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            <div className="px-6 py-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Description
              </p>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                {job.description}
              </pre>
            </div>

            <Separator />

            <div className="px-6 py-4">
              <a
                href={job.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Apply on {SOURCE_LABELS[job.source] ?? "job board"}
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
