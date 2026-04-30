import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useRef } from "react";
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
const STUDIO_CHAIN_ID_HEX = "0xF22F";

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
    if (currentChainId.toLowerCase() === "0xf22f") return;
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xF22F" }] });
      return;
    } catch {}
    try {
      await eth.request({ method: "wallet_addEthereumChain", params: [STUDIO_CHAIN_PARAMS] });
      return;
    } catch {}
    const finalChainId = await eth.request({ method: "eth_chainId" });
    if (finalChainId.toLowerCase() === "0xf22f") return;
    throw new Error("Please add GenLayer Studio network manually:\nRPC: https://studio.genlayer.com/api\nChain ID: 61999\nSymbol: GEN");
  } catch (err) { throw err; }
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
      <img src={silverCookieImg} alt="Fortune cookie" width={240} height={240} style={{ position: "relative", zIndex: 1 }} />
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
      <div style={{ position: "relative", width: 380, height: 380, marginBottom: 32 }}>
        <svg viewBox="0 0 380 380" className="oracle-ring-outer" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <circle cx="190" cy="190" r="180" fill="none" stroke="rgba(180,175,165,0.12)" strokeWidth="0.5" />
          <circle cx="190" cy="190" r="165" fill="none" stroke="rgba(180,175,165,0.08)" strokeWidth="0.3" strokeDasharray="4 8" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
            <line key={deg} x1="190" y1="12" x2="190" y2="24" stroke="rgba(180,175,165,0.1)" strokeWidth="0.6" strokeLinecap="round" transform={`rotate(${deg} 190 190)`} />
          ))}
        </svg>
        <svg viewBox="0 0 380 380" className="oracle-ring-inner" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <circle cx="190" cy="190" r="140" fill="none" stroke="rgba(190,185,175,0.08)" strokeWidth="0.4" strokeDasharray="2 6" />
          <circle cx="190" cy="190" r="120" fill="none" stroke="rgba(190,185,175,0.05)" strokeWidth="0.3" />
        </svg>
        <div className="revealing-bloom" />
        <div className="revealing-rays" />
        {PARTICLES.map((p, i) => (
          <span key={i} className="revealing-particle" style={{ '--p-angle': `${p.angle}rad`, '--p-delay': `${p.delay}s`, '--p-duration': `${p.duration}s`, '--p-size': `${p.size}px`, '--p-opacity': p.opacity } as React.CSSProperties} />
        ))}
        <img src={silverCookieImg} alt="Cookie opening" width={210} height={210} style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 2 }} className="revealing-cookie" />
      </div>
      <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 400, letterSpacing: "0.25em", textTransform: "uppercase", color: "#A8A29E", textAlign: "center", lineHeight: 1.6 }}>
        The oracle is consulting the validators…
      </p>
      <div style={{ width: 24, height: 1, background: "rgba(180,175,165,0.25)", margin: "16px auto 12px" }} />
      <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 9, fontWeight: 400, color: "#C5C0B8", letterSpacing: "0.2em", textTransform: "uppercase" }}>
        30–60 seconds
      </p>
    </div>
  );
}

/* ─── Rarity Config ─── */
const RARITY_CONFIG: Record<Rarity, { labelColor: string; textColor: string; cssClass: string }> = {
  LEGENDARY: { labelColor: "#B8960A", textColor: "#3A3226", cssClass: "rarity-legendary" },
  UNIQUE:    { labelColor: "#8A7050", textColor: "#2E2A24", cssClass: "rarity-unique" },
  RARE:      { labelColor: "#9A8A70", textColor: "#3A3530", cssClass: "rarity-rare" },
  NORMAL:    { labelColor: "#B0AAA0", textColor: "#5A5650", cssClass: "rarity-normal" },
};

