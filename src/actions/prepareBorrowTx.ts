import { ActionOptions, ActionResult } from '../utils'
import { PublicKey, Transaction } from '@solana/web3.js'
import { Pool, PoolBorrowAuthority } from '../accounts'
import { GeneralPoolsProgram } from '../program'
import { CreateAssociatedTokenAccount, findAssociatedTokenAccount } from '../common'
import { BorrowTx } from '../transactions'
import BN from 'bn.js'

/**
 * Creates a transaction object for borrowing from a general pool.
 *
 * @param actionOptions
 * @param pool
 * @param amount
 * @param destination
 *
 * @returns the object with a prepared tx.
 */
export const prepareBorrowTx = async (
  { connection, payerPublicKey }: ActionOptions,
  pool: PublicKey,
  amount: BN,
  destination?: PublicKey,
): Promise<ActionResult> => {
  const {
    data: { poolMarket, tokenAccount, tokenMint },
  } = await Pool.load(connection, pool)

  const poolMarketAuthority = await GeneralPoolsProgram.findProgramAddress([poolMarket.toBuffer()])
  const poolBorrowAuthority = await PoolBorrowAuthority.getPDA(pool, payerPublicKey)

  const tx = new Transaction()

  // Create destination account for token mint if doesn't exist
  destination = destination ?? (await findAssociatedTokenAccount(payerPublicKey, tokenMint))
  !(await connection.getAccountInfo(destination)) &&
    tx.add(
      new CreateAssociatedTokenAccount(
        { feePayer: payerPublicKey },
        {
          associatedTokenAddress: destination,
          tokenMint: tokenMint,
        },
      ),
    )

  tx.add(
    new BorrowTx(
      { feePayer: payerPublicKey },
      {
        poolMarket,
        pool,
        poolBorrowAuthority,
        destination,
        tokenAccount,
        poolMarketAuthority,
        amount,
      },
    ),
  )

  return { tx }
}
