import dotenv from 'dotenv';
dotenv.config();

const config = {
  circuitsFolder: process.env.CIRCUITS_PATH ?? '',
  mongoConnString: process.env.MONGO_DB_CONNECTION ?? '',
  rpcUrl: process.env.RPC_URL ?? '',
  chainId: process.env.RHS_CHAIN_ID ? +process.env.RHS_CHAIN_ID : undefined,
  stateContractAddress: process.env.CONTRACT_ADDRESS ?? '',
  mongoTableName: process.env.MONGO_DB_TABLE_NAME ?? ''
};
const onchainRhsConfig = {};
const offchainRhsConfig = {};

export { onchainRhsConfig, offchainRhsConfig, config };