const LEGENDARY_PARTICLES = Array.from({ length: 24 }).map((_, i) => ({
  angle: (i / 24) * Math.PI * 2 + (Math.random() - 0.5) * 0.3,
  size: 1 + Math.random() * 2, delay: Math.random() * 5, duration: 4 + Math.random() * 4, opacity: 0.2 + Math.random() * 0.4,
}));
const UNIQUE_PARTICLES = Array.from({ length: 14 }).map((_, i) => ({
  angle: (i / 14) * Math.PI * 2, size: 1 + Math.random() * 1.5, delay: Math.random() * 4, duration: 5 + Math.random() * 3, opacity: 0.15 + Math.random() * 0.25,
}));
const RARE_PARTICLES = Array.from({ length: 8 }).map((_, i) => ({
  angle: (i / 8) * Math.PI * 2, size: 1 + Math.random() * 1, delay: Math.random() * 3, duration: 6 + Math.random() * 3, opacity: 0.1 + Math.random() * 0.15,
}));
const NORMAL_PARTICLES = Array.from({ length: 4 }).map((_, i) => ({
  angle: (i / 4) * Math.PI * 2, size: 0.8 + Math.random() * 0.8, delay: Math.random() * 2, duration: 7 + Math.random() * 3, opacity: 0.08 + Math.random() * 0.1,
}));

/* ─── Cinematic Fortune Reveal ─── */
type RevealStep = "freeze" | "flash" | "converge" | "card" | "rarity" | "fortune" | "settled";

function CinematicReveal({ result, onOpenAnother }: { result: FortuneResult; onOpenAnother: () => void }) {
  const [step, setStep] = useState<RevealStep>("freeze");
  const [showButton, setShowButton] = useState(false);
  const cfg = RARITY_CONFIG[result.rarity] ?? RARITY_CONFIG.NORMAL;
  const rarity = result.rarity;
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const timers = timerRefs.current;
    // Step 1: Freeze (300ms)
    timers.push(setTimeout(() => setStep("flash"), 300));
    // Step 2: Oracle flash (150ms)
    timers.push(setTimeout(() => setStep("converge"), 450));
    // Step 3: Energy convergence (700ms)
    timers.push(setTimeout(() => setStep("card"), 1150));
    // Step 4: Card materializes (500ms)
    timers.push(setTimeout(() => setStep("rarity"), 1650));
    // Step 5: Rarity label (300ms)
    timers.push(setTimeout(() => setStep("fortune"), 1950));
    // Step 6: Fortune text (600ms)
    timers.push(setTimeout(() => setStep("settled"), 2550));
    // Step 9: Button (delayed 600ms after settle)
    timers.push(setTimeout(() => setShowButton(true), 3150));

    return () => timers.forEach(clearTimeout);
  }, []);

  const particles = rarity === "LEGENDARY" ? LEGENDARY_PARTICLES
    : rarity === "UNIQUE" ? UNIQUE_PARTICLES
    : rarity === "RARE" ? RARE_PARTICLES
    : NORMAL_PARTICLES;

  const showCard = step === "card" || step === "rarity" || step === "fortune" || step === "settled";
  const showRarity = step === "rarity" || step === "fortune" || step === "settled";
  const showFortune = step === "fortune" || step === "settled";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 440, position: "relative" }}>

      {/* Step 1: Freeze — subtle vignette */}
      <div className={`reveal-vignette ${step !== "freeze" ? "reveal-vignette-fade" : ""}`} />

      {/* Step 2: Oracle flash */}
      {(step === "flash" || step === "converge") && (
        <div className={`oracle-flash ${rarity === "LEGENDARY" ? "oracle-flash-strong" : ""}`} />
      )}

      {/* Step 3: Energy convergence — layered glow */}
      {step !== "freeze" && step !== "flash" && (
        <div className={`energy-convergence ${cfg.cssClass}-energy`}>
          {/* Inner core */}
          <div className="energy-core" />
          {/* Mid bloom */}
          <div className={`energy-mid ${rarity === "LEGENDARY" ? "energy-mid-legendary" : rarity === "UNIQUE" ? "energy-mid-unique" : ""}`} />
          {/* Outer halo */}
          <div className={`energy-outer ${rarity === "LEGENDARY" ? "energy-outer-legendary" : ""}`} />

          {/* Legendary rays */}
          {rarity === "LEGENDARY" && <div className="legendary-reveal-rays" />}

          {/* Particles — density by rarity */}
          {particles.map((p, i) => (
            <span key={i} className="reveal-particle" style={{
              '--p-angle': `${p.angle}rad`, '--p-delay': `${p.delay}s`,
              '--p-duration': `${p.duration}s`, '--p-size': `${p.size}px`,
              '--p-opacity': p.opacity,
            } as React.CSSProperties} />
          ))}
        </div>
      )}

      {/* Step 4–6: Card */}
      <div className={`reveal-card-wrapper ${showCard ? "reveal-card-visible" : "reveal-card-hidden"} ${cfg.cssClass}`}
        style={{ position: "relative", zIndex: 5, width: "100%", maxWidth: 400 }}>

        {/* Glass card */}
        <div className="reveal-glass-card" style={{
          padding: "52px 44px 40px",
          textAlign: "center", width: "100%", minHeight: 280,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>

          {/* Rarity label — step 5 */}
          <p className={`reveal-rarity-label ${showRarity ? "reveal-rarity-visible" : "reveal-rarity-hidden"}`} style={{
            fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 500,
            letterSpacing: "0.35em", textTransform: "uppercase",
            color: cfg.labelColor, marginBottom: 24,
          }}>
            {result.rarity}
          </p>

          {/* Fortune text — step 6 */}
          <p className={`reveal-fortune-text ${showFortune ? "reveal-fortune-visible" : "reveal-fortune-hidden"} ${rarity === "RARE" ? "rare-shimmer-text" : ""}`}
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 28, fontWeight: 300, fontStyle: "italic",
              lineHeight: 1.55, color: cfg.textColor,
            }}>
            &ldquo;{result.message}&rdquo;
          </p>

          {/* Cookie number + explorer */}
          <div className={`reveal-meta ${showFortune ? "reveal-meta-visible" : "reveal-meta-hidden"}`} style={{ marginTop: 32 }}>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 300, color: "#C0BBB3" }}>
              Cookie #{result.cookie_number}
            </p>
            {result.txHash && (
              <a href={`https://explorer-studio.genlayer.com/tx/${result.txHash}`} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-block", marginTop: 6, fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 300, color: "#B5B0A8", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.textDecoration = "underline"; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.textDecoration = "none"; }}>
                View on Explorer ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Step 9: Button — delayed */}
      <div className={`reveal-button-wrapper ${showButton ? "reveal-button-visible" : "reveal-button-hidden"}`}>
        <button onClick={onOpenAnother} className="btn-pill" style={{ marginTop: 24 }}>
          Open Another
        </button>
      </div>
    </div>
  );
}

