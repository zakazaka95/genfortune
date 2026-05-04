import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "genfortune_intro_played";
const FALLBACK_MS = 6000;
const FADE_MS = 600;

export function IntroVideo({ onComplete }: { onComplete: () => void }) {
  const [show, setShow] = useState(false);
  const [fading, setFading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const finishedRef = useRef(false);

  // Decide on mount whether to show
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1" || localStorage.getItem(STORAGE_KEY) === "1") {
        onComplete();
        return;
      }
    } catch {}
    setShow(true);
  }, [onComplete]);

  useEffect(() => {
    if (!show) return;
    const v = videoRef.current;
    if (v) {
      v.play().catch(() => finish());
    }
    const fallback = setTimeout(finish, FALLBACK_MS);
    return () => clearTimeout(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setFading(true);
    onComplete();
    setTimeout(() => setShow(false), FADE_MS + 50);
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#ffffff",
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: fading ? "none" : "auto",
        overflow: "hidden",
      }}
    >
      <video
        ref={videoRef}
        src="/intro.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
        style={{
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          display: "block",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#ffffff",
          opacity: fading ? 0.4 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
