import {
  Contract,
  TransactionBuilder,
  Networks,
  Address,
  scValToNative,
  BASE_FEE,
  rpc,
  xdr,
} from '@stellar/stellar-sdk';
import {
  isConnected,
  requestAccess,
  getAddress,
  signTransaction,
} from '@stellar/freighter-api';

export const CONTRACT_ID = 'CA6TAL73HFMBZGJFU27IIMF7LAHGSNE7CMIYM4X77WNXOUOGKVPTPVZK'; // Updated to Nebula Archive contract
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';

const server = new rpc.Server(SOROBAN_RPC_URL);

// ---------- wallet ----------

export async function isFreighterInstalled() {
  try {
    const r = await isConnected();
    return !r.error;
  } catch {
    return false;
  }
}

export async function getPublicKey() {
  let res = await getAddress();
  if (res.error || !res.address) {
    res = await requestAccess();
    if (res.error || !res.address) {
      throw new Error(res.error?.message || 'Could not get wallet address from Freighter.');
    }
  }
  return res.address;
}

// ---------- helpers ----------

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function addressScVal(publicKey) {
  return Address.fromString(publicKey).toScVal();
}

async function simulateRead(methodName, ...args) {
  // Use a well-known account as source for simulation if needed.
  // We'll use the user's address if possible.
  let sourceAddr = 'GAVK7...'; // Fallback
  try {
    sourceAddr = await getPublicKey();
  } catch { /* ignore */ }

  const source = await server.getAccount(sourceAddr);
  const contract = new Contract(CONTRACT_ID);

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(methodName, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error || `Simulation failed for ${methodName}`);
  }

  const retval = sim.result?.retval;
  return retval ? scValToNative(retval) : null;
}

async function invokeWrite(publicKey, methodName, ...args) {
  const account = await server.getAccount(publicKey);
  const contract = new Contract(CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(methodName, ...args))
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(tx);

  const signed = await signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: publicKey,
  });
  if (signed.error) throw new Error(signed.error.message || 'User rejected signing');

  const signedTx = TransactionBuilder.fromXDR(signed.signedTxXdr, NETWORK_PASSPHRASE);
  const send = await server.sendTransaction(signedTx);

  if (send.status === 'ERROR') {
    throw new Error(`Send failed: ${send.errorResult?.result?.switch?.().name || 'unknown'}`);
  }

  // Poll for completion
  const hash = send.hash;
  let result = await server.getTransaction(hash);
  const deadline = Date.now() + 30_000;
  while (result.status === 'NOT_FOUND' && Date.now() < deadline) {
    await sleep(1200);
    result = await server.getTransaction(hash);
  }

  if (result.status !== 'SUCCESS') {
    throw new Error(`Transaction ${result.status}: ${result.resultXdr?.toXDR?.('base64') || hash}`);
  }

  return result.returnValue ? scValToNative(result.returnValue) : null;
}

// ---------- contract methods ----------

export async function archiveEntry(publicKey, content, category) {
  const native = await invokeWrite(
    publicKey, 
    'archive', 
    addressScVal(publicKey), 
    xdr.ScVal.scvString(content),
    xdr.ScVal.scvString(category)
  );
  return native;
}

export async function getEntries() {
  const native = await simulateRead('get_entries');
  return native || [];
}

export async function clearArchive(publicKey) {
  await invokeWrite(publicKey, 'clear_archive', addressScVal(publicKey));
}

export function getExplorerUrl(publicKey) {
  return `https://stellar.expert/explorer/testnet/account/${publicKey}`;
}

export function getContractExplorerUrl() {
  return `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`;
}