/* ─── Main App ─── */
const REQUIRED_BALANCE = 100000000000000000n; // 0.1 GEN in wei

async function fetchBalance(address: string): Promise<bigint> {
  const eth = getEthereum();
  if (!eth) return 0n;
  const hex: string = await eth.request({ method: "eth_getBalance", params: [address, "latest"] });
  return BigInt(hex);
}

function InsufficientBalancePrompt({ balance, onRecheck }: { balance: bigint; onRecheck: () => void }) {
  const formattedBalance = (Number(balance) / 1e18).toFixed(4);
  const [checking, setChecking] = useState(false);

  const handleRecheck = async () => {
    setChecking(true);
    await onRecheck();
    setChecking(false);
  };

  const textStyle = (size: number, weight: number, color: string, extra?: React.CSSProperties): React.CSSProperties => ({
    fontFamily: "'Outfit', sans-serif", fontSize: size, fontWeight: weight, color, ...extra,
  });

  return (
    <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: 340, textAlign: "center" }}>
      <p style={textStyle(15, 400, "#3A3530", { marginBottom: 8 })}>You need GEN to open a fortune</p>
      <p style={textStyle(11, 300, "#A8A29E", { marginBottom: 28, lineHeight: 1.6 })}>
        Get free GEN from the GenLayer Studio faucet — instant and free
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32, width: "100%" }}>
        {["Go to studio.genlayer.com", "Connect your wallet", "Click the faucet button next to your address", "Come back and click the button below"].map((step, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={textStyle(10, 500, "#C0BBB3", { minWidth: 16 })}>{i + 1}</span>
            <span style={textStyle(11, 300, "#78716C", { textAlign: "left", lineHeight: 1.5 })}>{step}</span>
          </div>
        ))}
      </div>

      <a href="https://studio.genlayer.com" target="_blank" rel="noopener noreferrer"
        className="btn-pill" style={{ textDecoration: "none", marginBottom: 12, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        Open GenLayer Studio →
      </a>

      <button onClick={handleRecheck} disabled={checking}
        style={{
          ...textStyle(12, 400, "#78716C"),
          background: "transparent", border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 999, padding: "8px 24px", cursor: "pointer",
          transition: "all 0.2s", opacity: checking ? 0.5 : 1,
        }}
        onMouseEnter={(e) => { (e.target as HTMLElement).style.borderColor = "rgba(0,0,0,0.2)"; }}
        onMouseLeave={(e) => { (e.target as HTMLElement).style.borderColor = "rgba(0,0,0,0.08)"; }}>
        {checking ? "Checking…" : "I have GEN now"}
      </button>

      <p style={textStyle(9, 300, "#C5C0B8", { marginTop: 20, letterSpacing: "0.05em" })}>
        Balance: {formattedBalance} GEN
      </p>
    </div>
  );
}

