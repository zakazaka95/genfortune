# 🥠 GenFortune
**AI consensus → onchain moment → NFT**

GenFortune is an onchain app where content is not uploaded, but created at the moment of interaction.

Each fortune is generated in real time on GenLayer, verified through AI consensus, and permanently minted on Base as an NFT with rarity revealed at mint time.

What you mint did not exist before the transaction. It cannot be reproduced.

---

## What makes it different

- No prewritten content
- No single AI model in control
- No off-chain randomness deciding rarity

Instead:
- Multiple AI validators independently evaluate the leader's output
- Consensus determines whether the fortune is valid and relevant
- Rarity is derived on-chain at mint time using block entropy — the AI has zero influence over it
- The NFT represents a one-time, unrepeatable moment

---

## How it works

1. User opens a cookie and submits an optional keyword
2. Leader node generates a fortune via LLM
3. Validators evaluate the leader's result against:
   - Structural validity (message present, under word limit)
   - Semantic relevance (binary yes/no: does this fortune relate to the keyword?)
4. Consensus is reached on the fortune text
5. User mints on Base — rarity is derived from block entropy at mint time
6. NFT is permanently recorded on Base with on-chain SVG metadata

---

## Core concept

> NFTs should not store files. They should store moments.

GenFortune turns Base into a settlement layer for AI generated, consensus verified content.

Each NFT is:
- Created at execution
- Verified at generation
- Finalized onchain with rarity determined by the chain, not the AI

---

## Rarity system

Rarity is derived deterministically on the NFT contract at mint time using:

    keccak256(blockhash(block.number - 1), msg.sender, tokenId) % 1000

Distribution:
- NORMAL: 60%
- RARE: 29%
- UNIQUE: 10.9%
- LEGENDARY: 0.1%

The GenLayer leader node has zero influence over rarity. Fortune text and rarity are intentionally separated — GenLayer handles text, Base handles rarity.

---

## Validator approach

The validator uses a non-comparative, evaluative approach.

Validators do NOT regenerate a fortune and compare. That would cause rotations and UNDETERMINED transactions because validators can never agree on random generative output.

Instead validators evaluate the leader's result:
1. Is the message present and under the word limit?
2. Does the fortune relate meaningfully to the keyword? (yes/no)

This is what GenLayer's Equivalence Principle describes as qualitative evaluation. Independent yes/no judgments converge in consensus. Independent generative outputs never would.

---

## Architecture

**GenLayer (Studio, chain 61999)**
- AI consensus layer
- Handles fortune generation and evaluative validation
- Contract: 0xf8D9d0f01002D594252f510a70B5E05d844519C7

**Base Mainnet**
- Settlement layer
- NFT contract with on-chain SVG metadata and block entropy rarity
- NFT contract: 0x33007651eb41c8E2115C2c9Dc65C68d2c05F239B
- Marketplace contract: 0x6BBCb924742f74106d1b6e7d96DD65249425B193

---

## Live

- App: https://genfortune.xyz
- Marketplace: https://genmarket.app
- Network: Base mainnet + GenLayer Studio

---

## Example flow

    Open cookie
    AI generates fortune text
    Validators evaluate relevance
    Consensus reached
    User mints on Base
    Rarity revealed from block entropy
    Moment becomes permanent

---

## Why this matters

Most NFTs are static assets uploaded to the chain.

GenFortune introduces a different model: content is created at the moment of interaction, verified by independent AI validators before it exists, and rarity is determined by the chain itself.

This unlocks a new category of applications where:
- Output is unpredictable but verifiable
- Rarity is enforced by the chain, not assigned by the AI
- Ownership represents a unique event, not a file

---

## Contracts

**GenLayer contract**
- Non-comparative evaluative validator
- Fortune text generation via LLM with keyword relevance consensus
- Owner controls: price, pause, withdraw, ownership transfer

**NFT contract**
- On-chain SVG metadata, no IPFS
- Rarity derived from block entropy at mint time
- ERC-721 on Base mainnet

**Marketplace contract**
- List, buy, cancel fortunes
- 5% fee to treasury
- Upgradeable NFT contract address

---

## License

MIT
