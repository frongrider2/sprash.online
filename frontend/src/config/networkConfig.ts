import { createNetworkConfig } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID;
const PREDICTION_SYSTEM_ID = import.meta.env.VITE_PREDICTION_SYSTEM_ID;
const ADMIN_CAP_ID = import.meta.env.VITE_ADMIN_CAP_ID;

const { networkConfig, useNetworkVariable } = createNetworkConfig({
  testnet: {
    url: getFullnodeUrl('testnet'),
    variables: {
      packageId: PACKAGE_ID,
      predictionSystemId: PREDICTION_SYSTEM_ID,
      adminCapId: ADMIN_CAP_ID,
    },
  },
});

export { networkConfig, useNetworkVariable };
