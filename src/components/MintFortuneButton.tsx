import { useState, useCallback, useEffect } from "react";

export type Rarity = "NORMAL" | "RARE" | "UNIQUE" | "LEGENDARY";

export interface MintRevealData {
  rarity: Rarity;
  rarityColor: string;
  tokenId: string | null;
  txHash: string;
}

export interface FortuneData {
  text: string;
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

const CONTRACT_ADDRESS = "0x33007651eb41c8E2115C2c9Dc65C68d2c05F239B";
const MINT_PRICE = "400000000000000";

const RARITY_BY_INDEX: Rarity[] = ["NORMAL", "RARE", "UNIQUE", "LEGENDARY"];

// New ABI: mintFortune(string text, uint256 cookieNum)
function encodeMintFortune(text: string, cookieNum: number): string {
  const SELECTOR = "0xcb6049e5";
  const pad32 = (hex: string) => hex.replace("0x", "").padStart(64, "0");
  const toHex = (n: number | bigint) => BigInt(n).toString(16);

  // ABI encoding: head = [offset_to_string(=0x40), cookieNum], tail = [string_len, string_data_padded]
  const stringOffset = pad32(toHex(0x40));
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

  return SELECTOR + stringOffset + cookiePadded + textLenPadded + textHex;
}

export type MintStatus = "idle" | "switching_network" | "awaiting_wallet" | "minting" | "success" | "error";

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
  NORMAL:    { accent: "#888888", glow: "rgba(136,136,136,0.25)", text: "#F8F6F0" },
};

// keccak256("FortuneMinted(address,uint256,uint8,uint256)")
const FORTUNE_MINTED_TOPIC = "0x81f4771f10f01707d9d09da1bd3525dd7474a1ab9f505a422c99f3275bce9d2a";

