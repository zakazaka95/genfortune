import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect } from "react";

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
}

const CONTRACT_ADDRESS = "0x53244292f3EC3aBEbd61a847B3aB2c16C06346B9";
const CHAIN_HEX = "0x3C1"; // 961

const GENLAYER_CHAIN_PARAMS = {
  chainId: CHAIN_HEX,
  chainName: "GenLayer Testnet",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: ["https://rpc.testnet.genlayer.com"],
  blockExplorerUrls: ["https://explorer.testnet.genlayer.com"],
};

function getEthereum(): any {
  if (typeof window === "undefined") return null;
  return (window as any).ethereum ?? null;
}

function CookieSVG({ shaking, fading }: { shaking?: boolean; fading?: boolean }) {
  return (
    <svg
      viewBox="0 0 200 140"
      width="220"
      height="154"
      className={[
        "transition-all duration-500",
        shaking ? "animate-shake" : "",
        fading ? "opacity-0 scale-[0.8]" : "opacity-100 scale-100",
      ].join(" ")}
      aria-label="Fortune cookie"
    >
      {/* Shadow */}
      <ellipse cx="100" cy="132" rx="60" ry="6" fill="rgba(0,0,0,0.06)" />
      {/* Cookie body */}
      <path
        d="M30 80 Q30 40 70 30 Q100 22 130 30 Q170 40 170 80 Q170 100 140 105 Q100 112 60 105 Q30 100 30 80Z"
        fill="#D4922A"
        stroke="#A06820"
        strokeWidth="1.5"
      />
      {/* Highlight */}
      <path
        d="M50 55 Q70 35 100 32 Q130 35 145 50"
        fill="none"
        stroke="#F0BC5E"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Fold line */}
      <path
        d="M55 82 Q100 65 145 82"
        fill="none"
        stroke="#A06820"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Paper slip */}
      <rect x="75" y="76" width="50" height="8" rx="1" fill="#FEFEFE" opacity="0.85" />
      <line x1="80" y1="79" x2="120" y2="79" stroke="#CCC" strokeWidth="0.5" />
      <line x1="82" y1="81" x2="110" y2="81" stroke="#CCC" strokeWidth="0.4" />
    </svg>
  );
}

function FortuneCard({
  result,
  onOpenAnother,
}: {
  result: FortuneResult;
  onOpenAnother: () => void;
}) {
  const rarityStyles: Record<Rarity, { border: string; bg: string; label: string }> = {
    LEGENDARY: { border: "#C8922A", bg: "#FFFDF7", label: "text-[#B8860B]" },
    RARE: { border: "#6C8EF5", bg: "#F8FAFF", label: "text-[#4A6CF5]" },
    UNIQUE: { border: "#9B6CF5", bg: "#FAF8FF", label: "text-[#7C3AED]" },
    NORMAL: { border: "#E5E5E5", bg: "#FFFFFF", label: "text-[#999]" },
  };

  const style = rarityStyles[result.rarity] ?? rarityStyles.NORMAL;

  return (
    <div className="animate-fadeIn w-full max-w-sm">
      <div
        className="rounded-2xl px-8 py-8 text-center"
        style={{
          background: style.bg,
          border: `1px solid ${style.border}`,
          boxShadow: "0 8px 40px rgba(0,0,0,0.07)",
        }}
      >
        <p
          className={`text-[11px] tracking-[0.25em] font-semibold uppercase mb-4 ${style.label}`}
        >
          {result.rarity}
        </p>
        <p
          className="text-2xl leading-relaxed italic"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          "{result.message}"
        </p>
        <p className="mt-4 text-[11px] tracking-wide text-[#AAA]">
          Cookie #{result.cookie_number}
        </p>
      </div>
      <div className="mt-6 flex justify-center">
        <button onClick={onOpenAnother} className="btn-cookie">
          Open Another
        </button>
      </div>
    </div>
  );
}

