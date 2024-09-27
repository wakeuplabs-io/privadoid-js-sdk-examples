import { CredentialStatusType, IdentityCreationOptions } from '@wakeuplabs/opid-sdk';
import dotenv from 'dotenv';
dotenv.config();

const OPID_METHOD = 'opid';

const config = {
  circuitsFolder: process.env.CIRCUITS_PATH ?? '',
  mongoConnString: process.env.MONGO_DB_CONNECTION ?? '',
  rpcUrl: process.env.RPC_URL ?? '',
  chainId: process.env.RHS_CHAIN_ID ? +process.env.RHS_CHAIN_ID : undefined,
  stateContractAddress: process.env.CONTRACT_ADDRESS ?? '',
  mongoTableName: process.env.MONGO_DB_TABLE_NAME ?? '',
  verifierDID: process.env.VERIFIER_DID ?? '',
  rhsUrl: process.env.RHS_URL ?? '',
  rhsAddress: process.env.RHS_ADDRESS ?? '',
  walletKey: process.env.WALLET_KEY ?? '',
  thirdPartyWallet: process.env.THIRD_PARTY_WALLET_KEY ?? ''
};
const onchainRhsConfig: {
  credentialType: CredentialStatusType;
  identityCreationOptions: IdentityCreationOptions;
} = {
  credentialType: CredentialStatusType.Iden3OnchainSparseMerkleTreeProof2023,
  identityCreationOptions: {
    method: OPID_METHOD,
    blockchain: 'optimism',
    networkId: 'sepolia',
    revocationOpts: {
      type: CredentialStatusType.Iden3OnchainSparseMerkleTreeProof2023,
      id: config.rhsAddress
    }
  }
};
const offchainRhsConfig: {
  credentialType: CredentialStatusType;
  identityCreationOptions: IdentityCreationOptions;
} = {
  credentialType: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
  identityCreationOptions: {
    method: OPID_METHOD,
    blockchain: 'optimism',
    networkId: 'sepolia',
    revocationOpts: {
      type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
      id: config.rhsUrl
    }
  }
};
export { onchainRhsConfig, offchainRhsConfig, config };
