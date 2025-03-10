import { AptosClient, AptosAccount, HexString, TxnBuilderTypes, BCS } from 'aptos';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Load environment variables
const NODE_URL = process.env.APTOS_NODE_URL || 'https://fullnode.mainnet.aptoslabs.com/v1';
const PRIVATE_KEY = process.env.PRIVATE_KEY || 'your_private_key_in_hex';

// Initialize Aptos Client
const client = new AptosClient(NODE_URL);

// Initialize Aptos Account
const account = new AptosAccount(new HexString(PRIVATE_KEY).toUint8Array());

// Constants
const SLIPPAGE = 0.5; // 0.5% slippage
const LIQUIDSWAP_MODULE = '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12';

// Fetch swap quote
async function getSwapQuote(fromCoin: string, toCoin: string, amount: number) {
  const response = await axios.get(`https://api.liquidswap.com/quote?from=${fromCoin}&to=${toCoin}&amount=${amount}`);
  const amountOut = response.data.amount_out;
  const minAmountOut = amountOut * (1 - SLIPPAGE / 100);
  return { amountOut, minAmountOut };
}

// Execute swap
export async function swapAptosToken(fromCoin: string, toCoin: string, amount: number) {
  // 1. Get swap quote with slippage calculation
  const { minAmountOut } = await getSwapQuote(fromCoin, toCoin, amount);

  // 2. Construct swap payload for Liquidswap
  const entryFunctionPayload = new TxnBuilderTypes.TransactionPayloadEntryFunction(
    TxnBuilderTypes.EntryFunction.natural(
      `${LIQUIDSWAP_MODULE}::scripts_v2`,
      'swap',
      [
        new TxnBuilderTypes.TypeTagStruct(TxnBuilderTypes.StructTag.fromString(fromCoin)),
        new TxnBuilderTypes.TypeTagStruct(TxnBuilderTypes.StructTag.fromString(toCoin)),
      ],
      [
        BCS.bcsSerializeUint64(BigInt(amount * 1e8)), // Convert to octas
        BCS.bcsSerializeUint64(BigInt(minAmountOut * 1e8)),
        BCS.bcsSerializeBool(true), // Stable swap flag
      ]
    )
  );

  // 3. Fetch account sequence number and chain ID
  const [{ sequence_number }, chainId] = await Promise.all([
    client.getAccount(account.address()),
    client.getChainId(),
  ]);

  // 4. Construct RawTransaction
  const rawTx = new TxnBuilderTypes.RawTransaction(
    TxnBuilderTypes.AccountAddress.fromHex(account.address()),
    BigInt(sequence_number),
    entryFunctionPayload,
    BigInt(1000), // Max gas amount
    BigInt(1),    // Gas unit price
    BigInt(Math.floor(Date.now() / 1000) + 10), // Expiration timestamp
    new TxnBuilderTypes.ChainId(chainId)
  );

  // 5. Sign the transaction
  const bcsTxn = AptosClient.generateBCSTransaction(account, rawTx);

  // 6. Submit the transaction
  const txResult = await client.submitSignedBCSTransaction(bcsTxn);

  // 7. Wait for confirmation
  await client.waitForTransaction(txResult.hash);
  return txResult.hash;
}
