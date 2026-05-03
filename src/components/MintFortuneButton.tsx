import { useState, useCallback } from "react";

export type Rarity = "NORMAL" | "RARE" | "UNIQUE" | "LEGENDARY";

export interface FortuneData {
  text: string;
  rarity: Rarity;
  cookieNumber: number;
}

const BASE_CHAIN_ID = 8453;

const BASE_CHAIN = {
  chainId: `0x${BASE_CHAIN_ID.toString(16)}`,
  chainName: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://mainnet.base.org"],
  blockExplorerUrls: ["https://basescan.org"],
};

const CONTRACT_ADDRESS = "0xC1Db51Da62cBbe80ba495B815922207E26b7a1A8";
const MINT_PRICE = "400000000000000";

const RARITY_ENUM: Record<Rarity, number> = {
  NORMAL: 0, RARE: 1, UNIQUE: 2, LEGENDARY: 3,
};

function encodeMintFortune(to: string, text: string, rarity: number, cookieNum: number): string {
  const SELECTOR = "0x1e300e9b";
  const pad32 = (hex: string) => hex.replace("0x", "").padStart(64, "0");
  const toHex = (n: number | bigint) => BigInt(n).toString(16);

  const addrPadded = pad32(to.toLowerCase());
  const stringOffset = pad32(toHex(0x80));
  const rarityPadded = pad32(toHex(rarity));
  const cookiePadded = pad32(toHex(cookieNum));

  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);
  const textLen = textBytes.length;
  const textLenPadded = pad32(toHex(textLen));
  const paddedLen = Math.ceil(textLen / 32) * 32;
  const textHex = Array.from(textBytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .padEnd(paddedLen * 2, "0");

  return SELECTOR + addrPadded + stringOffset + rarityPadded + cookiePadded + textLenPadded + textHex;
}

type MintStatus = "idle" | "switching_network" | "awaiting_wallet" | "minting" | "success" | "error";

async function pollReceipt(eth: any, hash: string, retries = 60, interval = 3000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    const receipt = await eth.request({ method: "eth_getTransactionReceipt", params: [hash] });
    if (receipt) {
      if (receipt.status === "0x0") throw new Error("Transaction reverted on-chain.");
      return receipt;
    }
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error("Transaction not confirmed after 3 minutes.");
}

const RARITY_COLORS: Record<Rarity, { accent: string; glow: string; text: string }> = {
  LEGENDARY: { accent: "#F5C542", glow: "rgba(245,197,66,0.35)", text: "#0A0800" },
  UNIQUE:    { accent: "#B47FFF", glow: "rgba(180,127,255,0.35)", text: "#060510" },
  RARE:      { accent: "#4FC3F7", glow: "rgba(79,195,247,0.35)", text: "#020609" },
  NORMAL:    { accent: "#1A1A1A", glow: "rgba(0,0,0,0.15)", text: "#F8F6F0" },
};

export function MintFortuneButton({ fortune, rarity }: { fortune: FortuneData; rarity: Rarity }) {
  const [status, setStatus] = useState<MintStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const colors = RARITY_COLORS[rarity];

  const isLoading = ["switching_network", "awaiting_wallet", "minting"].includes(status);

  const mint = useCallback(async () => {
    const eth = (window as any).ethereum;
    if (!eth) { setError("No wallet detected. Install MetaMask."); setStatus("error"); return; }

    try {
      setError(null); setTxHash(null); setTokenId(null);

      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      const account = accounts[0];
      if (!account) throw new Error("No account connected.");

      setStatus("switching_network");
      const chainId: string = await eth.request({ method: "eth_chainId" });
      if (parseInt(chainId, 16) !== BASE_CHAIN_ID) {
        try {
          await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BASE_CHAIN.chainId }] });
        } catch (e: any) {
          if (e.code === 4902) {
            await eth.request({ method: "wallet_addEthereumChain", params: [BASE_CHAIN] });
          } else throw e;
        }
      }

      setStatus("awaiting_wallet");
      const calldata = encodeMintFortune(account, fortune.text, RARITY_ENUM[fortune.rarity], fortune.cookieNumber);

      const hash: string = await eth.request({
        method: "eth_sendTransaction",
        params: [{ from: account, to: CONTRACT_ADDRESS, value: `0x${BigInt(MINT_PRICE).toString(16)}`, data: calldata }],
      });

      setTxHash(hash);
      setStatus("minting");

      const receipt = await pollReceipt(eth, hash);
      const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
      const log = receipt.logs?.find((l: any) => l.topics?.[0]?.toLowerCase() === TRANSFER_TOPIC);
      if (log?.topics?.[3]) setTokenId(BigInt(log.topics[3]).toString());

      setStatus("success");
    } catch (err: any) {
      setError(err.code === 4001 ? "Transaction rejected." : (err.message ?? "Mint failed."));
      setStatus("error");
    }
  }, [fortune]);

  const label: Record<MintStatus, string> = {
    idle: "✦ Mint as NFT on Base",
    switching_network: "Switching to Base…",
    awaiting_wallet: "Confirm in wallet…",
    minting: "Minting…",
    success: "✦ Minted!",
    error: "✦ Try again",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
      <button
        onClick={() => !isLoading && mint()}
        disabled={isLoading}
        style={{
          padding: "10px 28px",
          borderRadius: "999px",
          border: `1px solid ${colors.accent}`,
          background: "transparent",
          color: colors.accent,
          fontFamily: "Georgia, serif",
          fontSize: "13px",
          letterSpacing: "2px",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.6 : 1,
          boxShadow: `0 0 18px ${colors.glow}`,
          transition: "all 0.2s ease",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={e => { if (!isLoading) { const b = e.currentTarget; b.style.background = colors.accent; b.style.color = colors.text; }}}
        onMouseLeave={e => { const b = e.currentTarget; b.style.background = "transparent"; b.style.color = colors.accent; }}
      >
        {label[status]}
      </button>

      {isLoading && (
        <span style={{ fontSize: "10px", letterSpacing: "2px", color: colors.accent, opacity: 0.6 }}>
          {status === "switching_network" && "SWITCHING TO BASE"}
          {status === "awaiting_wallet" && "WAITING FOR SIGNATURE"}
          {status === "minting" && "CONFIRMING ON BASE"}
        </span>
      )}

      {status === "success" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", fontSize: "10px", letterSpacing: "1.5px", color: colors.accent, opacity: 0.8 }}>
          {tokenId && <span>TOKEN #{tokenId}</span>}
          {txHash && <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: colors.accent, textDecoration: "underline" }}>VIEW ON BASESCAN ↗</a>}
          {tokenId && <a href={`https://opensea.io/assets/base/${CONTRACT_ADDRESS}/${tokenId}`} target="_blank" rel="noopener noreferrer" style={{ color: colors.accent, textDecoration: "underline" }}>VIEW ON OPENSEA ↗</a>}
        </div>
      )}

      {status === "error" && error && (
        <span style={{ fontSize: "10px", color: "#FF6B6B", opacity: 0.8, maxWidth: "280px", textAlign: "center" }}>{error}</span>
      )}

      {status === "idle" && (
        <span style={{ fontSize: "9px", letterSpacing: "1.5px", color: colors.accent, opacity: 0.35 }}>0.0004 ETH (~$1) ON BASE</span>
      )}
    </div>
  );
}
