import { PublicKey, Transaction } from '@solana/web3.js'
import { FillVaultTx } from '../transactions'
import { ActionOptions, ActionResult } from '../utils'
import BN from 'bn.js'

/**
 * Fill lm-rewards for picked token (ONLY DEVNET)
 * @param actionOptions
 *
 * @param rewardPool reward pool public key
 * @param rewardMint reward mint public key
 * @param vault
 * @param feeAccount fee payer account
 * @param authority main sol account
 * @param from source account
 * @param amount amount of tokens
 */
export const prepareFillVault = async (
  { feePayer }: ActionOptions,
  rewardPool: PublicKey,
  rewardMint: PublicKey,
  vault: PublicKey,
  feeAccount: PublicKey,
  authority: PublicKey,
  from: PublicKey,
  amount: BN,
): Promise<ActionResult> => {
  const tx = new Transaction()

  tx.add(
    new FillVaultTx(
      { feePayer: feePayer },
      {
        rewardPool,
        rewardMint,
        vault,
        feeAccount,
        authority,
        from,
        amount,
      },
    ),
  )

  return { tx }
}
