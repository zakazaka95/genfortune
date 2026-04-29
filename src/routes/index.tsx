import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import cookieImg from "@/assets/cookie.png";
import cookieOpenImg from "@/assets/cookie-open.png";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Fortune — Open Your Cookie" },
      {
        name: "description",
        content:
          "A premium, minimal fortune cookie experience. Whisper a word, crack open a cookie, reveal an AI-validated fortune.",
      },
    ],
  }),
});

type Phase = "idle" | "connected" | "cracking" | "loading" | "revealed";
type Tier = "LEGENDARY" | "UNIQUE" | "RARE" | "NORMAL" | "MYSTERY";

const GENLAYER_CHAIN_ID = "0x107d"; // 4221
const COOKIE_CONTRACT = "0xfB1C7913162800C75B63cE23278EB5f121c58dA3";

const GENLAYER_NETWORK = {
  chainId: GENLAYER_CHAIN_ID,
  chainName: "GenLayer Testnet",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: ["https://zksync-os-testnet-genlayer.zksync.dev"],
  blockExplorerUrls: [],
};

function getEthereum(): any {
  if (typeof window === "undefined") return null;
  return (window as any).ethereum ?? null;
}

async function ensureGenLayerNetwork(eth: any) {
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GENLAYER_CHAIN_ID }],
    });
  } catch (err: any) {
    if (err?.code === 4902 || /Unrecognized chain/i.test(err?.message ?? "")) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [GENLAYER_NETWORK],
      });
    } else {
      throw err;
    }
  }
}

function decodeHexBytes(hex: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  try {
    return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  } catch {
    return String.fromCharCode(...bytes);
  }
}

function hexToUtf8(hex: string): string {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length === 0) return "";
  if (clean.length >= 128) {
    try {
      const lenHex = clean.slice(64, 128);
      const len = parseInt(lenHex, 16);
      if (!Number.isNaN(len) && len > 0 && 128 + len * 2 <= clean.length) {
        const dataHex = clean.slice(128, 128 + len * 2);
        return decodeHexBytes(dataHex);
      }
    } catch {
      /* fall through */
    }
  }
  return decodeHexBytes(clean).replace(/[\u0000-\u001F\u007F]+/g, "").trim();
}

function parseFortune(raw: string): { tier: Tier; message: string } {
  const idx = raw.indexOf(":");
  if (idx === -1) return { tier: "MYSTERY", message: raw.trim() };
  const tierRaw = raw.slice(0, idx).trim().toUpperCase();
  const message = raw.slice(idx + 1).trim();
  const known: Tier[] = ["LEGENDARY", "UNIQUE", "RARE", "NORMAL"];
  const tier = (known.includes(tierRaw as Tier) ? tierRaw : "MYSTERY") as Tier;
  return { tier, message };
}