function FortuneCookieApp() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [wallet, setWallet] = useState<string | null>(null);
  const [fortune, setFortune] = useState<FortuneResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const connectWallet = useCallback(async () => {
    setError(null);
    const eth = getEthereum();
    if (!eth) {
      setError("Please install MetaMask to continue.");
      return;
    }
    try {
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      const addr = accounts?.[0];
      if (!addr) {
        setError("No account found.");
        return;
      }
      setWallet(addr);

      // Switch network
      try {
        await eth.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CHAIN_HEX }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [GENLAYER_CHAIN_PARAMS],
          });
        } else if (switchError.code === 4001) {
          setError("Could not switch to GenLayer network. Please switch manually.");
          return;
        } else {
          setError("Could not switch to GenLayer network. Please switch manually.");
          return;
        }
      }

      setPhase("connected");
    } catch (err: any) {
      if (err?.code === 4001) {
        setError("Connection rejected.");
      } else {
        setError(err?.message ?? "Could not connect wallet.");
      }
    }
  }, []);

  const openCookie = useCallback(async () => {
    setError(null);
    setFortune(null);

    const eth = getEthereum();
    if (!eth) {
      setError("Please install MetaMask to continue.");
      return;
    }

    try {
      // Ensure connected
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      const addr = accounts?.[0];
      if (addr) setWallet(addr);

      // Ensure network
      try {
        await eth.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CHAIN_HEX }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [GENLAYER_CHAIN_PARAMS],
          });
        } else {
          setError("Could not switch to GenLayer network. Please switch manually.");
          return;
        }
      }

      // Phase: cracking (waiting for signature)
      setPhase("cracking");

      // Import genlayer-js dynamically to avoid SSR issues
      const { createClient } = await import("genlayer-js");
      const { testnetBradbury } = await import("genlayer-js/chains");

      // Create client with the chain config — override RPC to user's endpoint
      const customChain = {
        ...testnetBradbury,
        id: 961,
        name: "GenLayer Testnet",
        rpcUrls: {
          default: { http: ["https://rpc.testnet.genlayer.com"] },
        },
        blockExplorers: {
          default: {
            name: "GenLayer Explorer",
            url: "https://explorer.testnet.genlayer.com",
          },
        },
      };

      const client = createClient({ chain: customChain as any });

      const txHash = await client.writeContract({
        account: addr,
        address: CONTRACT_ADDRESS,
        functionName: "open_cookie",
        args: [keyword || ""],
        value: BigInt("100000000000000000"), // 0.1 GEN
      });

      // Phase: revealing (polling for result)
      setPhase("revealing");

      // Set a timeout
      const timeoutId = window.setTimeout(() => {
        setError("Taking longer than expected. Check the explorer.");
        setPhase("connected");
      }, 60000);
      timeoutRef.current = timeoutId;

      const receipt = await client.waitForTransactionReceipt({ hash: txHash });

      clearTimeout(timeoutId);
      timeoutRef.current = null;

      // Extract result
      let result: FortuneResult;
      if (receipt && typeof receipt === "object") {
        // Try to extract from receipt
        const r = receipt as any;
        const data = r.result ?? r.data ?? r;
        if (data.rarity && data.message) {
          result = {
            rarity: String(data.rarity).toUpperCase() as Rarity,
            message: String(data.message),
            cookie_number: Number(data.cookie_number ?? 0),
          };
        } else if (typeof data === "string") {
          // Try JSON parse
          try {
            const parsed = JSON.parse(data);
            result = {
              rarity: String(parsed.rarity).toUpperCase() as Rarity,
              message: String(parsed.message),
              cookie_number: Number(parsed.cookie_number ?? 0),
            };
          } catch {
            result = { rarity: "NORMAL", message: data, cookie_number: 0 };
          }
        } else {
          // Try to find result in nested structure (leader_receipt etc)
          let extracted = extractFromReceipt(r);
          if (extracted) {
            result = extracted;
          } else {
            result = {
              rarity: "NORMAL",
              message: "Your fortune has been sealed onchain.",
              cookie_number: 0,
            };
          }
        }
      } else {
        result = {
          rarity: "NORMAL",
          message: "Your fortune has been sealed onchain.",
          cookie_number: 0,
        };
      }

      setFortune(result);
      setPhase("revealed");
    } catch (err: any) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      console.error("openCookie error:", err);
      if (err?.code === 4001 || /user rejected|denied/i.test(err?.message ?? "")) {
        setError("Transaction cancelled.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setPhase(wallet ? "connected" : "idle");
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
    <main className="min-h-screen w-full bg-white flex flex-col items-center justify-center px-6 py-16">
      <h1 className="sr-only">Fortune Cookie</h1>

      {/* Cookie visual */}
      {phase !== "revealed" && (
        <div className="mb-8">
          <CookieSVG
            shaking={phase === "cracking"}
            fading={phase === "revealing"}
          />
        </div>
      )}

      {/* Wallet address */}
      {wallet && phase !== "idle" && phase !== "revealed" && (
        <p className="mb-4 text-[11px] tracking-wide text-[#AAA] font-mono">
          {truncatedWallet}
        </p>
      )}

      {/* Keyword input */}
      {(phase === "connected") && (
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="focus your intention… (optional)"
          className="mb-5 w-64 text-center text-sm px-4 py-2 border border-[#E5E5E5] rounded-full outline-none focus:border-[#CCC] text-[#333] placeholder:text-[#CCC] transition-colors"
        />
      )}

      {/* Actions */}
      <div className="h-14 flex items-center justify-center">
        {phase === "idle" && (
          <button onClick={connectWallet} className="btn-cookie animate-fadeIn">
            Connect Wallet
          </button>
        )}

        {phase === "connected" && (
          <button onClick={openCookie} className="btn-cookie animate-fadeIn">
            Open Your Fortune · 0.1 GEN
          </button>
        )}

        {phase === "cracking" && (
          <p className="text-sm text-[#999] animate-fadeIn">
            Waiting for signature…
          </p>
        )}

        {phase === "revealing" && (
          <div className="flex items-center gap-2 animate-fadeIn">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#999] animate-pulse" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#999] animate-pulse" style={{ animationDelay: "0.2s" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-[#999] animate-pulse" style={{ animationDelay: "0.4s" }} />
            </span>
            <span className="text-sm text-[#999]">The oracle is thinking…</span>
          </div>
        )}
      </div>

      {/* Fortune result */}
      {phase === "revealed" && fortune && (
        <FortuneCard result={fortune} onOpenAnother={goBackToConnected} />
      )}

      {/* Error */}
      {error && (
        <p className="mt-5 text-xs text-[#E53E3E] animate-fadeIn">{error}</p>
      )}
    </main>
  );
}

