import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

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

    if (currentChainId.toLowerCase() === "0xf22f") return; // already on Studio

    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xF22F" }],
      });
      return;
    } catch (switchErr: any) {
      console.log("Switch error code:", switchErr.code, switchErr.message);
    }

    // Try adding regardless of error code — some wallets don't return 4902
    try {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [STUDIO_CHAIN_PARAMS],
      });
      return;
    } catch (addErr: any) {
      console.log("Add error:", addErr.code, addErr.message);
    }

    // If both failed, check if we're on the right network anyway
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

function CookieSVG({ phase }: { phase: Phase }) {
  const className =
    phase === "cracking" ? "cookie-cracking" :
    phase === "revealing" ? "cookie-revealed" :
    "cookie-idle";

  return (
    <div className={className}>
      <svg width="260" height="220" viewBox="0 0 260 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Fortune cookie">
        <ellipse cx="130" cy="200" rx="65" ry="10" fill="rgba(0,0,0,0.06)"/>
        <path d="M38 118 Q42 170 130 172 Q218 170 222 118 Q200 136 130 138 Q60 136 38 118Z" fill="#C17F3C"/>
        <path d="M38 118 Q42 66 130 64 Q218 66 222 118 Q200 100 130 98 Q60 100 38 118Z" fill="#E8A84C"/>
        <path d="M38 118 Q60 128 130 130 Q200 128 222 118 Q200 108 130 106 Q60 108 38 118Z" fill="#D4922A"/>
        <path d="M55 118 Q92 114 130 118 Q168 122 205 118" stroke="#B07828" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6"/>
        <rect x="96" y="111" width="68" height="16" rx="3" fill="#FFF8EE" opacity="0.95"/>
        <line x1="103" y1="117" x2="157" y2="117" stroke="#D4922A" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
        <line x1="103" y1="121" x2="150" y2="121" stroke="#D4922A" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
        <ellipse cx="100" cy="84" rx="28" ry="12" fill="rgba(255,255,255,0.18)" transform="rotate(-18 100 84)"/>
        <ellipse cx="72" cy="104" rx="5" ry="2.5" fill="#B8742A" opacity="0.5" transform="rotate(25 72 104)"/>
        <ellipse cx="188" cy="128" rx="4.5" ry="2" fill="#B8742A" opacity="0.45" transform="rotate(-15 188 128)"/>
        <ellipse cx="105" cy="148" rx="4" ry="2" fill="#B8742A" opacity="0.4" transform="rotate(8 105 148)"/>
        <ellipse cx="158" cy="82" rx="3.5" ry="2" fill="#C8882C" opacity="0.4" transform="rotate(-30 158 82)"/>
        <ellipse cx="80" cy="136" rx="4" ry="2" fill="#B8742A" opacity="0.35" transform="rotate(20 80 136)"/>
      </svg>
    </div>
  );
}

const RARITY_STYLES: Record<Rarity, { border: string; bg: string; color: string }> = {
  LEGENDARY: { border: "#E8D5A3", bg: "#FFFCF0", color: "#B8860B" },
  RARE: { border: "#C5D3ED", bg: "#F0F4FF", color: "#4A6FA5" },
  UNIQUE: { border: "#D5C8ED", bg: "#F7F4FF", color: "#7B5EA7" },
  NORMAL: { border: "rgba(0,0,0,0.08)", bg: "#FFFFFF", color: "#555555" },
};

