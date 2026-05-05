import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import silverCookieImg from "../assets/silver-cookie.png";
import { MintFortuneButton, type MintStatus } from "../components/MintFortuneButton";
import { IntroVideo } from "../components/IntroVideo";

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
  message: string;
  cookie_number: number;
  txHash?: string;
}

const CONTRACT_ADDRESS = "0xd8EEDa202b3C1EB92C097AEF26818a8eAd037AEF";
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

/* ─── Cinematic Fortune Reveal — Full-screen World ─── */
type RevealStep = "enter" | "atmosphere" | "rarity" | "fortune" | "meta" | "settled";

const RARITY_WORLDS: Record<Rarity, {
  worldClass: string;
  rarityColor: string;
  textColor: string;
  metaColor: string;
  rarityLetterSpacing: string;
  particleCount: number;
  starCount: number;
  rayCount: number;
}> = {
  LEGENDARY: { worldClass: "world-legendary", rarityColor: "#E8B948", textColor: "#FFF6DC", metaColor: "rgba(232,185,72,0.55)", rarityLetterSpacing: "0.55em", particleCount: 60, starCount: 0, rayCount: 16 },
  UNIQUE:    { worldClass: "world-unique",    rarityColor: "#C8A8FF", textColor: "#F0E8FF", metaColor: "rgba(200,168,255,0.55)", rarityLetterSpacing: "0.5em",  particleCount: 36, starCount: 80, rayCount: 0 },
  RARE:      { worldClass: "world-rare",      rarityColor: "#7FC8FF", textColor: "#EAF6FF", metaColor: "rgba(127,200,255,0.55)", rarityLetterSpacing: "0.45em", particleCount: 22, starCount: 0,  rayCount: 0 },
  NORMAL:    { worldClass: "world-normal",    rarityColor: "#9A9590", textColor: "#2A2724", metaColor: "rgba(120,113,108,0.7)",  rarityLetterSpacing: "0.4em",  particleCount: 14, starCount: 0,  rayCount: 0 },
};

function makeParticles(count: number, seedOffset = 0) {
  return Array.from({ length: count }).map((_, i) => {
    const r = (n: number) => {
      const x = Math.sin((i + seedOffset + 1) * (n + 1) * 9301) * 10000;
      return x - Math.floor(x);
    };
    return {
      left: r(1) * 100,
      top: r(2) * 100,
      size: 1 + r(3) * 2.5,
      delay: r(4) * 6,
      duration: 6 + r(5) * 8,
      opacity: 0.25 + r(6) * 0.55,
      drift: (r(7) - 0.5) * 40,
    };
  });
}

