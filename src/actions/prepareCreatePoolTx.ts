import { ActionOptions, ActionResult } from './types'
import { Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { AccountLayout, MintLayout, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { Pool } from '../accounts'
import { GeneralPoolsProgram } from '../program'
import { CreatePoolTx } from '../transactions'

export const prepareCreatePoolTx = async (
  { connection, payerPublicKey }: ActionOptions,
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
      fromPubkey: payerPublicKey,
      newAccountPubkey: tokenAccount.publicKey,
      lamports: tokenAccountlamports,
      space: AccountLayout.span,
      programId: TOKEN_PROGRAM_ID,
    }),
  )
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: payerPublicKey,
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
      { feePayer: payerPublicKey },
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
