import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ethers } from "ethers";
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

const GENLAYER_CHAIN_ID = "0x107d"; // 4221
const COOKIE_CONTRACT = "0x4175eAfb233f0055F084fFd9C10e493d80C88F04";
const COOKIE_CONTRACT_NORMALIZED = COOKIE_CONTRACT.toLowerCase();
const OPEN_COOKIE_SELECTOR = "0x4fddd4d4";
const VALUE_WEI_HEX = "0x16345785D8A0000"; // 0.1 GEN

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
    // 4902 = chain not added
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

function hexToUtf8(hex: string): string {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length === 0) return "";
  // ABI-encoded string: offset(32) + length(32) + data
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
  // fallback: decode raw, strip non-printable
  return decodeHexBytes(clean).replace(/[\u0000-\u001F\u007F]+/g, "").trim();
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

async function waitForReceipt(eth: any, txHash: string, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const receipt = await eth.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    });
    if (receipt) return receipt;
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Transaction confirmation timed out");
}

function Index() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [wallet, setWallet] = useState<string | null>(null);
  const [fortune, setFortune] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    const eth = getEthereum();
    if (!eth) {
      alert("No wallet");
      return;
    }
    if (!wallet) {
      setError("Wallet not connected.");
      return;
    }

    setPhase("cracking");
    await new Promise((r) => setTimeout(r, 700));
    setPhase("loading");

    try {
      // ensure correct network
      const currentChain: string = await eth.request({ method: "eth_chainId" });
      if (currentChain?.toLowerCase() !== GENLAYER_CHAIN_ID.toLowerCase()) {
        await ensureGenLayerNetwork(eth);
      }

      const contractAddress = COOKIE_CONTRACT;
      console.log(contractAddress);

      const provider = new ethers.BrowserProvider(eth);
      const signer = await provider.getSigner();
      const abi = ["function open_cookie() payable returns (string)"];
      const contract = new ethers.Contract(ethers.getAddress(contractAddress.toLowerCase()), abi, signer);

      const tx = await contract.open_cookie({
        value: ethers.parseEther("0.1"),
      });
      console.log("TX:", tx.hash);
      const receipt = await tx.wait();
      console.log("Confirmed", receipt);

      // Try to decode fortune from logs (last log's data)
      let revealed = "";
      const logs: any[] = receipt?.logs ?? [];
      for (let i = logs.length - 1; i >= 0; i--) {
        const candidate = hexToUtf8(logs[i].data ?? "");
        if (candidate && candidate.length > 2) {
          revealed = candidate;
          break;
        }
      }

      // Fallback: static call to read return value
      if (!revealed) {
        try {
          const ret: string = await contract.open_cookie.staticCall({
            value: ethers.parseEther("0.1"),
          });
          revealed = ret;
        } catch (e) {
          console.warn("staticCall fallback failed", e);
        }
      }

      if (!revealed) {
        setError("Waiting for blockchain result…");
        setPhase("connected");
        return;
      }

      setFortune(revealed);
      setPhase("revealed");
    } catch (err: any) {
      console.error(err);
      const code = err?.code;
      const msg: string = err?.shortMessage ?? err?.message ?? "";
      if (code === 4001 || code === "ACTION_REJECTED" || /reject/i.test(msg)) setError("Transaction rejected");
      else if (code === 4902 || /chain|network/i.test(msg)) setError("Wrong network");
      else if (/insufficient/i.test(msg)) setError("Insufficient funds");
      else setError(msg || "Transaction failed");
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

      <div className="relative h-[340px] w-[340px] sm:h-[420px] sm:w-[420px] flex items-center justify-center">
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 h-6 w-56 rounded-full"
          style={{
            background: "radial-gradient(ellipse at center, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0) 70%)",
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

      <div className="mt-4 h-14 flex items-center justify-center">
        {phase === "idle" && (
          <button onClick={connectWallet} className="btn-premium reveal-up">
            Connect Wallet
          </button>
        )}

        {phase === "connected" && (
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
            <span className="ml-2 text-sm tracking-tight text-neutral-500">Confirming on GenLayer</span>
          </div>
        )}

        {phase === "revealed" && (
          <button onClick={reset} className="btn-premium reveal-up">
            Open Another
          </button>
        )}
      </div>

      {wallet && phase !== "idle" && (
        <p className="mt-3 text-[11px] tracking-wide text-neutral-400 font-mono">
          {wallet.length > 12 ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : wallet}
        </p>
      )}

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