function FortuneCard({
  result,
  onOpenAnother,
}: {
  result: FortuneResult;
  onOpenAnother: () => void;
}) {
  const style = RARITY_STYLES[result.rarity] ?? RARITY_STYLES.NORMAL;

  return (
    <div className="animate-fadeIn w-full max-w-sm flex flex-col items-center">
      <div
        style={{
          background: style.bg,
          border: `1px solid ${style.border}`,
          borderRadius: 20,
          padding: "48px 40px",
          textAlign: "center",
          width: "100%",
        }}
      >
        {/* Decorative line */}
        <div style={{ width: 40, height: 1, background: style.color, opacity: 0.3, margin: "0 auto 12px" }} />

        <p style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.25em",
          textTransform: "uppercase" as const,
          color: style.color,
          marginBottom: 12,
        }}>
          {result.rarity}
        </p>

        {/* Decorative line */}
        <div style={{ width: 40, height: 1, background: style.color, opacity: 0.3, margin: "0 auto 24px" }} />

        <p style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 30,
          fontWeight: 300,
          fontStyle: "italic",
          lineHeight: 1.45,
          color: "#1A1A1A",
        }}>
          "{result.message}"
        </p>

        <p style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 11,
          fontWeight: 300,
          color: "#C0C0C0",
          marginTop: 24,
        }}>
          Cookie #{result.cookie_number}
        </p>

        {result.txHash && (
          <a
            href={`https://explorer-studio.genlayer.com/tx/${result.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              marginTop: 8,
              fontFamily: "'Outfit', sans-serif",
              fontSize: 11,
              fontWeight: 300,
              color: "#9A9A9A",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.textDecoration = "underline"; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.textDecoration = "none"; }}
          >
            View on Explorer ↗
          </a>
        )}
      </div>

      <button onClick={onOpenAnother} className="btn-outline mt-6">
        Open Another
      </button>
    </div>
  );
}

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

    // 1. Request accounts — opens wallet popup
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

    // 2. Switch to Studio network
    try {
      await ensureStudioNetwork();
    } catch {
      setError("Could not switch to GenLayer Studio network. Please switch manually.");
      return;
    }

    // 3. Only after network confirmed — update state
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

      // Ensure wallet is on Studio network before creating client
      await ensureStudioNetwork();

      // Create GenLayer client with MetaMask account — studionet is where the contract lives
      const client = createClient({
        chain: studionet,
        account: address as `0x${string}`,
      });

      console.log("genlayer-js version: 1.1.7");
      console.log("Chain:", JSON.stringify(studionet.name));
      console.log("Calling writeContract with keyword:", userKeyword);

      // Submit via genlayer-js — routes through consensus main contract
      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "open_cookie",
        args: [userKeyword],
        value: 100000000000000000n, // 0.1 GEN
      });

      console.log("GenLayer tx hash:", txHash);
      setPhase("revealing");

      // Wait for consensus to finalize
      const receipt: any = await client.waitForTransactionReceipt({
        hash: txHash,
        status: TransactionStatus.FINALIZED,
        retries: 60,
      });

      console.log("Full receipt:", JSON.stringify(receipt, null, 2));

      // Fix missing commas in GenLayer's malformed JSON readable strings
      const parseReadable = (raw: string) => {
        const fixed = raw
          .replace(/(\d)"(?=[a-zA-Z])/g, '$1,"')     // number followed by key
          .replace(/"(\s*)"(?=[a-zA-Z])/g, '","')     // string end followed by key
          .replace(/}(\s*)"(?=[a-zA-Z])/g, '},"');    // object end followed by key
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

      // Fallback: try eq_outputs
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

      {/* Cookie visual */}
      {phase !== "revealed" && (
        <div style={{ marginBottom: 32 }}>
          <CookieSVG phase={phase} />
        </div>
      )}

      {/* Wallet address */}
      {wallet && phase !== "idle" && phase !== "revealed" && (
        <p style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 12,
          fontWeight: 300,
          color: "#9A9A9A",
          marginBottom: 16,
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
            width: 280,
            textAlign: "center",
            fontFamily: "'Outfit', sans-serif",
            fontSize: 14,
            fontWeight: 300,
            color: "#1A1A1A",
            background: "transparent",
            border: "none",
            borderBottom: "1px solid rgba(0,0,0,0.12)",
            padding: "8px 0",
            marginBottom: 32,
            outline: "none",
          }}
        />
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 320 }}>
        {phase === "idle" && (
          <button onClick={connectWallet} className="btn-primary animate-fadeIn">
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

        {phase === "revealing" && (
          <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 300, color: "#9A9A9A" }}>
              The oracle is consulting the validators
            </p>
            <div style={{ display: "flex", gap: 6 }}>
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#1A1A1A",
                    animation: "pulse-dot 1.4s ease-in-out infinite",
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 300, color: "#C0C0C0" }}>
              30–60 seconds
            </p>
          </div>
        )}
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
          fontSize: 13,
          fontWeight: 300,
          whiteSpace: "pre-wrap",
          margin: "16px 0 0",
          textAlign: "center",
        }}>
          {error}
        </pre>
      )}
    </main>
  );
}
