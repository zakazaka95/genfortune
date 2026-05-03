# 🥠 GenFortune

**AI consensus → onchain moment → NFT**

GenFortune is an onchain app where content is not uploaded, but created at the moment of interaction.

Each mint is generated in real time by multiple independent AI validators on GenLayer, reaches consensus, and is then permanently recorded on Base as an NFT.

What you mint did not exist before the transaction.
It cannot be reproduced.

---

## ✨ What makes it different

* No prewritten content
* No single AI model in control
* No randomness deciding rarity

Instead:

* Multiple AI validators generate the result independently
* Consensus determines the final output and rarity
* The NFT represents a one time, unrepeatable moment

---

## ⚙️ How it works

1. User opens a cookie and submits an optional theme
2. AI validators generate fortunes independently
3. Validators reach consensus on:

   * message
   * rarity
4. Result is returned onchain
5. User mints it on Base as an NFT

---

## 🧠 Core concept

> NFTs should not store files. They should store moments.

GenFortune turns Base into a settlement layer for AI generated, consensus verified content.

Each NFT is:

* created at execution
* verified at generation
* finalized onchain

---

## 💎 Rarity system

Strict distribution enforced at generation:

* NORMAL → 60%
* RARE → 29%
* UNIQUE → 10.9%
* LEGENDARY → 0.1%

Legendary outputs follow stricter rules and are intentionally rare.

---

## 🏗 Architecture

* **GenLayer**
  AI consensus layer
  Handles generation and validation

* **Base**
  Settlement layer
  Stores final NFT

* **Smart Contract**
  Orchestrates interaction, validation, and state

---

## 🔴 Live

* 🌐 App: [https://genfortune.xyz](https://genfortune.xyz)
* ⛓ Network: Base mainnet
* 🧾 Standard: ERC 8021 attribution

---

## 🎬 Demo

Full flow from interaction to mint available in the demo video.

https://youtu.be/Y__3nbu1pjM
---

## 🔁 Example flow

Open cookie →
AI generates →
Consensus reached →
Result returned →
Mint →
Moment becomes permanent

---

## 🎯 Why this matters

Most NFTs are static assets uploaded to the chain.

GenFortune introduces a different model:

Content is created at the moment of interaction and verified before it exists.

This unlocks a new category of applications where:

* output is unpredictable but verifiable
* rarity is enforced, not assigned
* ownership represents a unique event, not a file

---

## 🛠 Contract

Built with GenLayer’s nondeterministic execution model.

Core logic:

* prompt execution
* validator agreement
* rarity enforcement
* state tracking

---

## 📄 License

MIT

---
