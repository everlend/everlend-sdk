import { PublicKey, Transaction } from '@solana/web3.js'
import { InitializeMining } from '../transactions'
import { ActionOptions, ActionResult } from '../utils'
import { Mining } from '../accounts'

/**
 * Creates a transaction object for initializing a mining account.
 *
 * @param actionOptions
 *
 * @returns the object with a prepared initialize mining transaction.
 * @param authority main sol account
 * @param rewardPool reward pool public key
 * @param mining reward account public key
 */

export const prepareInititalizeMining = async (
  { feePayer, connection }: ActionOptions,
  authority: PublicKey,
  rewardPool: PublicKey,
  mining?: PublicKey,
): Promise<ActionResult> => {
  const tx = new Transaction()
  if (!mining) {
    mining = await Mining.getPDA(authority, rewardPool)
  }

  tx.add(
    new InitializeMining(
      { feePayer: feePayer },
      {
        rewardPool,
        mining,
        authority,
      },
    ),
  )

  return { tx }
}
