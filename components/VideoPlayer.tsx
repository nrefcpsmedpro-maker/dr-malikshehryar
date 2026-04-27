'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/utils/cn';

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: {
      Player: new (
        element: HTMLDivElement,
        options: {
          host?: string;
          videoId?: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: () => void;
            onStateChange?: (event: { data: number }) => void;
            onPlaybackQualityChange?: (event: { data: string }) => void;
          };
        },
      ) => {
        playVideo: () => void;
        pauseVideo: () => void;
        setSize: (width: number, height: number) => void;
        seekTo: (seconds: number, allowSeekAhead: boolean) => void;
        getCurrentTime: () => number;
        getDuration: () => number;
        getVolume: () => number;
        setVolume: (volume: number) => void;
        mute: () => void;
        unMute: () => void;
        isMuted: () => boolean;
        getPlaybackQuality: () => string;
        setPlaybackQuality: (quality: string) => void;
        getAvailableQualityLevels: () => string[];
        getPlayerState: () => number;
        destroy: () => void;
      };
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    __youtubeApiReadyPromise?: Promise<void>;
  }
}

function loadYouTubeApi() {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (window.__youtubeApiReadyPromise) {
    return window.__youtubeApiReadyPromise;
  }

  window.__youtubeApiReadyPromise = new Promise<void>((resolve) => {
    const existingScript = document.getElementById('yt-iframe-api');
    if (existingScript) {
      const previousReadyHandler = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousReadyHandler?.();
        resolve();
      };
      return;
    }

    const script = document.createElement('script');
    script.id = 'yt-iframe-api';
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;

    const previousReadyHandler = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReadyHandler?.();
      resolve();
    };

    document.head.appendChild(script);
  });

  return window.__youtubeApiReadyPromise;
}

