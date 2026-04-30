import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import fortuneCookieImg from "../assets/fortune-cookie.png";
import fortuneCookieOpenImg from "../assets/fortune-cookie-open.png";

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

  return (
    <div className={phase === "cracking" ? "cookie-cracking" : "cookie-idle"}>
      <img
        src={fortuneCookieImg}
        alt="Fortune cookie"
        width={240}
        height={240}
        style={{ filter: "drop-shadow(0 12px 32px rgba(0,0,0,0.12))" }}
      />
    </div>
  );
}

/* ─── Immersive Revealing State ─── */
const ORACLE_PHRASES = [
  "The oracle is consulting the validators…",
  "AI minds are reaching consensus…",
  "Your fortune is taking shape…",
  "The chain is finalizing your destiny…",
];

function RevealingState() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [fadeClass, setFadeClass] = useState("opacity-100");

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeClass("opacity-0");
      setTimeout(() => {
        setPhraseIdx(i => (i + 1) % ORACLE_PHRASES.length);
        setFadeClass("opacity-100");
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Subtle vignette */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.06) 100%)",
      }} />

      {/* Cracked cookie with glow + particles */}
      <div style={{ position: "relative", marginBottom: 32 }}>
        <img
          src={fortuneCookieOpenImg}
          alt="Cookie cracking open"
          width={280}
          height={280}
          style={{
            filter: "drop-shadow(0 0 40px rgba(212,146,42,0.35))",
            animation: "cookie-glow 3s ease-in-out infinite",
          }}
        />
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${35 + Math.random() * 30}%`,
              bottom: "40%",
              width: 3 + Math.random() * 3,
              height: 3 + Math.random() * 3,
              borderRadius: "50%",
              background: `rgba(212, 146, 42, ${0.4 + Math.random() * 0.4})`,
              animation: `particle-rise ${2 + Math.random() * 2}s ease-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Mandala spinner */}
      <div style={{ marginBottom: 24 }}>
        <svg width="48" height="48" viewBox="0 0 48 48" style={{ animation: "spin-slow 8s linear infinite" }}>
          <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(212,146,42,0.2)" strokeWidth="1" />
          <circle cx="24" cy="24" r="14" fill="none" stroke="rgba(212,146,42,0.15)" strokeWidth="0.5" strokeDasharray="4 4" />
          {[0, 60, 120, 180, 240, 300].map(deg => (
            <line key={deg} x1="24" y1="4" x2="24" y2="10" stroke="rgba(212,146,42,0.3)" strokeWidth="1" strokeLinecap="round"
              transform={`rotate(${deg} 24 24)`} />
          ))}
          <circle cx="24" cy="24" r="2" fill="rgba(212,146,42,0.4)" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
        </svg>
      </div>

      {/* Cycling text */}
      <p className={`transition-opacity duration-400 ${fadeClass}`} style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: 18, fontWeight: 300, fontStyle: "italic",
        color: "#9A9A9A", textAlign: "center",
      }}>
        {ORACLE_PHRASES[phraseIdx]}
      </p>
      <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 300, color: "#C0C0C0", marginTop: 12 }}>
        30–60 seconds
      </p>
    </div>
  );
}

/* ─── Dramatic Rarity Cards ─── */
const RARITY_STYLES: Record<Rarity, {
  bg: string; border: string; color: string;
  textColor: string; cardClass: string; labelGlow: string;
}> = {
  LEGENDARY: {
    bg: "linear-gradient(160deg, #1A1508 0%, #2A1F0A 40%, #1A1508 100%)",
    border: "#C8922A",
    color: "#FFD700",
    textColor: "#F5E6C8",
    cardClass: "card-legendary",
    labelGlow: "0 0 20px rgba(255,215,0,0.6), 0 0 40px rgba(255,215,0,0.3)",
  },
  UNIQUE: {
    bg: "linear-gradient(160deg, #0E0A18 0%, #1A1230 40%, #0E0A18 100%)",
    border: "#7B5EA7",
    color: "#B89FE0",
    textColor: "#E8DDF5",
    cardClass: "card-unique",
    labelGlow: "0 0 15px rgba(155,127,204,0.5), 0 0 30px rgba(155,127,204,0.2)",
  },
  RARE: {
    bg: "linear-gradient(160deg, #080E1A 0%, #0C1830 40%, #080E1A 100%)",
    border: "#4A6FA5",
    color: "#7BADE0",
    textColor: "#D0DFEF",
    cardClass: "card-rare",
    labelGlow: "0 0 12px rgba(74,111,165,0.4), 0 0 25px rgba(74,111,165,0.2)",
  },
  NORMAL: {
    bg: "#FFFFFF",
    border: "rgba(0,0,0,0.08)",
    color: "#555555",
    textColor: "#1A1A1A",
    cardClass: "",
    labelGlow: "none",
  },
};

