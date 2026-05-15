import Link from "next/link";
import { ArrowRight, BookOpen, Clock3 } from "lucide-react";
import { CourseVisual } from "@/components/lms/CourseVisual";
import { ProgressBar } from "@/components/lms/ProgressBar";

export function CourseCard({
  href,
  title,
  description,
  thumbnailUrl,
  lessonCount,
  progress,
  meta,
}: {
  href: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  lessonCount: number;
  progress?: number;
  meta?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <CourseVisual title={title} src={thumbnailUrl} className="aspect-[16/9] rounded-none" />
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center gap-3 text-xs font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <BookOpen size={14} />
            {lessonCount} lessons
          </span>
          {meta && (
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={14} />
              {meta}
            </span>
          )}
        </div>
        <h3 className="line-clamp-2 text-lg font-semibold tracking-tight group-hover:text-primary">{title}</h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-muted-foreground">
          {description || "Structured clinical lessons, practice material, and assessment support."}
        </p>
        {typeof progress === "number" && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <ProgressBar value={progress} />
          </div>
        )}
        <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
          Open course <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
