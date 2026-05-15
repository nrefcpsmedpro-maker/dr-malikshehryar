import Image from "next/image";
import { BookOpen } from "lucide-react";
import { cn } from "@/utils/cn";

function isAllowedRemoteImage(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith(".supabase.co") || parsed.hostname === "images.unsplash.com";
  } catch {
    return false;
  }
}

export function CourseVisual({
  title,
  src,
  className,
  priority = false,
}: {
  title: string;
  src?: string | null;
  className?: string;
  priority?: boolean;
}) {
  const canRenderImage = Boolean(src && (src.startsWith("/") || isAllowedRemoteImage(src)));

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-secondary", className)}>
      {canRenderImage && src ? (
        <Image src={src} alt={title} fill priority={priority} sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--primary)/0.18),hsl(var(--accent)/0.55))]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
      <div className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-lg bg-background/85 text-primary shadow-sm backdrop-blur">
        <BookOpen size={20} />
      </div>
    </div>
  );
}