function CinematicReveal({ result, onOpenAnother }: { result: FortuneResult; onOpenAnother: () => void }) {
  const [step, setStep] = useState<RevealStep>("enter");
  const [mintStatus, setMintStatus] = useState<MintStatus>("idle");
  const [revealedRarity, setRevealedRarity] = useState<Rarity | null>(null);
  const minted = mintStatus === "success" && revealedRarity !== null;
  const activeRarity: Rarity = revealedRarity ?? "NORMAL";
  const cfg = RARITY_WORLDS[activeRarity];
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const particles = useRef(makeParticles(cfg.particleCount, activeRarity.charCodeAt(0))).current;
  const stars = useRef(cfg.starCount > 0 ? makeParticles(cfg.starCount, activeRarity.charCodeAt(1) + 13) : []).current;

  useEffect(() => {
    const timers = timerRefs.current;
    timers.push(setTimeout(() => setStep("atmosphere"), 80));
    // Skip the rarity step here — rarity reveals later, after mint
    timers.push(setTimeout(() => setStep("fortune"), 900));
    timers.push(setTimeout(() => setStep("meta"), 2600));
    timers.push(setTimeout(() => setStep("settled"), 3300));
    return () => timers.forEach(clearTimeout);
  }, []);

  // Rarity reveal: "hidden" → "placeholder" (neutral white) → "shockwave" (full-screen ripple) → "revealed"
  const [rarityPhase, setRarityPhase] = useState<"hidden" | "placeholder" | "shockwave" | "revealed">("hidden");

  // Show neutral placeholder once the fortune step kicks in (pre-mint)
  useEffect(() => {
    if (rarityPhase === "hidden" && (step === "fortune" || step === "meta" || step === "settled")) {
      setRarityPhase("placeholder");
    }
  }, [step, rarityPhase]);

  // When rarity arrives after mint, run the shockwave sequence
  useEffect(() => {
    if (!revealedRarity) return;
    // Pack-opening: 500ms expand → 400ms hold → 300ms fade out = 1200ms total
    setRarityPhase("shockwave");
    const t = setTimeout(() => setRarityPhase("revealed"), 900); // swap colors mid-fade so UI is colored when overlay clears
    return () => clearTimeout(t);
  }, [revealedRarity]);

  const showFortune = step === "fortune" || step === "meta"    || step === "settled";
  const showMeta    = step === "meta"    || step === "settled";
  const showButtons = step === "settled";
  const showRarityBlock = rarityPhase !== "hidden";
  const rarityRevealed = rarityPhase === "revealed" && revealedRarity !== null;
  const placeholderVisible = rarityPhase === "placeholder";
  const shockwaveActive = rarityPhase === "shockwave";


  const words = result.message.split(" ");
  let runningCharIdx = 0;

  return (
    <div className={`reveal-world ${cfg.worldClass} ${step !== "enter" ? "reveal-world-in" : ""}`}>
      <div className="world-base" />
      <div className="world-vignette" />
      <div className="world-aurora" />

      {(shockwaveActive || rarityPhase === "revealed") && revealedRarity && (
        <div
          key={`shockwave-${revealedRarity}`}
          className={`rarity-shockwave ${shockwaveActive ? "rarity-shockwave-active" : "rarity-shockwave-done"}`}
          style={{ background: cfg.rarityColor }}
          aria-hidden="true"
        />
      )}

      {stars.length > 0 && (
        <div className="world-stars">
          {stars.map((s, i) => (
            <span key={i} className="world-star" style={{
              left: `${s.left}%`, top: `${s.top}%`,
              width: `${s.size * 0.7}px`, height: `${s.size * 0.7}px`,
              animationDelay: `${s.delay}s`, animationDuration: `${4 + s.duration * 0.3}s`,
              opacity: s.opacity * 0.9,
            }} />
          ))}
        </div>
      )}

      {cfg.rayCount > 0 && (
        <div className="world-rays">
          {Array.from({ length: cfg.rayCount }).map((_, i) => (
            <span key={i} className="world-ray" style={{
              transform: `translate(-50%, -100%) rotate(${(360 / cfg.rayCount) * i}deg)`,
              animationDelay: `${(i % 4) * 0.8}s`,
            }} />
          ))}
        </div>
      )}

      <div className="world-halo" />
      <div className="world-halo world-halo-2" />

      <div className="world-particles">
        {particles.map((p, i) => (
          <span key={i} className="world-particle" style={{
            left: `${p.left}%`, top: `${p.top}%`,
            width: `${p.size}px`, height: `${p.size}px`,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ['--drift' as any]: `${p.drift}px`,
          } as React.CSSProperties} />
        ))}
      </div>

      <div className="reveal-composition">
        {showRarityBlock && (
          <div
            className={`reveal-rarity-word in ${rarityRevealed ? "reveal-rarity-colored" : ""}`}
            style={{
              color: rarityRevealed ? cfg.rarityColor : "#FFFFFF",
              letterSpacing: cfg.rarityLetterSpacing,
              ['--rarity-color' as any]: cfg.rarityColor,
            } as React.CSSProperties}
          >
            {rarityRevealed && revealedRarity === "LEGENDARY" && <span className="rarity-trophy-glow" aria-hidden="true" />}
            <span
              className="reveal-rarity-text"
              style={{ opacity: placeholderVisible || rarityRevealed ? 1 : 0, transition: "opacity 300ms ease" }}
            >
              {rarityRevealed ? revealedRarity : "✦"}
            </span>
            <span
              className="reveal-rarity-rule reveal-rarity-rule-animated"
              style={{ background: rarityRevealed ? cfg.rarityColor : "rgba(255,255,255,0.5)" }}
              data-revealed={rarityRevealed ? "true" : "false"}
            />
          </div>
        )}

        <p
          className={`reveal-fortune ${showFortune ? "in" : ""} ${rarityRevealed ? "reveal-fortune-pulse" : ""}`}
          style={{
            color: cfg.textColor,
            ['--rarity-color' as any]: cfg.rarityColor,
          } as React.CSSProperties}
        >

          <span className="reveal-quote" aria-hidden="true">“</span>
          {words.map((word, wi) => (
            <span key={wi} className="reveal-word">
              {Array.from(word).map((ch, ci) => {
                const idx = runningCharIdx++;
                return (
                  <span
                    key={ci}
                    className={`reveal-letter ${showFortune ? "in" : ""}`}
                    style={{ transitionDelay: showFortune ? `${idx * 28}ms` : "0ms" }}
                  >{ch}</span>
                );
              })}
              {wi < words.length - 1 && <span className="reveal-space">&nbsp;</span>}
            </span>
          ))}
          <span className="reveal-quote" aria-hidden="true">”</span>
        </p>

        <div className={`reveal-meta-row ${showMeta ? "in" : ""}`} style={{ color: cfg.metaColor }}>
          <span>Cookie #{result.cookie_number}</span>
          {result.txHash && (
            <>
              <span className="reveal-meta-dot">·</span>
              <a href={`https://explorer-studio.genlayer.com/tx/${result.txHash}`} target="_blank" rel="noopener noreferrer" className="reveal-meta-link" style={{ color: cfg.metaColor }}>
                View on Explorer ↗
              </a>
            </>
          )}
        </div>

        <div className={`reveal-actions ${showButtons ? "in" : ""}`}>
          <button
            onClick={() => {
              const rarityPart = revealedRarity ? `a ${revealedRarity} ` : "an AI ";
              const text = `The AI gods blessed me with ${rarityPart}fortune:\n\n"${result.message}"\n\nPowered by @GenLayer — the only chain where AI runs at consensus layer.\n\nOpen yours 👇\nhttps://genfortune.xyz`;
              window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
            }}
            className={`reveal-share reveal-share-${activeRarity.toLowerCase()}`}
          >
            Share on X ✦
          </button>
          <MintFortuneButton
            fortune={{ text: result.message, cookieNumber: result.cookie_number }}
            rarity={activeRarity}
            onStatusChange={setMintStatus}
            onRarityRevealed={setRevealedRarity}
          />
          {minted && (
            <div className="reveal-cta-row reveal-cta-row-in">
              <button onClick={onOpenAnother} className={`reveal-cta reveal-cta-secondary reveal-cta-${activeRarity.toLowerCase()}`}>
                Open Another
              </button>
              <a
                href="https://genmarket.app"
                target="_blank"
                rel="noopener noreferrer"
                className={`reveal-cta reveal-cta-primary reveal-cta-${activeRarity.toLowerCase()}`}
              >
                List on GenMarket ↗
              </a>
            </div>
          )}
          <div className="reveal-credit">
            Made by{" "}
            <a href="https://x.com/ZaksansPG" target="_blank" rel="noopener noreferrer">Zaksans</a>
          </div>
        </div>
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
          const bal3 = await fetchBalance(addr);
          setBalance(bal3);
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
      const receipt: any = await client.waitForTransactionReceipt({ hash: txHash, status: TransactionStatus.ACCEPTED, retries: 400, interval: 10000 });

      const parseReadable = (raw: string) => {
        const fixed = raw.replace(/(\d)"(?=[a-zA-Z])/g, '$1,"').replace(/"(\s*)"(?=[a-zA-Z])/g, '","').replace(/}(\s*)"(?=[a-zA-Z])/g, '},"');
        return JSON.parse(fixed);
      };
      const leaderReceipt = receipt?.consensus_data?.leader_receipt?.[0];
      const readable = leaderReceipt?.result?.payload?.readable;
      if (readable) {
        try {
          const parsed = parseReadable(readable);
          if (parsed?.message) { setFortune({ message: parsed.message, cookie_number: parsed.cookie_number ?? 1, txHash }); setPhase("revealed"); return; }
        } catch {}
      }
      const eqOutput = leaderReceipt?.eq_outputs?.["0"]?.payload?.readable;
      if (eqOutput) {
        try {
          const parsed2 = parseReadable(eqOutput);
          if (parsed2?.message) { setFortune({ message: parsed2.message, cookie_number: parsed2.cookie_number ?? 1, txHash }); setPhase("revealed"); return; }
        } catch {}
      }
      setError("Fortune confirmed onchain but could not display. Check explorer for your result.");
      setPhase("connected");
    } catch (err: any) {
      if (err?.code === 4001) { setError("Transaction rejected."); } else { setError(err?.message || "Something went wrong."); }
      setPhase("connected");
    }
  }, [keyword, wallet]);

  const recheckBalance = useCallback(async () => {
    if (!wallet) return;
    const bal = await fetchBalance(wallet);
    setBalance(bal);
  }, [wallet]);

  const goBackToConnected = useCallback(() => { setFortune(null); setError(null); setPhase("connected"); }, []);

  const [introDone, setIntroDone] = useState(false);

  return (
    <>
    <IntroVideo onComplete={() => setIntroDone(true)} />
    <main style={{
      background: "radial-gradient(ellipse at 50% 45%, rgba(245,244,240,1) 0%, #FAFAF8 60%, #F5F4F0 100%)",
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "64px 24px", position: "relative", overflow: "hidden",
      opacity: introDone ? 1 : 0,
      transform: introDone ? "scale(1)" : "scale(0.98)",
      filter: introDone ? "blur(0px)" : "blur(6px)",
      transition: "opacity 0.8s ease-out, transform 0.8s ease-out, filter 0.8s ease-out",
    }}>
      <h1 className="sr-only">Fortune Cookie</h1>

      {(phase === "idle" || phase === "connected") && <div className="oracle-pattern" />}

      {/* Wallet info — top right */}
      {wallet && phase === "connected" && (
        <div style={{ position: "absolute", top: 20, right: 24, fontFamily: "'Outfit', sans-serif", fontSize: 9, fontWeight: 300, color: "#C0BBB3", letterSpacing: "0.05em", textAlign: "right", zIndex: 10 }}>
          <span>{wallet.slice(0, 6)}…{wallet.slice(-4)}</span>
          <span style={{ marginLeft: 8 }}>{(Number(balance) / 1e18).toFixed(2)} GEN</span>
        </div>
      )}

      {phase !== "revealed" && phase !== "revealing" && (
        <div style={{ marginBottom: 40, position: "relative", zIndex: 1 }}>
          <CookieVisual phase={phase} />
        </div>
      )}

      {phase === "connected" && hasSufficientBalance && (
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

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 360 }}>
        {phase === "idle" && <button onClick={connectWallet} className="btn-pill animate-fadeIn">Connect Wallet</button>}
        {phase === "connected" && !wrongNetwork && hasSufficientBalance && (
          <>
            <button onClick={openCookie} className="btn-pill animate-fadeIn">Open Your Fortune</button>
            <p className="animate-fadeIn" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 300, color: "#C0BBB3", marginTop: 12, letterSpacing: "0.1em" }}>0.1 GEN</p>
          </>
        )}
        {phase === "connected" && !wrongNetwork && !hasSufficientBalance && (
          <InsufficientBalancePrompt balance={balance} onRecheck={recheckBalance} />
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
    </>
  );
}
