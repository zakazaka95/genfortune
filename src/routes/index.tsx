import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import silverCookieImg from "../assets/silver-cookie.png";

// @ts-ignore — patch BigInt serialization for genlayer-js internals
BigInt.prototype.toJSON = function () { return this.toString(); };

export const Route = createFileRoute("/")({
  component: FortuneCookieApp,
  head: () => ({
    meta: [
      { title: "Fortune Cookie — Onchain AI Fortune" },
      {
        name: "description",
        content: "Crack open an AI-powered fortune cookie on GenLayer. Real wallet, real network, real transaction.",
      },
    ],
  }),
});

type Phase = "idle" | "connected" | "cracking" | "revealing" | "revealed";
type Rarity = "LEGENDARY" | "RARE" | "UNIQUE" | "NORMAL";

interface FortuneResult {
  rarity: Rarity;
  message: string;
  cookie_number: number;
  txHash?: string;
}

const CONTRACT_ADDRESS = "0x53244292f3EC3aBEbd61a847B3aB2c16C06346B9";
const STUDIO_CHAIN_ID_HEX = "0xF22F"; // 61999

const STUDIO_CHAIN_PARAMS = {
  chainId: STUDIO_CHAIN_ID_HEX,
  chainName: "GenLayer Studio",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: ["https://studio.genlayer.com/api"],
  blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
};

async function ensureStudioNetwork() {
  const eth = getEthereum();
  if (!eth) throw new Error("No wallet found");

  try {
    const currentChainId = await eth.request({ method: "eth_chainId" });
    console.log("Current chain ID:", currentChainId);

    if (currentChainId.toLowerCase() === "0xf22f") return;

    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xF22F" }],
      });
      return;
    } catch (switchErr: any) {
      console.log("Switch error code:", switchErr.code, switchErr.message);
    }

    try {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [STUDIO_CHAIN_PARAMS],
      });
      return;
    } catch (addErr: any) {
      console.log("Add error:", addErr.code, addErr.message);
    }

    const finalChainId = await eth.request({ method: "eth_chainId" });
    if (finalChainId.toLowerCase() === "0xf22f") return;

    throw new Error(
      "Please add GenLayer Studio network manually:\nRPC: https://studio.genlayer.com/api\nChain ID: 61999\nSymbol: GEN",
    );
  } catch (err) {
    throw err;
  }
}

function getEthereum(): any {
  if (typeof window === "undefined") return null;
  return (window as any).ethereum ?? null;
}

/* ─── Cookie Visual ─── */
function CookieVisual({ phase }: { phase: Phase }) {
  if (phase === "revealing") return null;
  const isConnected = phase === "connected";

  return (
    <div className={phase === "cracking" ? "cookie-cracking" : "cookie-breathe"}>
      <div className="cookie-specular" />
      <div className={`cookie-inner-glow ${isConnected ? "cookie-inner-glow-active" : ""}`} />
      <img
        src={silverCookieImg}
        alt="Fortune cookie"
        width={240}
        height={240}
        style={{ position: "relative", zIndex: 1 }}
      />
      <div className="cookie-shadow" />
    </div>
  );
}

/* ─── Immersive Revealing State ─── */
const PARTICLES = Array.from({ length: 30 }).map((_, i) => ({
  angle: (i / 30) * Math.PI * 2,
  speed: 0.3 + Math.random() * 0.5,
  size: 1.2 + Math.random() * 1.8,
  delay: Math.random() * 6,
  duration: 5 + Math.random() * 4,
  opacity: 0.15 + Math.random() * 0.35,
}));

