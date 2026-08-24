"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveVideoPositionAction } from "@/lib/video-actions";
import { cn, formatClock } from "@/lib/utils";

type Chapter = { title: string; startSec: number };

type VideoPlayerProps = {
  nodeId: string;
  videoUrl: string;
  chapters: Chapter[];
  initialPositionSec: number | null;
};

const RATES = [0.75, 1, 1.25, 1.5, 2];
const SPEED_KEY = "wtf_playback_rate";
const SAVE_EVERY_MS = 5_000;

export function VideoPlayer({ nodeId, videoUrl, chapters, initialPositionSec }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSaveAt = useRef(0);
  const [rate, setRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [resumedFrom, setResumedFrom] = useState<number | null>(null);
  const metadataHandled = useRef(false);

  const applyRate = (next: number) => {
    setRate(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
    window.localStorage.setItem(SPEED_KEY, String(next));
  };

  const savePosition = useCallback(
    (immediate: boolean) => {
      const video = videoRef.current;
      if (!video) return;
      const now = Date.now();
      if (!immediate && now - lastSaveAt.current < SAVE_EVERY_MS) return;
      lastSaveAt.current = now;
      const fd = new FormData();
      fd.set("nodeId", nodeId);
      fd.set("positionSec", String(Math.floor(video.currentTime)));
      void saveVideoPositionAction(fd);
    },
    [nodeId],
  );

  // Persist on tab hide / page hide / unmount
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") savePosition(true);
    };
    const onPageHide = () => savePosition(true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      savePosition(true);
    };
  }, [savePosition]);

  // Runs once when the video's metadata is known: restore speed, report real
  // duration, and resume from the saved position.
  const handleMetadataReady = useCallback(() => {
    const video = videoRef.current;
    if (!video || metadataHandled.current) return;
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    metadataHandled.current = true;

    // Restore the user's preferred playback speed
    const stored = Number(window.localStorage.getItem(SPEED_KEY) || "1");
    if (RATES.includes(stored)) {
      setRate(stored);
      video.playbackRate = stored;
    }

    // Report the real duration (server corrects LessonVideo.durationSec when off by >5%)
    const fd = new FormData();
    fd.set("nodeId", nodeId);
    fd.set("measuredDurationSec", String(Math.round(video.duration)));
    void saveVideoPositionAction(fd);

    // Resume from the saved position
    if (initialPositionSec && initialPositionSec > 0 && initialPositionSec < video.duration - 5) {
      video.currentTime = initialPositionSec;
      setResumedFrom(initialPositionSec);
      window.setTimeout(() => setResumedFrom(null), 4_000);
    }
  }, [nodeId, initialPositionSec]);

  // Fallback: cached/local media can fire loadedmetadata BEFORE React hydration
  // binds the handler — in that case the event above never reaches us. If the
  // metadata is already available at mount, run the same logic (deferred so the
  // state updates happen outside the effect body).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 1 || metadataHandled.current) return;
    const t = window.setTimeout(handleMetadataReady, 0);
    return () => window.clearTimeout(t);
  }, [handleMetadataReady]);

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (!video.paused) savePosition(false);
  };

  const seekTo = (sec: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = sec;
    setCurrentTime(sec);
  };

  const activeChapter = chapters.reduce((acc, c, i) => (currentTime >= c.startSec ? i : acc), -1);

  return (
    <div>
      <video
        ref={videoRef}
        className="aspect-video w-full"
        controls
        playsInline
        src={videoUrl}
        onLoadedMetadata={handleMetadataReady}
        onTimeUpdate={onTimeUpdate}
        onPause={() => savePosition(true)}
      />
      <div className="space-y-3 p-4">
        {resumedFrom !== null && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand)] px-3 py-1 text-xs font-bold text-white">
            Tiếp tục từ {formatClock(resumedFrom)}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {RATES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => applyRate(r)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-bold transition-colors",
                rate === r ? "bg-[var(--brand)] text-white" : "bg-white/10 text-white/70 hover:bg-white/20",
              )}
            >
              {r}x
            </button>
          ))}
        </div>
        {chapters.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {chapters.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => seekTo(c.startSec)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                  i === activeChapter
                    ? "bg-white text-[#3c3c3c]"
                    : "bg-white/10 text-white/70 hover:bg-white/20",
                )}
              >
                {formatClock(c.startSec)} · {c.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
