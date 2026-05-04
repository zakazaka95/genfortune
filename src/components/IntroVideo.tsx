import { useEffect, useRef, useState } from "react";

const FALLBACK_MS = 6000;
const FLASH_MS = 200;
const FADE_MS = 800;

export function IntroVideo({ onComplete }: { onComplete: () => void }) {
  const [mounted, setMounted] = useState(true);
  const [flash, setFlash] = useState(false);
  const [fading, setFading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.play().catch(() => finish());
    const fallback = setTimeout(finish, FALLBACK_MS);
    return () => clearTimeout(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    // 1) flash bloom
    setFlash(true);
    // 2) start fade + reveal homepage at same moment
    setTimeout(() => {
      setFading(true);
      onComplete();
    }, FLASH_MS);
    // 3) unmount after fade
    setTimeout(() => setMounted(false), FLASH_MS + FADE_MS + 50);
  };

  if (!mounted) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#ffffff",
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
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
          // Subtle bloom on bright parts: gentle brightness + soft drop-shadow halo
          filter: "brightness(1.02) contrast(0.98) drop-shadow(0 0 24px rgba(255,255,255,0.25))",
        }}
      />
      {/* Soft white bloom flash at end */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 40%, rgba(255,255,255,0) 80%)",
          opacity: flash ? 1 : 0,
          transition: `opacity ${FLASH_MS}ms ease-out`,
          pointerEvents: "none",
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}