function extractFromReceipt(receipt: any): FortuneResult | null {
  try {
    // GenLayer receipts may have consensus_data.leader_receipt[0].result
    const leaderReceipts =
      receipt?.consensus_data?.leader_receipt ??
      receipt?.leader_receipt;
    if (Array.isArray(leaderReceipts) && leaderReceipts.length > 0) {
      const lr = leaderReceipts[0];
      const res = lr?.result ?? lr?.execution_result ?? lr?.genvm_result;
      if (res && typeof res === "object" && res.rarity) {
        return {
          rarity: String(res.rarity).toUpperCase() as Rarity,
          message: String(res.message),
          cookie_number: Number(res.cookie_number ?? 0),
        };
      }
      if (typeof res === "string") {
        try {
          const parsed = JSON.parse(res);
          if (parsed.rarity) {
            return {
              rarity: String(parsed.rarity).toUpperCase() as Rarity,
              message: String(parsed.message),
              cookie_number: Number(parsed.cookie_number ?? 0),
            };
          }
        } catch { /* not json */ }
      }
    }
    // Also check top-level result
    if (receipt?.result && typeof receipt.result === "object" && receipt.result.rarity) {
      return {
        rarity: String(receipt.result.rarity).toUpperCase() as Rarity,
        message: String(receipt.result.message),
        cookie_number: Number(receipt.result.cookie_number ?? 0),
      };
    }
  } catch { /* ignore */ }
  return null;
}