function Index() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [wallet, setWallet] = useState<string | null>(null);
  const [fortune, setFortune] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState("Consulting the network…");
  const loadingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) window.clearTimeout(loadingTimerRef.current);
    };
  }, []);

  const connectWallet = async () => {
    setError(null);
    const eth = getEthereum();
    if (!eth?.request) {
      setError("No wallet found. Install Rabby or MetaMask.");
      return;
    }
    try {
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      setWallet(accounts?.[0] ?? null);
      await ensureGenLayerNetwork(eth);
      setPhase("connected");
    } catch (err: any) {
      console.error("connectWallet failed:", err);
      if (err?.code === 4001) setError("Connection rejected");
      else setError(err?.message ?? "Could not connect wallet.");
    }
  };

  const openCookie = async () => {
    setError(null);
    setFortune(null);
    setHint(null);

    const eth = getEthereum();
    if (!eth?.request) {
      setError("No wallet found. Install Rabby or MetaMask.");
      return;
    }

    let activeWallet = wallet;
    if (!activeWallet) {
      try {
        const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
        activeWallet = accounts?.[0] ?? null;
        setWallet(activeWallet);
        await ensureGenLayerNetwork(eth);
      } catch (err: any) {
        console.error("connect failed:", err);
        setError(err?.code === 4001 ? "Connection rejected" : "Could not connect wallet.");
        return;
      }
    }

    setPhase("cracking");
    await new Promise((r) => setTimeout(r, 600));
    setPhase("loading");
    setLoadingText("Consulting the network…");
    if (loadingTimerRef.current) window.clearTimeout(loadingTimerRef.current);
    loadingTimerRef.current = window.setTimeout(() => {
      setLoadingText("Generating your fortune…");
    }, 1000);

    try {
      const provider = new ethers.BrowserProvider(eth);
      const signer = await provider.getSigner();

      const abi = ["function open_cookie() payable returns (string)"];
      const iface = new ethers.Interface(abi);
      const contract = new ethers.Contract(
        ethers.getAddress(COOKIE_CONTRACT.toLowerCase()),
        abi,
        signer
      );

      console.log("Calling contract.open_cookie (payable 10 GEN)");
      const tx = await contract.open_cookie({ value: ethers.parseEther("10") });
      console.log("tx sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("tx confirmed:", receipt?.hash);

      // Try to decode the returned string by replaying the call at the mined block
      let revealed = "";
      try {
        const callResult = await provider.call({
          to: tx.to ?? ethers.getAddress(COOKIE_CONTRACT.toLowerCase()),
          from: activeWallet ?? undefined,
          data: tx.data,
          value: tx.value,
          blockTag: receipt?.blockNumber,
        });
        if (callResult && callResult !== "0x") {
          const [decoded] = iface.decodeFunctionResult("open_cookie", callResult);
          revealed = String(decoded ?? "");
        }
      } catch (replayErr) {
        console.warn("replay call failed:", replayErr);
      }

      // Fallback: scan receipt logs for a UTF-8 string payload
      if (!revealed && receipt?.logs?.length) {
        for (const log of receipt.logs) {
          const candidate = hexToUtf8(log.data ?? "");
          if (candidate && candidate.length > 4) {
            revealed = candidate;
            break;
          }
        }
      }

      if (!revealed) throw new Error("No result returned");

      setFortune(revealed);
      setPhase("revealed");
    } catch (err: any) {
      console.error(err);
      setError("Something went wrong. Try again.");
      setPhase(activeWallet ? "connected" : "idle");
    } finally {
      if (loadingTimerRef.current) {
        window.clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    }
  };

  const reset = () => {
    setFortune(null);
    setError(null);
    setHint(null);
    setPhase("idle");
  };

  const showOpen = phase === "loading" || phase === "revealed";
  const isCracking = phase === "cracking";

  const parsed = fortune ? parseFortune(fortune) : null;

  const tierClass = (tier: Tier) => {
    switch (tier) {
      case "LEGENDARY":
        return "tier-legendary";
      case "UNIQUE":
        return "tier-unique";
      case "RARE":
        return "tier-rare";
      case "NORMAL":
        return "tier-normal";
      default:
        return "tier-normal";
    }
  };

  return (
    <main className="min-h-screen w-full bg-white flex flex-col items-center justify-center px-6 py-16 overflow-hidden">
      <h1 className="sr-only">Fortune Cookie</h1>

      <div className="relative h-[340px] w-[340px] sm:h-[420px] sm:w-[420px] flex items-center justify-center">
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 h-6 w-56 rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0) 70%)",
            filter: "blur(2px)",
          }}
        />
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

      {/* Action */}
      <div className="mt-2 w-full max-w-md flex flex-col items-center">


        <div className="mt-5 h-14 flex items-center justify-center">
          {(phase === "idle" || phase === "connected") && (
            <button onClick={openCookie} className="btn-premium reveal-up">
              {fortune ? "Open Another" : "Open Your Fortune"}
            </button>
          )}

          {(phase === "cracking" || phase === "loading") && (
            <div className="flex items-center gap-2 pulse-soft" aria-live="polite">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-900" />
              <span
                className="h-1.5 w-1.5 rounded-full bg-neutral-900"
                style={{ animationDelay: "0.2s" }}
              />
              <span
                className="h-1.5 w-1.5 rounded-full bg-neutral-900"
                style={{ animationDelay: "0.4s" }}
              />
              <span className="ml-2 text-sm tracking-tight text-neutral-500">
                {phase === "cracking" ? "Cracking…" : loadingText}
              </span>
            </div>
          )}

          {phase === "revealed" && (
            <button onClick={reset} className="btn-premium reveal-up">
              Open Another
            </button>
          )}
        </div>

        {hint && (
          <p className="mt-1 text-xs text-neutral-400 reveal-up">{hint}</p>
        )}
      </div>

      {wallet && phase !== "idle" && (
        <p className="mt-3 text-[11px] tracking-wide text-neutral-400 font-mono">
          {wallet.length > 12 ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : wallet}
        </p>
      )}

      {phase === "revealed" && parsed && (
        <div className="mt-10 reveal-up w-full max-w-md">
          <div
            className="rounded-2xl bg-white px-8 py-8 text-center"
            style={{
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
            }}
          >
            <p
              className={[
                "uppercase tracking-[0.22em] mb-4 font-semibold",
                tierClass(parsed.tier),
              ].join(" ")}
            >
              {parsed.tier}
            </p>
            <p className="text-lg sm:text-xl leading-relaxed text-neutral-900 tracking-tight">
              “{parsed.message}”
            </p>
          </div>
          <p className="mt-4 text-center text-[11px] tracking-wide text-neutral-400">
            Generated onchain with deterministic randomness.
          </p>
        </div>
      )}

      {error && <p className="mt-6 text-xs text-neutral-500 reveal-up">{error}</p>}
    </main>
  );
}
