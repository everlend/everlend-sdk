import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js'

/** The type is returned by actions, e.g. [[prepareDepositTx]] or [[prepareWithdrawalRequestTx]]. */
export type ActionResult = {
  /** the prepared transaction, ready for signing and sending. */
  tx: Transaction
  /** the additional key pairs which may be needed for signing and sending transactions. */
  keypairs?: Record<string, Keypair>
}

/** The type is used for actions params, e.g. [[prepareDepositTx]] or [[prepareWithdrawalRequestTx]]. */
export type ActionOptions = {
  /** the JSON RPC connection instance. */
  connection: Connection
  /** the fee payer public key, can be user's SOL address (owner address). */
  payerPublicKey: PublicKey
}