function FortuneCard({
  result,
  onOpenAnother,
}: {
  result: FortuneResult;
  onOpenAnother: () => void;
}) {
  const s = RARITY_STYLES[result.rarity] ?? RARITY_STYLES.NORMAL;
  const isDark = result.rarity !== "NORMAL";

  return (
    <div className="animate-fadeIn w-full max-w-sm flex flex-col items-center" style={{ position: "relative", minHeight: 420 }}>
      {/* Full-screen dark overlay for epic tiers */}
      {isDark && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          background: result.rarity === "LEGENDARY"
            ? "radial-gradient(ellipse at center, #1A1508ee 0%, #0A0A04 100%)"
            : result.rarity === "UNIQUE"
            ? "radial-gradient(ellipse at center, #140E1Eee 0%, #08060E 100%)"
            : "radial-gradient(ellipse at center, #0C1220ee 0%, #060A12 100%)",
          animation: "fadeIn 0.6s ease both",
        }} />
      )}

      <div
        className={s.cardClass}
        style={{
          position: "relative", zIndex: 1, overflow: "hidden",
          background: s.bg,
          border: `1px solid ${s.border}`,
          borderRadius: 20,
          padding: "48px 40px",
          textAlign: "center",
          width: "100%",
          minHeight: 320,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Floating gold particles for LEGENDARY */}
        {result.rarity === "LEGENDARY" && Array.from({ length: 20 }).map((_, i) => (
          <span key={i} style={{
            position: "absolute",
            left: `${5 + Math.random() * 90}%`,
            bottom: `${-5 + Math.random() * 20}%`,
            width: 2 + Math.random() * 3,
            height: 2 + Math.random() * 3,
            borderRadius: "50%",
            background: `rgba(255, 215, 0, ${0.3 + Math.random() * 0.5})`,
            animation: `particle-float ${3 + Math.random() * 4}s ease-out infinite`,
            animationDelay: `${Math.random() * 4}s`,
          }} />
        ))}

        {/* Star field for UNIQUE */}
        {result.rarity === "UNIQUE" && Array.from({ length: 25 }).map((_, i) => (
          <span key={i} style={{
            position: "absolute",
            left: `${5 + Math.random() * 90}%`,
            top: `${5 + Math.random() * 90}%`,
            width: 1.5 + Math.random() * 2,
            height: 1.5 + Math.random() * 2,
            borderRadius: "50%",
            background: `rgba(155,127,204,${0.2 + Math.random() * 0.6})`,
            animation: `twinkle ${1.5 + Math.random() * 3}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
          }} />
        ))}

        <div style={{ width: 40, height: 1, background: s.color, opacity: 0.5, margin: "0 auto 14px" }} />

        <p style={{
          fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 600,
          letterSpacing: "0.3em", textTransform: "uppercase" as const,
          color: s.color, marginBottom: 14,
          textShadow: isDark ? s.labelGlow : "none",
        }}>
          {result.rarity}
        </p>

        <div style={{ width: 40, height: 1, background: s.color, opacity: 0.5, margin: "0 auto 28px" }} />

        <p className="fortune-text" style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 28, fontWeight: 300, fontStyle: "italic",
          lineHeight: 1.5, color: s.textColor,
        }}>
          &ldquo;{result.message}&rdquo;
        </p>

        <p style={{
          fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 300,
          color: isDark ? "rgba(255,255,255,0.3)" : "#C0C0C0", marginTop: 28,
        }}>
          Cookie #{result.cookie_number}
        </p>

        {result.txHash && (
          <a
            href={`https://explorer-studio.genlayer.com/tx/${result.txHash}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              display: "inline-block", marginTop: 8,
              fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 300,
              color: isDark ? "rgba(255,255,255,0.35)" : "#9A9A9A",
              textDecoration: "none", transition: "color 0.2s",
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.textDecoration = "underline"; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.textDecoration = "none"; }}
          >
            View on Explorer ↗
          </a>
        )}
      </div>

      <button
        onClick={onOpenAnother}
        className={isDark ? "btn-outline-dark" : "btn-outline"}
        style={{ marginTop: 24, position: "relative", zIndex: 1 }}
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
    <main style={{ background: "#FAFAF8", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px" }}>
      <h1 className="sr-only">Fortune Cookie</h1>

      {/* Cookie visual — hidden during revealing (RevealingState has its own) */}
      {phase !== "revealed" && phase !== "revealing" && (
        <div style={{ marginBottom: 32 }}>
          <CookieVisual phase={phase} />
        </div>
      )}

      {/* Wallet address */}
      {wallet && phase !== "idle" && phase !== "revealed" && phase !== "revealing" && (
        <p style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 12, fontWeight: 300,
          color: "#9A9A9A", marginBottom: 16,
          letterSpacing: "0.04em",
        }}>
          {truncatedWallet}
        </p>
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
