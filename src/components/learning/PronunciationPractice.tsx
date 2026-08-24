"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { CheckCircle2, Mic, RotateCcw, SkipForward, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Minimal structural types for the Web Speech API.
 * SpeechRecognition (STT) is not in lib.dom.d.ts; TTS (speechSynthesis) is.
 */
interface SRAlternative {
  transcript: string;
  confidence?: number;
}

interface SRResult {
  isFinal: boolean;
  length: number;
  0: SRAlternative;
}

type SRResultList = SRResult[];

interface SREventLike {
  resultIndex: number;
  results: SRResultList;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: SREventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export const PRONOUNCIATION_PASS = 70;

/**
 * Score a recognized utterance against the expected hanzi (0–100).
 * Exact hanzi match scores 85–100 (confidence bonus); containment or
 * partial character overlap scores below the pass threshold.
 */
export function scorePronunciation(expected: string, transcript: string, confidence: number): number {
  const clean = (s: string) => s.replace(/[^\u4e00-\u9fff]/g, "");
  const exp = clean(expected);
  const act = clean(transcript);
  if (!exp || !act) return 0;
  if (act === exp) return Math.round(85 + Math.min(confidence, 1) * 15);
  if (act.includes(exp) || exp.includes(act)) return 70;
  const shared = [...exp].filter((ch) => act.includes(ch)).length;
  return shared === 0 ? 0 : Math.round((shared / exp.length) * 65);
}

type Status = "idle" | "listening" | "scored" | "unsupported";

type Props = {
  hanzi: string;
  pinyin: string;
  onPass?: (score: number) => void;
  onSkip?: () => void;
};

export function PronunciationPractice({ hanzi, pinyin, onPass, onSkip }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [score, setScore] = useState<number | null>(null);
  const [lastTranscript, setLastTranscript] = useState("");
  const [micDenied, setMicDenied] = useState(false);
  const [ttsNote, setTtsNote] = useState(false);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const autoSkippedRef = useRef(false);
  const listenTimerRef = useRef<number | null>(null);

  const clearListenTimer = () => {
    if (listenTimerRef.current !== null) {
      window.clearTimeout(listenTimerRef.current);
      listenTimerRef.current = null;
    }
  };

  // TTS voice loading (client-only, post-mount). STT support is resolved on
  // the first "Đọc to" click — browsers without SpeechRecognition surface the
  // skip notice there instead of setState-ing inside an effect.
  useEffect(() => {
    let onVoicesChanged: (() => void) | null = null;
    if ("speechSynthesis" in window) {
      voicesRef.current = window.speechSynthesis.getVoices();
      if (voicesRef.current.length === 0) {
        onVoicesChanged = () => {
          voicesRef.current = window.speechSynthesis.getVoices();
        };
        window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
      }
    }

    return () => {
      if (onVoicesChanged) window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      clearListenTimer();
      recRef.current?.abort?.();
    };
  }, []);

  // Unsupported browsers must never be blocked: skip once automatically.
  useEffect(() => {
    if (status === "unsupported" && !autoSkippedRef.current) {
      autoSkippedRef.current = true;
      onSkip?.();
    }
  }, [status, onSkip]);

  const passed = status === "scored" && score !== null && score >= PRONOUNCIATION_PASS;

  const playSample = () => {
    if (!("speechSynthesis" in window)) {
      setTtsNote(true);
      return;
    }
    try {
      const utter = new SpeechSynthesisUtterance(hanzi);
      utter.lang = "zh-CN";
      utter.rate = 0.85;
      const voices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
      const zh = voices.find((v) => v.lang.toLowerCase().startsWith("zh"));
      if (zh) utter.voice = zh;
      window.speechSynthesis.speak(utter);
    } catch {
      setTtsNote(true);
    }
  };

  const startListening = () => {
    if (status === "listening" || passed || status === "unsupported") return;
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setStatus("unsupported");
      return;
    }
    const rec = new Ctor();
    rec.lang = "zh-CN";
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.continuous = false;

    rec.onresult = (e) => {
      clearListenTimer();
      const r = e.results[e.resultIndex] ?? e.results[0];
      const alt = r?.[0];
      if (!alt) return;
      const s = scorePronunciation(hanzi, alt.transcript, alt.confidence ?? 0);
      setScore(s);
      setLastTranscript(alt.transcript);
      setStatus("scored");
      if (s >= PRONOUNCIATION_PASS) onPass?.(s);
    };
    rec.onerror = (e) => {
      clearListenTimer();
      if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") {
        setMicDenied(true);
      }
      if (e.error === "no-speech") {
        setLastTranscript("—");
        setScore(0);
        setStatus("scored");
      }
    };
    rec.onend = () => {
      clearListenTimer();
      setStatus((st) => (st === "listening" ? "idle" : st));
    };

