import { PublicKey, Transaction } from '@solana/web3.js'
import { FillVaultTx } from '../transactions'
import { ActionOptions, ActionResult } from '../utils'
import BN from 'bn.js'

/**
 * Fill lm-rewards for picked token (ONLY DEVNET)
 * @param actionOptions
 *
 * @param rewardPool
 * @param rewardMint
 * @param vault
 * @param feeAccount
 * @param authority
 * @param from
 * @param amount
 */
export const prepareFillVault = async (
  { payerPublicKey }: ActionOptions,
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
      { feePayer: payerPublicKey },
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
