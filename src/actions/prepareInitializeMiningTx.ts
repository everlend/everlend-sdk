import { PublicKey, Transaction } from '@solana/web3.js'
import { InitializeMining } from '../transactions'
import { ActionOptions, ActionResult } from '../utils'
import { getRewardPoolAndAccount } from '../utils'

/**
 * Creates a transaction object for initializing a mining account.
 *
 * @param actionOptions
 *
 * @returns the object with a prepared initialize mining transaction.
 * @param rewardPool
 * @param mining
 */

export const prepareInititalizeMining = async (
  { payerPublicKey, user, connection }: ActionOptions,
  rewardPool: PublicKey,
  mining: PublicKey
): Promise<ActionResult> => {
  const tx = new Transaction()

  tx.add(
    new InitializeMining(
      { feePayer: payerPublicKey },
      {
        rewardPool,
        mining,
        user,
      },
    ),
  )

  return { tx }
}