export function MintFortuneButton({
  fortune,
  rarity,
  onStatusChange,
  onRarityRevealed,
  onMintResolved,
  onWalletConfirmed,
}: {
  fortune: FortuneData;
  rarity: Rarity;
  onStatusChange?: (status: MintStatus) => void;
  onRarityRevealed?: (rarity: Rarity) => void;
  onMintResolved?: (data: MintRevealData) => void;
  onWalletConfirmed?: (txHash: string) => void;
}) {
  const [status, setStatus] = useState<MintStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const colors = RARITY_COLORS[rarity];

  useEffect(() => { onStatusChange?.(status); }, [status, onStatusChange]);

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
      const calldata = encodeMintFortune(fortune.text, fortune.cookieNumber);

      // ERC-8021 Base Builder Code attribution
      const builderCode = "bc_1o7xvetk";
      const codeBytes = new TextEncoder().encode(builderCode);
      const codeHex = Array.from(codeBytes).map(b => b.toString(16).padStart(2, "0")).join("");
      const codeLenHex = codeBytes.length.toString(16).padStart(4, "0");
      const suffix = codeLenHex + codeHex + "80218021802180218021802180218021";

      const hash: string = await eth.request({
        method: "eth_sendTransaction",
        params: [{ from: account, to: CONTRACT_ADDRESS, value: `0x${BigInt(MINT_PRICE).toString(16)}`, data: calldata + suffix }],
      });

      setTxHash(hash);
      setStatus("minting");
      onWalletConfirmed?.(hash);

      const receipt = await pollReceipt(eth, hash);

      // Parse FortuneMinted event for tokenId + rarity
      const fortuneLog = receipt.logs?.find((l: any) =>
        l.topics?.[0]?.toLowerCase() === FORTUNE_MINTED_TOPIC &&
        l.address?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
      );
      let revealedRarity: Rarity | null = null;
      let resolvedTokenId: string | null = null;
      if (fortuneLog) {
        if (fortuneLog.topics?.[2]) {
          resolvedTokenId = BigInt(fortuneLog.topics[2]).toString();
          setTokenId(resolvedTokenId);
        }
        const data: string = fortuneLog.data || "0x";
        if (data.length >= 2 + 64) {
          const rarityHex = data.slice(2, 2 + 64);
          const rarityIdx = parseInt(rarityHex, 16);
          revealedRarity = RARITY_BY_INDEX[rarityIdx] ?? "NORMAL";
        }
      }
      if (!fortuneLog || !revealedRarity) {
        // Fallback: ERC721 Transfer for tokenId; default rarity so reveal still proceeds
        const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
        const log = receipt.logs?.find((l: any) => l.topics?.[0]?.toLowerCase() === TRANSFER_TOPIC);
        if (log?.topics?.[3]) {
          resolvedTokenId = BigInt(log.topics[3]).toString();
          setTokenId(resolvedTokenId);
        }
      }
      // Always notify rarity (default NORMAL) so the post-mint UI never gets stuck
      const finalRarity = revealedRarity ?? "NORMAL";
      onRarityRevealed?.(finalRarity);
      onMintResolved?.({
        rarity: finalRarity,
        rarityColor: RARITY_COLORS[finalRarity].accent,
        tokenId: resolvedTokenId,
        txHash: hash,
      });

      setStatus("success");
    } catch (err: any) {
      setError(err.code === 4001 ? "Transaction rejected." : (err.message ?? "Mint failed."));
      setStatus("error");
    }
  }, [fortune, onMintResolved, onRarityRevealed, onWalletConfirmed]);

  const label: Record<MintStatus, string> = {
    idle: " Reveal Rarity • Mint on Base",
    switching_network: "Switching to Base…",
    awaiting_wallet: "Confirm in wallet…",
    minting: "Minting…",
    success: "✦ Minted!",
    error: "→ Try again",
  };

  const isIdle = status === "idle" || status === "error";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
      <button
        onClick={() => !isLoading && mint()}
        disabled={isLoading}
        style={{
          padding: "13px 30px",
          borderRadius: "999px",
          border: `1px solid ${colors.accent}`,
          background: isIdle ? colors.accent : "transparent",
          color: isIdle ? colors.text : colors.accent,
          fontFamily: "Georgia, serif",
          fontSize: "14px",
          fontWeight: 500,
          letterSpacing: "1px",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.6 : 1,
          boxShadow: `0 8px 24px ${colors.glow}, 0 0 32px ${colors.glow}`,
          transition: "transform 0.18s ease, box-shadow 0.2s ease, filter 0.2s ease",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={e => {
          if (isLoading) return;
          const b = e.currentTarget;
          b.style.transform = "translateY(-2px)";
          b.style.boxShadow = `0 12px 32px ${colors.glow}, 0 0 48px ${colors.glow}`;
          b.style.filter = "brightness(1.05)";
        }}
        onMouseLeave={e => {
          const b = e.currentTarget;
          b.style.transform = "translateY(0)";
          b.style.boxShadow = `0 8px 24px ${colors.glow}, 0 0 32px ${colors.glow}`;
          b.style.filter = "none";
        }}
        onMouseDown={e => { e.currentTarget.style.transform = "translateY(0) scale(0.97)"; }}
        onMouseUp={e => { e.currentTarget.style.transform = "translateY(-2px) scale(1)"; }}
      >
        {label[status]}
      </button>

      {isIdle && (
        <span style={{ fontSize: "12px", fontFamily: "Georgia, serif", color: colors.accent, opacity: 0.85, textAlign: "center" }}>
          Only minted fortunes reveal rarity (~$1 mint)
        </span>
      )}

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
          {tokenId && <a href={`https://opensea.io/assets/base/${CONTRACT_ADDRESS}/${tokenId}`} target="_blank" rel="noopener noreferrer" style={{ color: colors.accent, textDecoration: "underline" }}>VIEW ON OPENSEA ↗</a>}
        </div>
      )}

      {status === "error" && error && (
        <span style={{ fontSize: "10px", color: "#FF6B6B", opacity: 0.8, maxWidth: "280px", textAlign: "center" }}>{error}</span>
      )}
    </div>
  );
}
