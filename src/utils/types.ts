import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js'
import BN from 'bn.js'
/** The type is returned by actions, e.g. [[prepareDepositTx]] or [[prepareWithdrawalRequestTx]]. */
export type ActionResult = {
  /** the prepared transaction, ready for signing and sending. */
  tx: Transaction
  /** the additional key pairs which may be needed for signing and sending transactions. */
  keypairs?: Record<string, Keypair>
}

export type NetworkType = 'devnet' | 'mainnet'
/** The type is used for actions params, e.g. [[prepareDepositTx]] or [[prepareWithdrawalRequestTx]]. */
export type ActionOptions = {
  /** the JSON RPC connection instance. */
  connection: Connection
  /** the fee payer public key, can be user's SOL address (owner address). */
  payerPublicKey: PublicKey
  /** an optional param, can be use if owner and fee payer are different */
  user?: PublicKey
  /** an optional param, if action need to know network type  */
  network?: NetworkType
}

interface IBalance {
  lamports: number,
  ui: number,
  decimals: number
}

export interface IRewardToken {
  rewardMint: string
  balance: IBalance
}

export interface IRewardIndex {
  indexWithPrecision: BN
  rewardMint: PublicKey
  rewards: BN
}
