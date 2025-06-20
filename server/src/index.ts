import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { mnemonicToSeed } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import {
  SuiPriceServiceConnection,
  SuiPythClient,
} from '@pythnetwork/pyth-sui-js';
import 'dotenv/config';
import { connectToMongoDB } from './services/db-client.service';
import { createPrediction } from './services/prediction.service';

// Configuration
const PYTH_PRICE_SERVICE_URL = process.env.PYTH_PRICE_SERVICE_URL as string;
const SUI_USDT_PRICE_ID = process.env.SUI_USDT_PRICE_ID as string;
const RPC_URL = process.env.RPC_URL as string;
const ROUND_INTERVAL = +(process.env.ROUND_INTERVAL || 300 * 1000); // 5 minutes

console.log(ROUND_INTERVAL);

const clockObj = '0x6';

const PACKAGE_ID = process.env.PACKAGE_ID as string;
const PREDICTION_SYSTEM_ID = process.env.PREDICTION_SYSTEM_ID as string;
const ADMIN_CAP_ID = process.env.ADMIN_CAP_ID as string;

// Validate required environment variables
if (!PREDICTION_SYSTEM_ID || !ADMIN_CAP_ID || !RPC_URL) {
  throw new Error(
    'Missing required environment variables: PREDICTION_SYSTEM_ID, ADMIN_CAP_ID, and RPC_URL are required'
  );
}

// Load admin keypair from mnemonic (store this securely in production)
const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY as string;
if (!adminPrivateKey) {
  throw new Error('ADMIN_PRIVATE_KEY environment variable is required');
}

const adminKeypair = decodeSuiPrivateKey(adminPrivateKey);
const ed25519Keypair = Ed25519Keypair.fromSecretKey(adminKeypair.secretKey);
const adminAddress = ed25519Keypair.toSuiAddress();

const pythStateId =
  '0x243759059f4c3111179da5878c12f68d612c21a8d54d85edc86164bb18be1c7c';

const wormholeStateId =
  '0x31358d198147da50db32eda2562951d53973a0c0ad5ed738e9b17d88b213d790';

const suiClient = new SuiClient({ url: RPC_URL });

// Initialize Pyth client
const pythClient = new SuiPythClient(suiClient, pythStateId, wormholeStateId);
// Initialize clients
const pythConnection = new SuiPriceServiceConnection(PYTH_PRICE_SERVICE_URL);

const getBalance = async () => {
  try {
    const balance = await suiClient.getBalance({
      owner: adminAddress,
      coinType: '0x2::sui::SUI',
    });
    return balance;
  } catch (error) {
    console.error('Error getting balance:', error);
    throw error;
  }
};

const saveObjectId = async (txBlock: any) => {
  try {
    const objectChanges = txBlock.objectChanges;
    console.log(JSON.stringify(objectChanges));
    for (const objectChange of objectChanges) {
      if (
        objectChange.type === 'created' &&
        objectChange.objectType.includes('dashboard::Round')
      ) {
        const objectId = objectChange.objectId;
        await createPrediction(objectId);
      }
    }
  } catch (error) {
    console.error('Error saving objectId:', error);
  }
};

