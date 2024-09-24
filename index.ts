/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
import {
  EthStateStorage,
  CredentialRequest,
  CircuitId,
  ZeroKnowledgeProofRequest,
  AuthorizationRequestMessage,
  PROTOCOL_CONSTANTS,
  AuthHandler,
  core,
  CredentialStatusType,
  IdentityCreationOptions,
  ProofType,
  AuthorizationRequestMessageBody,
  byteEncoder
} from '@0xpolygonid/js-sdk';

import {
  initInMemoryDataStorageAndWallets,
  initCircuitStorage,
  initProofService,
  initPackageManager,
  initMongoDataStorageAndWallets
} from './walletSetup';

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { generateRequestData } from './request';
dotenv.config();

const rhsUrl = process.env.RHS_URL as string;
const walletKey = process.env.WALLET_KEY as string;
const OPID_METHOD = 'opid';

core.registerDidMethod(OPID_METHOD, 0b00000011);
core.registerDidMethodNetwork({
  method: OPID_METHOD,
  blockchain: 'optimism',
  chainId: 11155420,
  network: 'sepolia',
  networkFlag: 0b1000_0000 | 0b0000_0010
});
core.registerDidMethodNetwork({
  method: OPID_METHOD,
  blockchain: 'optimism',
  chainId: 10,
  network: 'main',
  networkFlag: 0b1000_0000 | 0b0000_0001
});

const defaultNetworkConnection = {
  rpcUrl: process.env.RPC_URL as string,
  contractAddress: process.env.CONTRACT_ADDRESS as string
};

export const defaultIdentityCreationOptions: IdentityCreationOptions = {
  method: OPID_METHOD,
  blockchain: 'optimism',
  networkId: 'sepolia',
  revocationOpts: {
    type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
    id: rhsUrl
  }
};

function createKYCAgeCredential(did: core.DID) {
  const credentialRequest: CredentialRequest = {
    credentialSchema:
      'https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json/KYCAgeCredential-v3.json',
    type: 'KYCAgeCredential',
    credentialSubject: {
      id: did.string(),
      birthday: 10,
      documentType: 99
    },
    expiration: 12345678888,
    revocationOpts: {
      type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
      id: rhsUrl
    }
  };
  return credentialRequest;
}

function createKYCAgeCredentialRequest(
  circuitId: CircuitId,
  credentialRequest: CredentialRequest
): ZeroKnowledgeProofRequest {
  const proofReqSig: ZeroKnowledgeProofRequest = {
    id: 1,
    circuitId: CircuitId.AtomicQuerySigV2,
    optional: false,
    query: {
      allowedIssuers: ['*'],
      type: credentialRequest.type,
      context:
        'https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld',
      credentialSubject: {
        documentType: {
          $eq: 99
        }
      }
    }
  };

  const proofReqMtp: ZeroKnowledgeProofRequest = {
    id: 1,
    circuitId: CircuitId.AtomicQueryMTPV2,
    optional: false,
    query: {
      allowedIssuers: ['*'],
      type: credentialRequest.type,
      context:
        'https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld',
      credentialSubject: {
        birthday: {
          $lt: 20020101
        }
      }
    }
  };

  switch (circuitId) {
    case CircuitId.AtomicQuerySigV2:
      return proofReqSig;
    case CircuitId.AtomicQueryMTPV2:
      return proofReqMtp;
    default:
      return proofReqSig;
  }
}