function formatTime(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const remainder = (safe % 60).toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${minutes}:${remainder}`;
  }
  return `${minutes}:${remainder}`;
}

type VideoSessionResponse = {
  videoId: string;
};

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export default function VideoPlayer({ playbackToken }: { playbackToken: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<InstanceType<NonNullable<typeof window.YT>['Player']> | null>(null);
  const hideControlsTimerRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);
  const progressUpdateTimerRef = useRef<number | ReturnType<typeof setInterval> | null>(null);

  const [videoId, setVideoId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [currentQuality, setCurrentQuality] = useState<string>('auto');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'speed' | 'quality'>('speed');
  const [isBuffering, setIsBuffering] = useState(false);

  const syncPlayerSize = useCallback(() => {
    if (!playerRef.current) {
      return;
    }

    // In fullscreen, use the container (which is the fullscreen element)
    const measureEl = containerRef.current;
    if (!measureEl) return;

    const { width, height } = measureEl.getBoundingClientRect();
    if (width > 0 && height > 0) {
      playerRef.current.setSize(Math.round(width), Math.round(height));
    }

    // Also force the iframe to fill via direct style
    const iframe = containerRef.current?.querySelector('iframe');
    if (iframe) {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.position = 'absolute';
      iframe.style.top = '0';
      iframe.style.left = '0';
    }
  }, []);

  const fetchSession = useCallback(async () => {
    setErrorMessage('');
    try {
      const response = await fetch(`/api/video/session?token=${encodeURIComponent(playbackToken)}`, {
        cache: 'no-store',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unable to load secure video session.' }));
        throw new Error(errorData.error || 'Unable to load secure video session.');
      }

      const data = (await response.json()) as VideoSessionResponse;
      setVideoId(data.videoId);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to load secure video. Refresh the page and try again.');
    }
  }, [playbackToken]);

  useEffect(() => {
    let cancelled = false;
    let errorSet = false;

    const doFetch = async () => {
      try {
        await fetchSession();
      } catch {
        if (!cancelled && !errorSet) {
          errorSet = true;
          setErrorMessage('Unable to load secure video. Refresh the page and try again.');
        }
      }
    };

    doFetch();

    return () => {
      cancelled = true;
    };
  }, [fetchSession]);

  useEffect(() => {
    if (!videoId || !playerHostRef.current) {
      return;
    }

    let disposed = false;

    const bootPlayer = async () => {
      await loadYouTubeApi();
      if (disposed || !playerHostRef.current || !window.YT?.Player) {
        return;
      }

      playerRef.current?.destroy();

      playerRef.current = new window.YT.Player(playerHostRef.current, {
        host: 'https://www.youtube-nocookie.com',
        videoId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          iv_load_policy: 3,
          playsinline: 1,
          origin: window.location.origin,
          widget_referrer: window.location.origin,
        },
        events: {
          onReady: () => {
            if (disposed || !playerRef.current) {
              return;
            }

            const storedVolume = localStorage.getItem('video-volume');
            const initialVolume = storedVolume ? parseInt(storedVolume, 10) : 80;
            playerRef.current.setVolume(initialVolume);
            setVolume(initialVolume);
            setDuration(playerRef.current.getDuration());
            setReady(true);

            const qualities = playerRef.current.getAvailableQualityLevels();
            setAvailableQualities(qualities.length > 0 ? qualities : ['auto']);
            syncPlayerSize();
          },
          onStateChange: (event) => {
            if (disposed) return;
            const ytState = window.YT?.PlayerState;
            setIsPlaying(event.data === ytState?.PLAYING);
            setIsBuffering(event.data === ytState?.BUFFERING);
          },
          onPlaybackQualityChange: (event) => {
            if (disposed) return;
            setCurrentQuality(event.data);
          },
        },
      });
    };

    bootPlayer().catch(() => {
      if (!disposed) {
        setErrorMessage('Secure player initialization failed. Please refresh and try again.');
      }
    });

    return () => {
      disposed = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      setReady(false);
    };
  }, [videoId, syncPlayerSize]);

  useEffect(() => {
    if (!ready || !containerRef.current) {
      return;
    }

    syncPlayerSize();
    const observer = new ResizeObserver(() => {
      syncPlayerSize();
    });

    // Observe the outer container so fullscreen transitions trigger resize
    observer.observe(containerRef.current);
    if (playerHostRef.current) {
      observer.observe(playerHostRef.current);
    }
    return () => observer.disconnect();
  }, [ready, syncPlayerSize]);

  useEffect(() => {
    if (ready && isPlaying) {
      progressUpdateTimerRef.current = window.setInterval(() => {
        if (!playerRef.current) return;
        setCurrentTime(playerRef.current.getCurrentTime());
        setDuration(playerRef.current.getDuration());
      }, 250);
    } else {
      if (progressUpdateTimerRef.current) {
        window.clearInterval(progressUpdateTimerRef.current);
        progressUpdateTimerRef.current = null;
      }
    }

    return () => {
      if (progressUpdateTimerRef.current) {
        window.clearInterval(progressUpdateTimerRef.current);
      }
    };
  }, [ready, isPlaying]);

  useEffect(() => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowControls(true);
    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSettings(false);
      }, 3000);
    }
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, [isPlaying]);

  const scheduleHideControls = useCallback(() => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    setShowControls(true);
    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSettings(false);
      }, 3000);
    }
  }, [isPlaying]);

  const togglePlayback = useCallback(() => {
    if (!playerRef.current || !ready) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
    scheduleHideControls();
  }, [isPlaying, ready, scheduleHideControls]);

  const handleSeek = useCallback((seconds: number) => {
    if (!playerRef.current || !ready) return;
    playerRef.current.seekTo(seconds, true);
    setCurrentTime(seconds);
    scheduleHideControls();
  }, [ready, scheduleHideControls]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    if (!playerRef.current || !ready) return;
    playerRef.current.setVolume(newVolume);
    setVolume(newVolume);
    localStorage.setItem('video-volume', String(newVolume));
    if (newVolume === 0) {
      playerRef.current.mute();
      setMuted(true);
    } else if (muted) {
      playerRef.current.unMute();
      setMuted(false);
    }
    scheduleHideControls();
  }, [ready, muted, scheduleHideControls]);

  const toggleMute = useCallback(() => {
    if (!playerRef.current || !ready) return;
    if (muted || playerRef.current.isMuted()) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume || 80);
      setMuted(false);
    } else {
      playerRef.current.mute();
      setMuted(true);
    }
    scheduleHideControls();
  }, [muted, ready, volume, scheduleHideControls]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
    // Give the browser a frame to update layout, then sync size
    requestAnimationFrame(() => {
      syncPlayerSize();
    });
    scheduleHideControls();
  }, [scheduleHideControls, syncPlayerSize]);

  const togglePiP = useCallback(async () => {
    if (!playerHostRef.current) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        const videoElement = playerHostRef.current.querySelector('iframe');
        if (videoElement) {
          await (videoElement as any).requestPictureInPicture();
        }
      }
    } catch {
    }
    scheduleHideControls();
  }, [scheduleHideControls]);

  const handleSpeedChange = useCallback((speed: number) => {
    if (!playerRef.current || !ready) return;
    const iframe = playerHostRef.current?.querySelector('iframe') as HTMLIFrameElement | null;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(`{"event":"command","func":"setPlaybackRate","args":[${speed}]}`, '*');
    }
    setPlaybackSpeed(speed);
    setShowSettings(false);
    scheduleHideControls();
  }, [ready, scheduleHideControls]);

  const handleQualityChange = useCallback((quality: string) => {
    if (!playerRef.current || !ready) return;
    playerRef.current.setPlaybackQuality(quality);
    setCurrentQuality(quality);
    setShowSettings(false);
    scheduleHideControls();
  }, [ready, scheduleHideControls]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    handleSeek(newTime);
  }, [duration, handleSeek]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!ready || !playerRef.current) return;
      if (showSettings) return;

      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlayback();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'arrowleft':
          e.preventDefault();
          handleSeek(Math.max(0, currentTime - 5));
          break;
        case 'arrowright':
          e.preventDefault();
          handleSeek(Math.min(duration, currentTime + 5));
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange(Math.min(100, volume + 5));
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 5));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ready, showSettings, togglePlayback, toggleMute, toggleFullscreen, handleSeek, handleVolumeChange, currentTime, duration, volume]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      // Sync player size after fullscreen transition completes
      requestAnimationFrame(() => {
        syncPlayerSize();
        // Double-sync after a short delay for browser layout settle
        setTimeout(() => syncPlayerSize(), 100);
      });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [syncPlayerSize]);

  // ── Anti-Right-Click Extension Protection ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Save native preventDefault so extensions can't neuter it
    const nativePreventDefault = Event.prototype.preventDefault;

    // Capture-phase handler — runs before ANY bubbling listener or extension handler
    const blockContextMenu = (e: Event) => {
      nativePreventDefault.call(e);
      e.stopImmediatePropagation();
      e.stopPropagation();
      return false;
    };

    // Block right-click (contextmenu) in capture phase with highest priority
    const attachCapture = () => {
      container.removeEventListener('contextmenu', blockContextMenu, true);
      container.addEventListener('contextmenu', blockContextMenu, true);
    };

    attachCapture();

    // Re-attach every 500ms to defeat extensions that strip listeners
    const reattachInterval = setInterval(attachCapture, 500);

    // Also block at document level for the player area
    const docBlocker = (e: Event) => {
      if (container.contains(e.target as Node)) {
        nativePreventDefault.call(e);
        e.stopImmediatePropagation();
        e.stopPropagation();
        return false;
      }
    };
    document.addEventListener('contextmenu', docBlocker, true);

    // Block keyboard shortcuts that extensions or dev tools use
    const blockKeys = (e: KeyboardEvent) => {
      if (!container.contains(document.activeElement) && !container.matches(':hover')) return;
      // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
        (e.ctrlKey && ['u', 'U'].includes(e.key)) ||
        (e.metaKey && e.altKey && ['i', 'I', 'j', 'J', 'c', 'C'].includes(e.key))
      ) {
        nativePreventDefault.call(e);
        e.stopImmediatePropagation();
      }
    };
    document.addEventListener('keydown', blockKeys, true);

    // MutationObserver — detect if extension strips oncontextmenu attribute
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'oncontextmenu') {
          container.setAttribute('oncontextmenu', 'return false;');
        }
      }
    });
    container.setAttribute('oncontextmenu', 'return false;');
    observer.observe(container, { attributes: true, attributeFilter: ['oncontextmenu'] });

    return () => {
      clearInterval(reattachInterval);
      container.removeEventListener('contextmenu', blockContextMenu, true);
      document.removeEventListener('contextmenu', docBlocker, true);
      document.removeEventListener('keydown', blockKeys, true);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = () => {
      scheduleHideControls();
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      return () => container.removeEventListener('mousemove', handleMouseMove);
    }
  }, [scheduleHideControls]);

  const progress = useMemo(() => {
    if (!duration) return 0;
    return Math.min(100, (currentTime / duration) * 100);
  }, [currentTime, duration]);

  if (errorMessage) {
    return (
      <div className="w-full aspect-video glass-card flex items-center justify-center text-destructive text-center px-6">
        {errorMessage}
      </div>
    );
  }

  return (
    <section
      ref={containerRef}
      className={cn(
        'w-full select-none relative group rounded-xl overflow-hidden shadow-2xl border border-black/20 bg-black',
        isFullscreen && 'fixed inset-0 z-50 rounded-none'
      )}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}
      onCopy={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        MozUserSelect: 'none' as React.CSSProperties['userSelect'],
        ...(isFullscreen ? { width: '100vw', height: '100vh' } : {}),
      }}
    >
      {/* Global style to force iframe sizing + anti-extension right-click protection */}
      <style>{`
        #yt-player-host iframe {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
        }
        /* Shield overlay to absorb right-clicks even if extension strips JS handlers */
        .video-shield-overlay {
          position: absolute;
          inset: 0;
          z-index: 5;
          background: transparent;
          cursor: default;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }
        .video-shield-overlay::before {
          content: '';
          position: absolute;
          inset: 0;
        }
      `}</style>
      <div
        className={cn(
          'relative w-full bg-black',
          isFullscreen ? 'h-full' : 'aspect-video'
        )}
      >
        <div
          ref={playerHostRef}
          id="yt-player-host"
          className="absolute inset-0 pointer-events-none"
        />

        {/* Transparent shield overlay - absorbs right-clicks even if extension strips JS */}
        <div
          className="video-shield-overlay"
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }}
          onDragStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onCopy={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          data-nocontextmenu="true"
        />

        {!ready && !errorMessage && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              <span className="text-white/70 text-sm">Initializing protected stream...</span>
            </div>
          </div>
        )}

        {isBuffering && ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        <div
          className={cn(
            'absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-300',
            showControls && ready && 'opacity-100',
            !ready && 'pointer-events-none'
          )}
          onDoubleClick={toggleFullscreen}
        >
          <button
            type="button"
            onClick={togglePlayback}
            className="w-16 h-16 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-all hover:scale-105"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg className="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>
        </div>

        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 z-10 transition-opacity duration-300',
            showControls && ready ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
<div
          className="h-1 w-full bg-white/20 cursor-pointer group/progress relative"
          onClick={handleProgressClick}
        >
          <div
            className="absolute inset-y-0 left-0 bg-red-600 transition-all"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>

          <div className="bg-gradient-to-t from-black/90 to-transparent px-3 py-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlayback}
                className="text-white hover:text-white/80 transition-colors p-1"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                )}
              </button>

              <div className="flex items-center gap-1 group/vol">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="text-white hover:text-white/80 transition-colors p-1"
                  aria-label={muted ? 'Unmute' : 'Mute'}
                >
                  {muted || volume === 0 ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    </svg>
                  ) : volume < 50 ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={muted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-white"
                  aria-label="Volume"
                />
              </div>

              <span className="text-white text-sm ml-2 font-medium">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="ml-auto flex items-center gap-1">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsTab('speed');
                      setShowSettings(!showSettings);
                    }}
                    className="text-white hover:text-white/80 transition-colors p-2"
                    aria-label="Settings"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
                    </svg>
                  </button>

                  {showSettings && (
                    <div className="absolute bottom-full right-0 mb-12 bg-black/95 border border-white/20 rounded-lg overflow-hidden shadow-xl min-w-[200px]">
                      <div className="flex border-b border-white/10">
                        <button
                          type="button"
                          onClick={() => setSettingsTab('speed')}
                          className={cn(
                            'flex-1 px-4 py-2 text-sm transition-colors',
                            settingsTab === 'speed' ? 'text-white bg-white/10' : 'text-white/60 hover:text-white'
                          )}
                        >
                          Speed
                        </button>
                        <button
                          type="button"
                          onClick={() => setSettingsTab('quality')}
                          className={cn(
                            'flex-1 px-4 py-2 text-sm transition-colors',
                            settingsTab === 'quality' ? 'text-white bg-white/10' : 'text-white/60 hover:text-white'
                          )}
                        >
                          Quality
                        </button>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {settingsTab === 'speed' ? (
                          <div className="py-2">
                            {PLAYBACK_SPEEDS.map((speed) => (
                              <button
                                key={speed}
                                type="button"
                                onClick={() => handleSpeedChange(speed)}
                                className={cn(
                                  'w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between',
                                  playbackSpeed === speed ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5'
                                )}
                              >
                                <span>{speed === 1 ? 'Normal' : `${speed}x`}</span>
                                {playbackSpeed === speed && (
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="py-2">
                            <button
                              key="auto"
                              type="button"
                              onClick={() => handleQualityChange('auto')}
                              className={cn(
                                'w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between',
                                currentQuality === 'auto' ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5'
                              )}
                            >
                              <span>Auto</span>
                              {currentQuality === 'auto' && (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                </svg>
                              )}
                            </button>
                            {availableQualities.filter((q) => q !== 'auto').map((quality) => (
                              <button
                                key={quality}
                                type="button"
                                onClick={() => handleQualityChange(quality)}
                                className={cn(
                                  'w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between',
                                  currentQuality === quality ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5'
                                )}
                              >
                                <span className="capitalize">{quality}</span>
                                {currentQuality === quality && (
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={togglePiP}
                  className="text-white hover:text-white/80 transition-colors p-2"
                  aria-label="Picture in Picture"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="text-white hover:text-white/80 transition-colors p-2"
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}