function FortuneCookieApp() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [wallet, setWallet] = useState<string | null>(null);
  const [fortune, setFortune] = useState<FortuneResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [balance, setBalance] = useState<bigint>(0n);
  const hasSufficientBalance = balance >= REQUIRED_BALANCE;

  // Listen for network changes after connecting
  useEffect(() => {
    const eth = getEthereum();
    if (!eth || !wallet) return;
    const handleChainChange = (chainId: string) => {
      if (chainId.toLowerCase() !== "0xf22f") {
        setWrongNetwork(true);
      } else {
        setWrongNetwork(false);
      }
    };
    eth.on("chainChanged", handleChainChange);
    return () => { eth.removeListener("chainChanged", handleChainChange); };
  }, [wallet]);

  const connectWallet = useCallback(async () => {
    setError(null);
    const eth = getEthereum();
    if (!eth) { setError("Please install MetaMask to continue."); return; }
    let accounts: string[];
    try { accounts = await eth.request({ method: "eth_requestAccounts" }); } catch { setError("Wallet connection rejected."); return; }
    const addr = accounts?.[0];
    if (!addr) { setError("No account found."); return; }
    setWallet(addr);

    // Silently switch to GenLayer Studio network
    const chainId = await eth.request({ method: "eth_chainId" });
    if (chainId.toLowerCase() === "0xf22f") {
      const bal = await fetchBalance(addr);
      setBalance(bal);
      setPhase("connected");
      return;
    }
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xF22F" }] });
      const bal2 = await fetchBalance(addr);
      setBalance(bal2);
      setPhase("connected");
      return;
    } catch (err: any) {
      if (err.code === 4902 || err.code === -32603) {
        try {
          await eth.request({ method: "wallet_addEthereumChain", params: [STUDIO_CHAIN_PARAMS] });
          setPhase("connected");
          return;
        } catch { setError("Could not add GenLayer Studio network. Please add it manually."); return; }
      }
      if (err.code === 4001) {
        setError("Please switch to GenLayer Studio network to continue.");
        return;
      }
      setError("Could not switch network automatically. Please switch to GenLayer Studio (Chain ID: 61999) manually.");
    }
  }, []);

  const openCookie = useCallback(async () => {
    setError("");
    setFortune(null);
    setPhase("cracking");
    try {
      const eth = getEthereum();
      if (!eth) { setError("Please install MetaMask to continue."); setPhase(wallet ? "connected" : "idle"); return; }
      const userKeyword = keyword.trim();
      const address = wallet;
      if (!address) { setError("Wallet not connected."); setPhase("idle"); return; }
      await ensureStudioNetwork();
      const client = createClient({ chain: studionet, account: address as `0x${string}` });
      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`, functionName: "open_cookie",
        args: [userKeyword], value: 100000000000000000n,
      });
      setPhase("revealing");
      const receipt: any = await client.waitForTransactionReceipt({ hash: txHash, status: TransactionStatus.FINALIZED, retries: 60 });

      const parseReadable = (raw: string) => {
        const fixed = raw.replace(/(\d)"(?=[a-zA-Z])/g, '$1,"').replace(/"(\s*)"(?=[a-zA-Z])/g, '","').replace(/}(\s*)"(?=[a-zA-Z])/g, '},"');
        return JSON.parse(fixed);
      };
      const leaderReceipt = receipt?.consensus_data?.leader_receipt?.[0];
      const readable = leaderReceipt?.result?.payload?.readable;
      if (readable) {
        try {
          const parsed = parseReadable(readable);
          if (parsed?.rarity && parsed?.message) { setFortune({ rarity: parsed.rarity as Rarity, message: parsed.message, cookie_number: parsed.cookie_number ?? 1, txHash }); setPhase("revealed"); return; }
        } catch {}
      }
      const eqOutput = leaderReceipt?.eq_outputs?.["0"]?.payload?.readable;
      if (eqOutput) {
        try {
          const parsed2 = parseReadable(eqOutput);
          if (parsed2?.rarity && parsed2?.message) { setFortune({ rarity: parsed2.rarity as Rarity, message: parsed2.message, cookie_number: 1, txHash }); setPhase("revealed"); return; }
        } catch {}
      }
      setError("Fortune confirmed onchain but could not display. Check explorer for your result.");
      setPhase("connected");
    } catch (err: any) {
      if (err?.code === 4001) { setError("Transaction rejected."); } else { setError(err?.message || "Something went wrong."); }
      setPhase("connected");
    }
  }, [keyword, wallet]);

  const goBackToConnected = useCallback(() => { setFortune(null); setError(null); setPhase("connected"); }, []);

  return (
    <main style={{
      background: "radial-gradient(ellipse at 50% 45%, rgba(245,244,240,1) 0%, #FAFAF8 60%, #F5F4F0 100%)",
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "64px 24px", position: "relative", overflow: "hidden",
    }}>
      <h1 className="sr-only">Fortune Cookie</h1>

      {(phase === "idle" || phase === "connected") && <div className="oracle-pattern" />}

      {phase !== "revealed" && phase !== "revealing" && (
        <div style={{ marginBottom: 40, position: "relative", zIndex: 1 }}>
          <CookieVisual phase={phase} />
        </div>
      )}

      {phase === "connected" && (
        <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
          placeholder="Focus your intention…" className="animate-fadeIn"
          style={{
            width: 240, textAlign: "center", fontFamily: "'Outfit', sans-serif",
            fontSize: 13, fontWeight: 300, color: "#1A1A1A", background: "transparent",
            border: "none", borderBottom: "1px solid rgba(0,0,0,0.08)",
            padding: "8px 0", marginBottom: 36, outline: "none", letterSpacing: "0.03em", opacity: 0.7,
          }}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 320 }}>
        {phase === "idle" && <button onClick={connectWallet} className="btn-pill animate-fadeIn">Connect Wallet</button>}
        {phase === "connected" && !wrongNetwork && (
          <>
            <button onClick={openCookie} className="btn-pill animate-fadeIn">Open Your Fortune</button>
            <p className="animate-fadeIn" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 300, color: "#C0BBB3", marginTop: 12, letterSpacing: "0.1em" }}>0.1 GEN</p>
          </>
        )}
        {phase === "connected" && wrongNetwork && (
          <p className="animate-fadeIn" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 400, color: "#B8860B", textAlign: "center", lineHeight: 1.6 }}>
            Wrong network — please switch back to GenLayer Studio
          </p>
        )}
        {phase === "cracking" && <p className="animate-fadeIn" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 300, color: "#B0AAA0" }}>Waiting for signature…</p>}
        {phase === "revealing" && <RevealingState />}
      </div>

      {phase === "revealed" && fortune && (
        <CinematicReveal result={fortune} onOpenAnother={goBackToConnected} />
      )}

      {error && (
        <pre style={{ color: "#B8860B", fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 300, whiteSpace: "pre-wrap", margin: "16px 0 0", textAlign: "center" }}>
          {error}
        </pre>
      )}
    </main>
  );
}