function RevealingState() {
  return (
    <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Cookie + bloom container */}
      <div style={{ position: "relative", width: 380, height: 380, marginBottom: 32 }}>

        {/* Outer oracle ring — very slow rotation */}
        <svg viewBox="0 0 380 380" className="oracle-ring-outer" style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
        }}>
          <circle cx="190" cy="190" r="180" fill="none" stroke="rgba(180,175,165,0.12)" strokeWidth="0.5" />
          <circle cx="190" cy="190" r="165" fill="none" stroke="rgba(180,175,165,0.08)" strokeWidth="0.3" strokeDasharray="4 8" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
            <line key={deg} x1="190" y1="12" x2="190" y2="24" stroke="rgba(180,175,165,0.1)" strokeWidth="0.6" strokeLinecap="round"
              transform={`rotate(${deg} 190 190)`} />
          ))}
        </svg>

        {/* Inner oracle ring — counter rotation */}
        <svg viewBox="0 0 380 380" className="oracle-ring-inner" style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
        }}>
          <circle cx="190" cy="190" r="140" fill="none" stroke="rgba(190,185,175,0.08)" strokeWidth="0.4" strokeDasharray="2 6" />
          <circle cx="190" cy="190" r="120" fill="none" stroke="rgba(190,185,175,0.05)" strokeWidth="0.3" />
        </svg>

        {/* Bloom — strong warm glow from center */}
        <div className="revealing-bloom" />

        {/* Soft light rays expanding outward */}
        <div className="revealing-rays" />

        {/* Drifting particles */}
        {PARTICLES.map((p, i) => (
          <span key={i} className="revealing-particle" style={{
            '--p-angle': `${p.angle}rad`,
            '--p-delay': `${p.delay}s`,
            '--p-duration': `${p.duration}s`,
            '--p-size': `${p.size}px`,
            '--p-opacity': p.opacity,
          } as React.CSSProperties} />
        ))}

        {/* The cookie */}
        <img
          src={silverCookieImg}
          alt="Cookie opening"
          width={210}
          height={210}
          style={{
            position: "absolute",
            left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 2,
          }}
          className="revealing-cookie"
        />
      </div>

      {/* Oracle text */}
      <p style={{
        fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 400,
        letterSpacing: "0.25em", textTransform: "uppercase" as const,
        color: "#A8A29E", textAlign: "center",
        lineHeight: 1.6,
      }}>
        The oracle is consulting the validators…
      </p>

      {/* Decorative line */}
      <div style={{ width: 24, height: 1, background: "rgba(180,175,165,0.25)", margin: "16px auto 12px" }} />

      <p style={{
        fontFamily: "'Outfit', sans-serif", fontSize: 9, fontWeight: 400,
        color: "#C5C0B8", letterSpacing: "0.2em", textTransform: "uppercase" as const,
      }}>
        30–60 seconds
      </p>
    </div>
  );
}

/* ─── Fortune Result — Premium Oracle Output ─── */
const RARITY_CONFIG: Record<Rarity, {
  labelColor: string; textColor: string; cssClass: string;
}> = {
  LEGENDARY: { labelColor: "#B8960A", textColor: "#3A3226", cssClass: "rarity-legendary" },
  UNIQUE:    { labelColor: "#8A7050", textColor: "#2E2A24", cssClass: "rarity-unique" },
  RARE:      { labelColor: "#9A8A70", textColor: "#3A3530", cssClass: "rarity-rare" },
  NORMAL:    { labelColor: "#B0AAA0", textColor: "#5A5650", cssClass: "rarity-normal" },
};

const LEGENDARY_PARTICLES = Array.from({ length: 24 }).map((_, i) => ({
  angle: (i / 24) * Math.PI * 2 + (Math.random() - 0.5) * 0.3,
  size: 1 + Math.random() * 2,
  delay: Math.random() * 5,
  duration: 4 + Math.random() * 4,
  opacity: 0.2 + Math.random() * 0.4,
}));

const UNIQUE_PARTICLES = Array.from({ length: 14 }).map((_, i) => ({
  angle: (i / 14) * Math.PI * 2,
  size: 1 + Math.random() * 1.5,
  delay: Math.random() * 4,
  duration: 5 + Math.random() * 3,
  opacity: 0.15 + Math.random() * 0.25,
}));

