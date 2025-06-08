# Sui Wallet Server

This server provides functionality for interacting with the Sui blockchain, including wallet management and Pyth price feed integration.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
# Sui Wallet Configuration
SUI_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
SUI_NETWORK_URL=https://fullnode.mainnet.sui.io:443
```

Replace `YOUR_PRIVATE_KEY_HERE` with your actual Sui private key.

## Wallet Configuration

The system uses the `@mysten/sui.js` library to create a wallet from a private key. The implementation is in `src/utils/walletUtils.ts`.

```typescript
import { SignerWithProvider, getWallet } from "./utils/walletUtils";

// Get a wallet instance from your private key in .env
const wallet: SignerWithProvider = getWallet();
```

## Usage

Run the server in development mode:
```bash
npm run dev
```

Build and run in production:
```bash
npm run build
npm start
```

## Features

- Private key wallet management
- Sui blockchain interaction
- Pyth price feed integration 

<!-- sui client switch --env testnet -->

<!-- sui client publish --skip-dependency-verification --silence-warnings -->


sui client call \
 --package 0xbb7bae2a93e36d26f0a0f60e4d28d5260a966fd223305733c9d49c86afcde9b2 \
 --module prediction \
 --function new_prediction_system \
 --args 0x7a3d82ca01992bd77d82a5590def2b48e9f91abd460bd7ac9d74531ee83fd15c \ "50c67b3fd225db8912a424dd4baed60ffdde625ed2feaaf283724f9608fea266"


<!-- simple decentralized prediction market -->

<!-- docker compose -f docker-compose-local.yml up -d --build -->