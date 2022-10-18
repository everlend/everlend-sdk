import { PublicKey, Transaction } from '@solana/web3.js'
import { RewardProgram } from '../rewardProgram'
import { Mining } from '../accounts'
import { ActionOptions, ActionResult } from '../utils'
import { ClaimTx } from '../transactions'

export const prepareClaimTx = async (
  { feePayer }: ActionOptions,
  rewardPool: PublicKey,
  rewardMint: PublicKey,
  userRewardTokenAccount: PublicKey,
): Promise<ActionResult> => {
  const tx = new Transaction()

  const mining = await Mining.getPDA(feePayer, rewardPool)
  const [vault] = await PublicKey.findProgramAddress(
    [Buffer.from('vault'), rewardPool.toBuffer(), rewardMint.toBuffer()],
    RewardProgram.PUBKEY,
  )

  tx.add(
    new ClaimTx(
      { feePayer },
      {
        rewardPool,
        rewardMint,
        vault,
        mining,
        userRewardTokenAccount,
      },
    ),
  )

  return { tx }
}
