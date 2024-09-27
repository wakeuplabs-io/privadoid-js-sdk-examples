import {
  buildVerifierId,
  core,
  CredentialStatusType,
  IdentityCreationOptions
} from '@0xpolygonid/js-sdk';

export const OPID_METHOD = 'opid';
export const OPID_BLOCKCHAIN = 'optimism';
export const OPID_CHAIN_ID_MAIN = 10;
export const OPID_CHAIN_ID_SEPOLIA = 11155420;
export const OPID_NETWORK_MAIN = 'main';
export const OPID_NETWORK_SEPOLIA = 'sepolia';

core.registerDidMethod(OPID_METHOD, 0b00000011);
core.registerDidMethodNetwork({
  method: OPID_METHOD,
  blockchain: OPID_BLOCKCHAIN,
  chainId: OPID_CHAIN_ID_SEPOLIA,
  network: OPID_NETWORK_SEPOLIA,
  networkFlag: 0b1000_0000 | 0b0000_0010
});
core.registerDidMethodNetwork({
  method: OPID_METHOD,
  blockchain: OPID_BLOCKCHAIN,
  chainId: OPID_CHAIN_ID_MAIN,
  network: OPID_NETWORK_MAIN,
  networkFlag: 0b1000_0000 | 0b0000_0001
});

export const RHS_URL = process.env.RHS_URL as string;
export const WALLET_KEY = process.env.WALLET_KEY as string;

export const TRANSFER_REQUEST_ID_SIG_VALIDATOR = 1;
export const TRANSFER_REQUEST_ID_MTP_VALIDATOR = 2;
export const TRANSFER_REQUEST_ID_V3 = 3;

export enum VerifierType {
  Universal = 'UniversalVerifier',
  ERC20 = 'ERC20Verifier',
  SelectiveDisclosure = 'SelectiveDisclosureVerifier'
}

export const ERC20_VERIFIER: VerifierType = VerifierType.ERC20;

// opt-sepolia example deployment
export const ERC20_VERIFIER_ADDRESS = '0xca6bfa62791d3c7c7ed1a5b320018c1C1dAC89Ee'; // Universal Verifier (0x102eB31F9f2797e8A84a79c01FFd9aF7D1d9e556) or ERC20 Verifier (0xca6bfa62791d3c7c7ed1a5b320018c1C1dAC89Ee)  or SelectiveDisclosureVerifier (0x9B786F6218FFF6d9742f22426cF4bDDC6F8cb9f8)
export const ERC20_ZK_AIRDROP_ADDRESS = '0xca6bfa62791d3c7c7ed1a5b320018c1C1dAC89Ee'; // ERC20 Embedded (0xca6bfa62791d3c7c7ed1a5b320018c1C1dAC89Ee) or ERC20 Universally linked (0x76A9d02221f4142bbb5C07E50643cCbe0Ed6406C) or ERC20 Selective disclosure (0x9B786F6218FFF6d9742f22426cF4bDDC6F8cb9f8)

export const ERC20_VERIFIER_ID = buildVerifierId(ERC20_VERIFIER_ADDRESS, {
  blockchain: OPID_BLOCKCHAIN,
  networkId: OPID_NETWORK_SEPOLIA,
  method: OPID_METHOD
});
export const ERC20_VERIFIER_DID = core.DID.parseFromId(ERC20_VERIFIER_ID);

export const DEFAULT_NETWORK_CONNECTION = {
  rpcUrl: process.env.RPC_URL as string,
  contractAddress: process.env.CONTRACT_ADDRESS as string
};

export const DEFAULT_IDENTITY_CREATION_OPTIONS: IdentityCreationOptions = {
  method: OPID_METHOD,
  blockchain: OPID_BLOCKCHAIN,
  networkId: OPID_NETWORK_SEPOLIA,
  revocationOpts: {
    type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
    id: RHS_URL
  }
};

export const CIRCUITS_FOLDER = process.env.CIRCUITS_PATH as string;
export const MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION as string;
