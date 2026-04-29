import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import cookieImg from "@/assets/cookie.png";
import cookieOpenImg from "@/assets/cookie-open.png";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Fortune — Open Your Cookie" },
      { name: "description", content: "A premium, minimal fortune cookie experience. Connect your wallet, crack open a cookie, reveal your fortune." },
    ],
  }),
});

type Phase = "idle" | "connected" | "cracking" | "loading" | "revealed";

function Index() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [wallet, setWallet] = useState<string | null>(null);
  const [fortune, setFortune] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = async () => {
    setError(null);
    try {
      const eth = (typeof window !== "undefined" ? (window as any).ethereum : null);
      if (eth?.request) {
        const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
        setWallet(accounts?.[0] ?? "0x123");
      } else {
        setWallet("0x123");
      }
      setPhase("connected");
    } catch {
      setError("Could not connect wallet.");
    }
  };

  const openCookie = async () => {
    setError(null);
    setFortune(null);
    setPhase("cracking");

    // shake then load
    await new Promise((r) => setTimeout(r, 700));
    setPhase("loading");

    try {
      const response = await fetch("https://baseball-modeling-heather-videos.trycloudflare.com/open-cookie", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          wallet: "0x123"
        })
      });

      const data = await response.json();
      console.log("Cookie response:", data);

      // small delay so the loading state feels intentional
      await new Promise((r) => setTimeout(r, 400));
      setFortune(data.fortune);
      setPhase("revealed");
    } catch (err) {
      console.error("Failed to open cookie:", err);
      setError("Request failed. The server may be offline or blocking browser requests (CORS).");
      setPhase("connected");
    }
  };

  const reset = () => {
    setFortune(null);
    setPhase("connected");
  };

  const showOpen = phase === "loading" || phase === "revealed";
  const isCracking = phase === "cracking";

  return (
    <main className="min-h-screen w-full bg-white flex flex-col items-center justify-center px-6 py-16 overflow-hidden">
      <h1 className="sr-only">Fortune Cookie</h1>

      {/* Cookie */}
      <div className="relative h-[340px] w-[340px] sm:h-[420px] sm:w-[420px] flex items-center justify-center">
        {/* soft pedestal shadow */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 h-6 w-56 rounded-full"
          style={{
            background: "radial-gradient(ellipse at center, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0) 70%)",
            filter: "blur(2px)",
          }}
        />

        {/* closed cookie */}
        <img
          src={cookieImg}
          alt="Fortune cookie"
          width={1024}
          height={1024}
          className={[
            "absolute inset-0 m-auto h-full w-full object-contain cookie-shadow select-none pointer-events-none transition-opacity",
            showOpen ? "opacity-0" : "opacity-100",
            isCracking ? "shake-crack" : "float-anim",
          ].join(" ")}
          draggable={false}
        />

        {/* open cookie */}
        <img
          src={cookieOpenImg}
          alt=""
          aria-hidden
          width={1024}
          height={1024}
          loading="lazy"
          className={[
            "absolute inset-0 m-auto h-full w-full object-contain cookie-shadow select-none pointer-events-none",
            showOpen ? "crack-in" : "opacity-0",
            phase === "revealed" ? "float-anim" : "",
          ].join(" ")}
          draggable={false}
        />
      </div>

      {/* Action button */}
      <div className="mt-4 h-14 flex items-center justify-center">
        {phase === "idle" && (
          <button onClick={connectWallet} className="btn-premium reveal-up">
            Connect Wallet
          </button>
        )}

        {(phase === "connected") && (
          <button onClick={openCookie} className="btn-premium reveal-up">
            {fortune ? "Open Another" : "Open Cookie"}
          </button>
        )}

        {phase === "cracking" && (
          <button disabled className="btn-premium">Cracking…</button>
        )}

        {phase === "loading" && (
          <div className="flex items-center gap-2 pulse-soft" aria-live="polite">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-900" />
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-900" style={{ animationDelay: "0.2s" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-900" style={{ animationDelay: "0.4s" }} />
            <span className="ml-2 text-sm tracking-tight text-neutral-500">Reading your fortune</span>
          </div>
        )}

        {phase === "revealed" && (
          <button onClick={reset} className="btn-premium reveal-up">
            Open Another
          </button>
        )}
      </div>

      {/* Wallet hint */}
      {wallet && phase !== "idle" && (
        <p className="mt-3 text-[11px] tracking-wide text-neutral-400 font-mono">
          {wallet.length > 12 ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : wallet}
        </p>
      )}

      {/* Fortune card */}
      {phase === "revealed" && fortune && (
        <div className="mt-10 reveal-up w-full max-w-md">
          <div
            className="rounded-2xl bg-white px-8 py-7 text-center"
            style={{
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
            }}
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400 mb-3">
              Your Fortune
            </p>
            <p className="text-lg sm:text-xl leading-relaxed text-neutral-900 tracking-tight">
              “{fortune}”
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-6 text-xs text-neutral-500 reveal-up">{error}</p>
      )}
    </main>
  );
}