    // Safety net: never leave the user stuck in "listening" if the browser
    // hangs (no mic / no network) — bail out after 10s so they can retry.
    listenTimerRef.current = window.setTimeout(() => {
      recRef.current?.abort?.();
      setStatus((st) => (st === "listening" ? "idle" : st));
    }, 10000);

    recRef.current = rec;
    setStatus("listening");
    rec.start();
  };

  const retry = () => {
    setStatus("idle");
    setScore(null);
    setLastTranscript("");
  };

  return (
    <div className="rounded-[24px] border-2 border-[var(--line)] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">Luyện phát âm</p>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-[var(--muted)]">{pinyin}</span>
          <span className="hanzi text-lg font-extrabold text-[var(--ink)]">{hanzi}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="secondary" disabled={passed} onClick={playSample} aria-label="Nghe mẫu phát âm">
          <Volume2 className="size-4" /> Nghe mẫu
        </Button>
        <Button
          disabled={status === "listening" || passed || status === "unsupported"}
          onClick={startListening}
          aria-label={status === "listening" ? "Đang nghe giọng nói" : "Đọc to để luyện phát âm"}
        >
          <Mic className="size-4" />
          {status === "listening" ? (
            <span className="flex items-center gap-1.5">
              <span className="size-2 animate-pulse rounded-full bg-white" aria-hidden />
              Đang nghe...
            </span>
          ) : (
            "Đọc to"
          )}
        </Button>
      </div>

      {ttsNote && (
        <p className="mt-2 text-center text-[11px] font-semibold text-[var(--muted)]">
          Trình duyệt chưa có giọng tiếng Trung — bạn vẫn có thể tự đọc để nhận điểm.
        </p>
      )}

      {status === "scored" && (
        <div
          aria-live="polite"
          className={cn(
            "mt-3 rounded-2xl border-2 p-4",
            passed ? "border-[#58a700] bg-[var(--brand-soft)]" : "border-[#ffc800]/40 bg-[#fff7e6]",
          )}
        >
          {passed ? (
            <>
              <CheckCircle2 className="size-5 text-[var(--brand-dark)]" />
              <p className="mt-2 text-sm font-extrabold text-[var(--brand-dark)]">
                Giỏi quá! Phát âm đạt {score}/100
              </p>
            </>
          ) : (
            <>
              <RotateCcw className="size-5 text-[#b45309]" />
              <p className="mt-2 text-sm font-extrabold text-[#3c3c3c]">
                Điểm {score}/100 — nghe mẫu rồi thử lại
              </p>
              {lastTranscript && lastTranscript !== "—" && (
                <p className="mt-1 text-xs font-semibold text-[var(--muted)]">Nghe được: {lastTranscript}</p>
              )}
              <Button variant="secondary" className="mt-3" onClick={retry} aria-label="Thử lại phát âm">
                <RotateCcw className="size-4" /> Thử lại
              </Button>
            </>
          )}
        </div>
      )}

      {(status === "unsupported" || micDenied) && (
        <div aria-live="polite" className="mt-3 rounded-2xl border-2 border-[#ffc800]/40 bg-[#fff7e6] p-4">
          <p className="text-sm font-extrabold text-[#3c3c3c]">
            {micDenied
              ? "Quyền mic bị từ chối. (Microphone permission was denied.)"
              : "Trình duyệt này chưa hỗ trợ nhận diện giọng nói — dùng Chrome để luyện phát âm."}
          </p>
          <Button variant="secondary" className="mt-3" onClick={() => onSkip?.()} aria-label="Bỏ qua thẻ này">
            <SkipForward className="size-4" /> Bỏ qua thẻ này
          </Button>
        </div>
      )}

      <p className="mt-3 text-center text-[11px] font-semibold text-[var(--muted)]">
        Đạt từ {PRONOUNCIATION_PASS}/100 điểm — nghe mẫu trước, rồi đọc to theo.
      </p>
    </div>
  );
}
