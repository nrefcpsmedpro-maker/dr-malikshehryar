'use client';

export default function VideoPlayer({ youtubeId }: { youtubeId: string }) {
  if (!youtubeId) {
    return (
      <div className="w-full aspect-video glass-card flex items-center justify-center text-muted-foreground">
        No video available.
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-black">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&controls=1&showinfo=0`}
        title="Course Video"
        className="absolute top-0 left-0 w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      ></iframe>
    </div>
  );
}
