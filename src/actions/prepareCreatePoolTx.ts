import { ActionOptions, ActionResult } from '../utils'
import { Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { AccountLayout, MintLayout, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { Pool } from '../accounts'
import { GeneralPoolsProgram } from '../program'
import { CreatePoolTx } from '../transactions'

/**
 * Creates a transaction object for create pool action.
 *
 * @param actionOptions
 * @param poolMarket
 * @param tokenMint
 * @param tokenAccount
 * @param poolMint
 *
 * @returns the object with a prepared create pool tx.
 */

export const prepareCreatePoolTx = async (
  { connection, feePayer }: ActionOptions,
  poolMarket: PublicKey,
  tokenMint: PublicKey,
  tokenAccount = Keypair.generate(),
  poolMint = Keypair.generate(),
): Promise<ActionResult> => {
  const tokenAccountlamports = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  )
  const poolMintlamports = await connection.getMinimumBalanceForRentExemption(MintLayout.span)

  const tx = new Transaction()
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: feePayer,
      newAccountPubkey: tokenAccount.publicKey,
      lamports: tokenAccountlamports,
      space: AccountLayout.span,
      programId: TOKEN_PROGRAM_ID,
    }),
  )
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: feePayer,
      newAccountPubkey: poolMint.publicKey,
      lamports: poolMintlamports,
      space: MintLayout.span,
      programId: TOKEN_PROGRAM_ID,
    }),
  )

  const poolPubkey = await Pool.getPDA(poolMarket, tokenMint)
  const poolMarketAuthority = await GeneralPoolsProgram.findProgramAddress([poolMarket.toBuffer()])

  tx.add(
    new CreatePoolTx(
      { feePayer: feePayer },
      {
        poolMarket,
        pool: poolPubkey,
        tokenMint,
        tokenAccount: tokenAccount.publicKey,
        poolMint: poolMint.publicKey,
        poolMarketAuthority,
      },
    ),
  )

  return { tx, keypairs: { tokenAccount, poolMint } }
}