function FortuneCard({
  result,
  onOpenAnother,
}: {
  result: FortuneResult;
  onOpenAnother: () => void;
}) {
  const cfg = RARITY_CONFIG[result.rarity] ?? RARITY_CONFIG.NORMAL;
  const rarity = result.rarity;

  return (
    <div className={`fortune-reveal ${cfg.cssClass}`} style={{
      position: "relative",
      display: "flex", flexDirection: "column", alignItems: "center",
      width: "100%", maxWidth: 400,
      minHeight: 360,
    }}>

      {/* LEGENDARY: flash + rays + breathing glow */}
      {rarity === "LEGENDARY" && (
        <>
          <div className="legendary-flash" />
          <div className="legendary-glow-core" />
          <div className="legendary-glow-outer" />
          <div className="legendary-rays" />
          {LEGENDARY_PARTICLES.map((p, i) => (
            <span key={i} className="legendary-particle" style={{
              '--p-angle': `${p.angle}rad`,
              '--p-delay': `${p.delay}s`,
              '--p-duration': `${p.duration}s`,
              '--p-size': `${p.size}px`,
              '--p-opacity': p.opacity,
            } as React.CSSProperties} />
          ))}
        </>
      )}

      {/* UNIQUE: bloom + particles */}
      {rarity === "UNIQUE" && (
        <>
          <div className="unique-bloom" />
          {UNIQUE_PARTICLES.map((p, i) => (
            <span key={i} className="unique-particle" style={{
              '--p-angle': `${p.angle}rad`,
              '--p-delay': `${p.delay}s`,
              '--p-duration': `${p.duration}s`,
              '--p-size': `${p.size}px`,
              '--p-opacity': p.opacity,
            } as React.CSSProperties} />
          ))}
        </>
      )}

      {/* RARE: warm halo + shimmer */}
      {rarity === "RARE" && (
        <div className="rare-halo" />
      )}

      {/* Glass card surface */}
      <div style={{
        position: "relative", zIndex: 2,
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        border: "1px solid rgba(255,255,255,0.6)",
        borderRadius: 24,
        padding: "52px 44px 40px",
        textAlign: "center",
        width: "100%",
        minHeight: 280,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)",
      }}>

        {/* Rarity label */}
        <p style={{
          fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.35em", textTransform: "uppercase" as const,
          color: cfg.labelColor, marginBottom: 24,
        }}>
          {result.rarity}
        </p>

        {/* Fortune text */}
        <p className={`fortune-text ${rarity === "RARE" ? "rare-shimmer-text" : ""}`} style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 28, fontWeight: 300, fontStyle: "italic",
          lineHeight: 1.55, color: cfg.textColor,
        }}>
          &ldquo;{result.message}&rdquo;
        </p>

        {/* Cookie number + explorer link */}
        <div style={{ marginTop: 32 }}>
          <p style={{
            fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 300,
            color: "#C0BBB3",
          }}>
            Cookie #{result.cookie_number}
          </p>
          {result.txHash && (
            <a
              href={`https://explorer-studio.genlayer.com/tx/${result.txHash}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: "inline-block", marginTop: 6,
                fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 300,
                color: "#B5B0A8", textDecoration: "none", transition: "color 0.2s",
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.textDecoration = "underline"; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.textDecoration = "none"; }}
            >
              View on Explorer ↗
            </a>
          )}
        </div>
      </div>

      <button
        onClick={onOpenAnother}
        className="btn-outline"
        style={{ marginTop: 24, position: "relative", zIndex: 2 }}
      >
        Open Another
      </button>
    </div>
  );
}

/* ─── Main App (all logic unchanged) ─── */
function FortuneCookieApp() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [wallet, setWallet] = useState<string | null>(null);
  const [fortune, setFortune] = useState<FortuneResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");

  const connectWallet = useCallback(async () => {
    setError(null);
    const eth = getEthereum();
    if (!eth) {
      setError("Please install MetaMask to continue.");
      return;
    }

    let accounts: string[];
    try {
      accounts = await eth.request({ method: "eth_requestAccounts" });
    } catch {
      setError("Wallet connection rejected.");
      return;
    }
    const addr = accounts?.[0];
    if (!addr) {
      setError("No account found.");
      return;
    }
    setWallet(addr);

    try {
      await ensureStudioNetwork();
    } catch {
      setError("Could not switch to GenLayer Studio network. Please switch manually.");
      return;
    }

    setPhase("connected");
  }, []);

  const openCookie = useCallback(async () => {
    setError("");
    setFortune(null);
    setPhase("cracking");

    try {
      const eth = getEthereum();
      if (!eth) {
        setError("Please install MetaMask to continue.");
        setPhase(wallet ? "connected" : "idle");
        return;
      }

      const userKeyword = keyword.trim();
      const address = wallet;

      if (!address) {
        setError("Wallet not connected.");
        setPhase("idle");
        return;
      }

      await ensureStudioNetwork();

      const client = createClient({
        chain: studionet,
        account: address as `0x${string}`,
      });

      console.log("genlayer-js version: 1.1.7");
      console.log("Chain:", JSON.stringify(studionet.name));
      console.log("Calling writeContract with keyword:", userKeyword);

      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "open_cookie",
        args: [userKeyword],
        value: 100000000000000000n,
      });

      console.log("GenLayer tx hash:", txHash);
      setPhase("revealing");

      const receipt: any = await client.waitForTransactionReceipt({
        hash: txHash,
        status: TransactionStatus.FINALIZED,
        retries: 60,
      });

      console.log("Full receipt:", JSON.stringify(receipt, null, 2));

      const parseReadable = (raw: string) => {
        const fixed = raw
          .replace(/(\d)"(?=[a-zA-Z])/g, '$1,"')
          .replace(/"(\s*)"(?=[a-zA-Z])/g, '","')
          .replace(/}(\s*)"(?=[a-zA-Z])/g, '},"');
        console.log("Fixed:", fixed);
        return JSON.parse(fixed);
      };

      const leaderReceipt = receipt?.consensus_data?.leader_receipt?.[0];
      const readable = leaderReceipt?.result?.payload?.readable;

      if (readable) {
        try {
          const parsed = parseReadable(readable);
          if (parsed?.rarity && parsed?.message) {
            setFortune({
              rarity: parsed.rarity as Rarity,
              message: parsed.message,
              cookie_number: parsed.cookie_number ?? 1,
              txHash,
            });
            setPhase("revealed");
            return;
          }
        } catch (e) {
          console.error("Parse failed even after fix:", e);
          console.log("Raw readable was:", readable);
        }
      }

      const eqOutput = leaderReceipt?.eq_outputs?.["0"]?.payload?.readable;
      if (eqOutput) {
        try {
          const parsed2 = parseReadable(eqOutput);
          if (parsed2?.rarity && parsed2?.message) {
            setFortune({
              rarity: parsed2.rarity as Rarity,
              message: parsed2.message,
              cookie_number: 1,
              txHash,
            });
            setPhase("revealed");
            return;
          }
        } catch (e) {
          console.error("eq_outputs parse failed:", e);
          console.log("Raw eq_output was:", eqOutput);
        }
      }

      setError("Fortune confirmed onchain but could not display. Check explorer for your result.");
      setPhase("connected");
    } catch (err: any) {
      console.error("Full error:", err);
      if (err?.code === 4001) {
        setError("Transaction rejected.");
      } else {
        setError(err?.message || "Something went wrong.");
      }
      setPhase("connected");
    }
  }, [keyword, wallet]);

  const goBackToConnected = useCallback(() => {
    setFortune(null);
    setError(null);
    setPhase("connected");
  }, []);

  const truncatedWallet = wallet
    ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}`
    : "";

  return (
    <main style={{
      background: "radial-gradient(ellipse at 50% 45%, rgba(245,244,240,1) 0%, #FAFAF8 60%, #F5F4F0 100%)",
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px",
      position: "relative", overflow: "hidden",
    }}>
      <h1 className="sr-only">Fortune Cookie</h1>

      {/* Faint oracle circle pattern */}
      {(phase === "idle" || phase === "connected") && (
        <div className="oracle-pattern" />
      )}

      {/* Cookie visual — hidden during revealing (RevealingState has its own) */}
      {phase !== "revealed" && phase !== "revealing" && (
        <div style={{ marginBottom: 40, position: "relative", zIndex: 1 }}>
          <CookieVisual phase={phase} />
        </div>
      )}

      {/* Keyword input */}
      {phase === "connected" && (
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="focus your intention… (optional)"
          style={{
            width: 280, textAlign: "center",
            fontFamily: "'Outfit', sans-serif",
            fontSize: 14, fontWeight: 300,
            color: "#1A1A1A", background: "transparent",
            border: "none",
            borderBottom: "1px solid rgba(0,0,0,0.12)",
            padding: "8px 0", marginBottom: 32, outline: "none",
          }}
        />
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 320 }}>
        {phase === "idle" && (
          <button onClick={connectWallet} className="btn-pill animate-fadeIn">
            Connect Wallet
          </button>
        )}

        {phase === "connected" && (
          <button onClick={openCookie} className="btn-primary animate-fadeIn">
            Open Your Fortune · 0.1 GEN
          </button>
        )}

        {phase === "cracking" && (
          <p className="animate-fadeIn" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 300, color: "#9A9A9A" }}>
            Waiting for signature…
          </p>
        )}

        {phase === "revealing" && <RevealingState />}
      </div>

      {/* Fortune result */}
      {phase === "revealed" && fortune && (
        <FortuneCard result={fortune} onOpenAnother={goBackToConnected} />
      )}

      {/* Error */}
      {error && (
        <pre style={{
          color: "#B8860B",
          fontFamily: "'Outfit', sans-serif",
          fontSize: 13, fontWeight: 300,
          whiteSpace: "pre-wrap",
          margin: "16px 0 0", textAlign: "center",
        }}>
          {error}
        </pre>
      )}
    </main>
  );
}
