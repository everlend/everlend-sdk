import { Keypair, SystemProgram, Transaction } from '@solana/web3.js'
import { PoolMarket } from '../accounts'
import { GeneralPoolsProgram } from '../program'
import { InitPoolMarketTx } from '../transactions'
import { ActionOptions, ActionResult } from '../utils'

/**
 * Creates a transaction object for init pool market.
 *
 * @param actionOptions
 * @param poolMarket
 */

export const prepareInitPoolMarketTx = async (
  { connection, feePayer }: ActionOptions,
  poolMarket = Keypair.generate(),
): Promise<ActionResult> => {
  const lamports = await connection.getMinimumBalanceForRentExemption(PoolMarket.LEN)

  const tx = new Transaction()
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: feePayer,
      newAccountPubkey: poolMarket.publicKey,
      lamports,
      space: PoolMarket.LEN,
      programId: GeneralPoolsProgram.PUBKEY,
    }),
  )
  tx.add(
    new InitPoolMarketTx(
      { feePayer: feePayer },
      {
        poolMarket: poolMarket.publicKey,
      },
    ),
  )

  return { tx, keypairs: { poolMarket } }
}
