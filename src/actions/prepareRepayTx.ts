import { ActionOptions, ActionResult } from '../utils'
import { PublicKey } from '@solana/web3.js'
import { Pool, PoolBorrowAuthority } from '../accounts'
import { RepayTx } from '../transactions'
import BN from 'bn.js'

/**
 * Creates a transaction object for repay.
 *
 * @param actionOptions
 * @param pool
 * @param amount
 * @param interestAmount
 * @param source
 */

export const prepareRepayTx = async (
  { connection, feePayer }: ActionOptions,
  pool: PublicKey,
  amount: BN,
  interestAmount: BN,
  source: PublicKey,
): Promise<ActionResult> => {
  const {
    data: { poolMarket, tokenAccount },
  } = await Pool.load(connection, pool)

  const poolBorrowAuthority = await PoolBorrowAuthority.getPDA(pool, feePayer)

  const tx = new RepayTx(
    { feePayer: feePayer },
    {
      poolMarket,
      pool,
      poolBorrowAuthority,
      source,
      tokenAccount,
      amount,
      interestAmount,
    },
  )

  return { tx }
}
