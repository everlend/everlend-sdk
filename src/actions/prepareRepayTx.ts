import { ActionOptions, ActionResult } from './types'
import { PublicKey } from '@solana/web3.js'
import { Pool, PoolBorrowAuthority } from '../accounts'
import { RepayTx } from '../transactions'
import BN from 'bn.js'

export const prepareRepayTx = async (
  { connection, payerPublicKey }: ActionOptions,
  pool: PublicKey,
  amount: BN,
  interestAmount: BN,
  source: PublicKey,
): Promise<ActionResult> => {
  const {
    data: { poolMarket, tokenAccount },
  } = await Pool.load(connection, pool)

  const poolBorrowAuthority = await PoolBorrowAuthority.getPDA(pool, payerPublicKey)

  const tx = new RepayTx(
    { feePayer: payerPublicKey },
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
