// config.js

const config = {
  rpcUrl: import.meta.env.VITE_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS || '0xYOUR_DEPLOYED_CONTRACT_ADDRESS',
  walletKey: import.meta.env.VITE_WALLET_KEY || '', // leave empty for read-only mode
};

export default config;