async function submitZkResponse(useMongoStore = false) {
  // console.log('=============== generate proofs ===============');

  let dataStorage, credentialWallet, identityWallet;
  if (useMongoStore) {
    ({ dataStorage, credentialWallet, identityWallet } = await initMongoDataStorageAndWallets(
      defaultNetworkConnection
    ));
  } else {
    ({ dataStorage, credentialWallet, identityWallet } = await initInMemoryDataStorageAndWallets(
      defaultNetworkConnection
    ));
  }

  const circuitStorage = await initCircuitStorage();
  const proofService = await initProofService(
    identityWallet,
    credentialWallet,
    dataStorage.states,
    circuitStorage
  );

  const { did: userDID, credential: authBJJCredentialUser } = await identityWallet.createIdentity({
    ...defaultIdentityCreationOptions
  });

  console.log('=============== user did ===============');
  console.log(userDID.string());

  const { did: issuerDID, credential: issuerAuthBJJCredential } =
    await identityWallet.createIdentity({ ...defaultIdentityCreationOptions });

  const credentialRequest = createKYCAgeCredential(userDID);
  const credential = await identityWallet.issueCredential(issuerDID, credentialRequest);

  await dataStorage.credential.saveCredential(credential);

  console.log('================= generate Iden3SparseMerkleTreeProof =======================');

  const res = await identityWallet.addCredentialsToMerkleTree([credential], issuerDID);

  console.log('================= push states to rhs ===================');

  await identityWallet.publishRevocationInfoByCredentialStatusType(
    issuerDID,
    CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
    { rhsUrl }
  );

  console.log('================= publish to blockchain ===================');

  const ethSigner = new ethers.Wallet(walletKey, (dataStorage.states as EthStateStorage).provider);
  const txId = await proofService.transitState(
    issuerDID,
    res.oldTreeState,
    true,
    dataStorage.states,
    ethSigner
  );
  console.log(txId);

  console.log('================= generate credentialAtomicSigV2OnChain ===================');

  const proofReqSig: ZeroKnowledgeProofRequest = createKYCAgeCredentialRequest(
    CircuitId.AtomicQuerySigV2OnChain,
    credentialRequest
  );
  const metadata = {
    id: '7f38a193-0918-4a48-9fac-36adfdb8b542',
    typ: 'application/iden3comm-plain-json',
    type: 'https://iden3-communication.io/proofs/1.0/contract-invoke-request',
    thid: '7f38a193-0918-4a48-9fac-36adfdb8b542',
    body: {
      reason: 'airdrop participation',
      transaction_data: {
        contract_address: '0x76A9d02221f4142bbb5C07E50643cCbe0Ed6406C',
        method_id: 'b68967e2',
        chain_id: 11155420,
        network: 'opt-sepolia'
      },
      scope: [
        {
          id: 0,
          circuitId: 'credentialAtomicQuerySigV2OnChain',
          query: {
            allowedIssuers: ['*'],
            context:
              'https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld',
            credentialSubject: { birthday: { $lt: 20020101 } },
            type: 'KYCAgeCredential'
          }
        }
      ]
    }
  };
  const query = {
    requestId: 0,
    schema: '74977327600848231385663280181476307657',
    claimPathKey: '20376033832371109177683048456014525905119173674985843915445634726167450989630',
    operator: 2,
    slotIndex: 0,
    value: [
      20020101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0
    ],
    circuitIds: ['credentialAtomicQuerySigV2OnChain'],
    skipClaimRevocationCheck: false,
    claimPathNotExists: 0,
    queryHash: '15045271939084694661437431358729281571840804299863053791890179002991342242959'
  };

  const {
    proof: proofSig,
    pub_signals: proofSigInputs,
    id,
    circuitId
  } = await proofService.generateProof(
    {
      id: 0,
      requestId: 0,
      circuitId: 'credentialAtomicQuerySigV2OnChain',
      optional: false,
      query: {
        allowedIssuers: ['*'],
        context:
          'https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld',
        credentialSubject: { birthday: { $lt: 20020101 } },
        type: 'KYCAgeCredential'
      }
    } as any,
    userDID,
    // core.DID.parse('did:opid:optimism:sepolia:475QzRMnQMtarEDfaM3VbnYjo4WpsLmsm1HAvTkW25'),
    {
      challenge: BigInt('1372133569577688864461476957267755639645351728375'),
      skipRevocation: false
    }
  );

  console.log('sigProof', id, circuitId, proofSig, proofSigInputs);

  const sigProofOk = await proofService.verifyProof(
    { proof: proofSig, pub_signals: proofSigInputs },
    CircuitId.AtomicQuerySigV2OnChain
  );
  console.log('valid: ', sigProofOk);

  console.log('================= submit proofs ===============');

  // const UNIVERSAL_VERIFIER_ADDRESS = '0x65B5eF89aD1D9f1386254aD0230C8ac91681b295';
  // const universalVerifier = new ethers.Contract(
  //   UNIVERSAL_VERIFIER_ADDRESS,
  //   UniversalVerifierAbi,
  //   ethSigner
  // );

  // const requestId = 1; // mtp
  // const inputs: string[] = proofMtpInputs;
  // const proof_a: string[] = proofMTP.pi_a;
  // const proof_b: string[][] = proofMTP.pi_b;
  // const proof_c: string[] = proofMTP.pi_c;

  // // console.log('getting status');
  // const status = await universalVerifier.getProofStatus(ethSigner.address, requestId);
  // console.log('status: ', status);

  // console.log('submitting mtp proofs', requestId, inputs, proof_a, proof_b, proof_c);

  // const tx = await universalVerifier.verifyZKPResponse(
  //   requestId,
  //   inputs,
  //   proof_a.slice(0, 2),
  //   proof_b.slice(0, 2),
  //   proof_c.slice(0, 2),
  //   await ethSigner.getAddress()
  // );
  // console.log('tx: ', tx);
}

async function main(choice: string) {
  switch (choice) {
    case 'submitZkResponse':
      await submitZkResponse();
      break;

    default:
      // default run all
      await submitZkResponse();
  }
}

(async function () {
  const args = process.argv.slice(2);
  await main(args[0]);
})();
