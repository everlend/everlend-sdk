import { ActionOptions, ActionResult } from './types'
import { PublicKey, Transaction } from '@solana/web3.js'
import { TransferDepositTx } from '../transactions'

/**
 * Creates a transaction object for a transferring deposit to destination account.
 *
 * @param actionOptions
 * @param pool the general pool public key for a specific token, e.g. there can be a general pool for USDT or USDC etc.
 * @param source the public key which represents user's collateral token ATA (pool mint ATA) from which the collateral tokens will be taken.
 * @param destination the public key which represents user's token ATA (token mint ATA) to which the withdrawn from
 * @param destinationUserAuthority the public key of destination user authority
 * @param rewardPool public key of reward pool
 * @param rewardAccount public key of user reward account
 * @param destinationRewardAccount public key of destination user reward account
 * @param config const
 * @param rewardProgramId reward program id
 *
 * @returns the object with a prepared transfer transaction.
 */
export const prepareTransferDepositTx = async (
  { connection, payerPublicKey }: ActionOptions,
  pool: PublicKey,
  source: PublicKey,
  destination: PublicKey,
  destinationUserAuthority: PublicKey,
  rewardPool: PublicKey,
  rewardAccount: PublicKey,
  destinationRewardAccount: PublicKey,
  config: PublicKey,
  rewardProgramId: PublicKey,
): Promise<ActionResult> => {
  const tx = new Transaction()

  tx.add(
    new TransferDepositTx(
      { feePayer: payerPublicKey },
      {
        pool,
        source,
        destination,
        destinationUserAuthority,
        rewardPool,
        rewardAccount,
        destinationRewardAccount,
        config,
        rewardProgramId,
      },
    ),
  )

  return { tx }
}