const startGenesis = async () => {
  try {
    console.log('Starting genesis round...');

    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::dashboard::start_genesis`,
      arguments: [
        tx.object(PREDICTION_SYSTEM_ID),
        tx.object(ADMIN_CAP_ID),
        tx.object(clockObj),
      ],
    });

    tx.setGasBudget(10_000_000);

    const result = await suiClient.signAndExecuteTransaction({
      signer: ed25519Keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true,
        showBalanceChanges: true,
      },
    });

    // Check transaction status
    const txBlock = await suiClient.getTransactionBlock({
      digest: result.digest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    saveObjectId(txBlock);

    if (txBlock.effects?.status?.status === 'failure') {
      throw new Error(`Transaction failed: ${txBlock.effects.status.error}`);
    }

    console.log('Genesis started successfully!');
    console.log('Transaction digest:', result.digest);
    return result;
  } catch (error) {
    console.error('Error starting genesis:', error);
    throw error;
  }
};

const lockGenesis = async () => {
  try {
    console.log('Starting lock round...');

    const tx = new Transaction();

    const priceUpdateData = await pythConnection.getPriceFeedsUpdateData([
      SUI_USDT_PRICE_ID,
    ]);

    if (!priceUpdateData || priceUpdateData.length === 0) {
      throw new Error('No price feeds available');
    }

    const priceInfoObjectIds = await pythClient.updatePriceFeeds(
      tx,
      priceUpdateData,
      [SUI_USDT_PRICE_ID]
    );

    // console.log(priceInfoObjectIds);

    tx.moveCall({
      target: `${PACKAGE_ID}::dashboard::lock_genesis`,
      arguments: [
        tx.object(PREDICTION_SYSTEM_ID),
        tx.object(ADMIN_CAP_ID),
        tx.object(priceInfoObjectIds[0]),
        tx.object(clockObj),
      ],
    });

    tx.setGasBudget(10_000_000);

    const result = await suiClient.signAndExecuteTransaction({
      signer: ed25519Keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });
    // Check transaction status
    const txBlock = await suiClient.getTransactionBlock({
      digest: result.digest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    saveObjectId(txBlock);

    if (txBlock.effects?.status?.status === 'failure') {
      throw new Error(`Transaction failed: ${txBlock.effects.status.error}`);
    }

    console.log('Genesis locked successfully!');
    console.log('Transaction digest:', result.digest);
    return result;
  } catch (error) {
    console.error('Error locking genesis:', error);
    throw error;
  }
};

const executeRound = async () => {
  const now = Date.now();
  console.log(`${now} execute round`);
  try {
    const tx = new Transaction();

    const priceUpdateData = await pythConnection.getPriceFeedsUpdateData([
      SUI_USDT_PRICE_ID,
    ]);

    if (!priceUpdateData || priceUpdateData.length === 0) {
      throw new Error('No price feeds available');
    }

    const priceInfoObjectIds = await pythClient.updatePriceFeeds(
      tx,
      priceUpdateData,
      [SUI_USDT_PRICE_ID]
    );

    tx.moveCall({
      target: `${PACKAGE_ID}::dashboard::execute_round`,
      arguments: [
        tx.object(PREDICTION_SYSTEM_ID),
        tx.object(ADMIN_CAP_ID),
        tx.object(priceInfoObjectIds[0]),
        tx.object(clockObj),
      ],
    });

    tx.setGasBudget(10_000_000);

    const result = await suiClient.signAndExecuteTransaction({
      signer: ed25519Keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    // Check transaction status
    const txBlock = await suiClient.getTransactionBlock({
      digest: result.digest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    saveObjectId(txBlock);

    if (txBlock.effects?.status?.status === 'failure') {
      throw new Error(`Transaction failed: ${txBlock.effects.status.error}`);
    }

    console.log('Round executed successfully!');
    console.log('Transaction digest:', result.digest);
    return result;
  } catch (error) {
    console.error('Error executing round:', error);
    throw error;
  }
};

const claimTreasury = async () => {
  try {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::dashboard::claim_treasury`,
      arguments: [tx.object(PREDICTION_SYSTEM_ID), tx.object(ADMIN_CAP_ID)],
    });

    tx.setGasBudget(10_000_000);

    const result = await suiClient.signAndExecuteTransaction({
      signer: ed25519Keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    // Check transaction status
    const txBlock = await suiClient.getTransactionBlock({
      digest: result.digest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    if (txBlock.effects?.status?.status === 'failure') {
      throw new Error(`Transaction failed: ${txBlock.effects.status.error}`);
    }

    console.log('Treasury claimed successfully!');
    console.log('Transaction digest:', result.digest);
    return result;
  } catch (error) {
    console.error('Error claiming treasury:', error);
  }
};

const getPriceFromOracle = async () => {
  try {
    const tx = new Transaction();

    const priceUpdateData = await pythConnection.getPriceFeedsUpdateData([
      SUI_USDT_PRICE_ID,
    ]);

    if (!priceUpdateData || priceUpdateData.length === 0) {
      throw new Error('No price feeds available');
    }

    // console.log(priceFeeds[0]);

    const priceInfoObjectIds = await pythClient.updatePriceFeeds(
      tx,
      priceUpdateData,
      [SUI_USDT_PRICE_ID]
    );

    tx.moveCall({
      target: `${PACKAGE_ID}::dashboard::get_price_from_oracle`,
      arguments: [
        tx.object(ADMIN_CAP_ID),
        tx.object(clockObj),
        tx.object(priceInfoObjectIds[0]),
      ],
    });

    tx.setGasBudget(10_000_000);

    const result = await suiClient.signAndExecuteTransaction({
      signer: ed25519Keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    // Check transaction status
    const txBlock = await suiClient.getTransactionBlock({
      digest: result.digest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    if (txBlock.effects?.status?.status === 'failure') {
      throw new Error(`Transaction failed: ${txBlock.effects.status.error}`);
    }

    console.log('Got price from oracle successfully!');
    console.log('Transaction digest:', result.digest);
    return result;
  } catch (error) {
    console.error('Error getting price from oracle:', error);
    throw error;
  }
};

const getCurrentRoundId = async () => {
  try {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::dashboard::get_current_round_id`,
      arguments: [tx.object(PREDICTION_SYSTEM_ID)],
    });

    tx.setGasBudget(10_000_000);

    const result = await suiClient.signAndExecuteTransaction({
      signer: ed25519Keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    // Check transaction status
    const txBlock = await suiClient.getTransactionBlock({
      digest: result.digest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    if (txBlock.effects?.status?.status === 'failure') {
      throw new Error(`Transaction failed: ${txBlock.effects.status.error}`);
    }

    console.log('Got current round successfully!');
    console.log('Transaction digest:', result.digest);
    return result;
  } catch (error) {
    console.error('Error getting current round:', error);
    throw error;
  }
};

const getCurrentRound = async (roundId: number) => {
  try {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::dashboard::get_round`,
      arguments: [tx.object(PREDICTION_SYSTEM_ID), tx.pure.u64(roundId)],
    });

    tx.setGasBudget(10_000_000);

    const result = await suiClient.signAndExecuteTransaction({
      signer: ed25519Keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    // Check transaction status
    const txBlock = await suiClient.getTransactionBlock({
      digest: result.digest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    if (txBlock.effects?.status?.status === 'failure') {
      throw new Error(`Transaction failed: ${txBlock.effects.status.error}`);
    }

    console.log('Got round successfully!');
    console.log('Transaction digest:', result.digest);
    return result;
  } catch (error) {
    console.error('Error getting round:', error);
    throw error;
  }
};

const checkTreasury = async () => {
  try {
    const predictionSystem = await suiClient.getObject({
      id: PREDICTION_SYSTEM_ID,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (
      predictionSystem.data &&
      predictionSystem.data?.content &&
      predictionSystem.data?.content?.dataType === 'moveObject'
    ) {
      const fields = (predictionSystem.data.content as any).fields as any;
      // console.log(fields);
      if (fields) {
        const treasuryAmount = fields.treasury_amount;

        const treasuryPass = treasuryAmount / 10e9;

        if (+treasuryPass > 0.001) {
          await claimTreasury();
        }
      }
    }
  } catch (error) {
    console.error('Error checking treasury:', error);
  }
};

const checkStatus = async () => {
  try {
    const predictionSystem = await suiClient.getObject({
      id: PREDICTION_SYSTEM_ID,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (
      predictionSystem.data &&
      predictionSystem.data?.content &&
      predictionSystem.data?.content?.dataType === 'moveObject'
    ) {
      const fields = (predictionSystem.data.content as any).fields as any;
      // console.log(fields);
      if (fields) {
        const genesis_start = fields.genesis_start;
        const genesis_lock = fields.genesis_lock;

        return {
          isSuccess: true,
          genesis_start,
          genesis_lock,
        };
      }
    }
  } catch (error) {
    throw error;
  }
};

const runPredictionSystem = async () => {
  await connectToMongoDB();
  const status = await checkStatus();
  if (!status) {
    return;
  }

  if (!status.isSuccess) {
    return;
  }

  console.log({ genesis_start: status.genesis_start });
  console.log({ genesis_lock: status.genesis_lock });

  try {
    // Start genesis round
    console.log('Starting prediction system...');
    if (!status.genesis_start && !status.genesis_lock) {
      await startGenesis();
    }

    // Wait for first round interval
    console.log(`Waiting ${ROUND_INTERVAL}ms before locking genesis round...`);

    // Lock genesis round
    console.log('Locking genesis round...');
    if (!status.genesis_start && !status.genesis_lock) {
      await new Promise((resolve) => setTimeout(resolve, ROUND_INTERVAL + 200));
      await lockGenesis();
    }

    if (!status.genesis_start && !status.genesis_lock) {
      await new Promise((resolve) => setTimeout(resolve, ROUND_INTERVAL));
    }

    // Start continuous execution loop
    while (true) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 200));
        console.log('Executing round...');
        await executeRound();
        setTimeout(() => {
          checkTreasury();
        }, 1000);

        console.log(`Waiting ${ROUND_INTERVAL}ms until next round...`);

        await new Promise((resolve) => setTimeout(resolve, ROUND_INTERVAL));
      } catch (error) {
        console.error('Error in execution loop:', error);
      }
    }
  } catch (error) {
    console.error('Fatal error in prediction system:', error);
    throw error;
  }
};

// Start the prediction system
runPredictionSystem().catch(console.error);

// getPriceFromOracle().catch(console.error);

// lockGenesis().catch(console.error);

// checkTreasury().catch(console.error);
