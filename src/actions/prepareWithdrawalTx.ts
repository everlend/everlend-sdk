import { ActionOptions, ActionResult } from './types'
import { PublicKey, Transaction } from '@solana/web3.js'
import { Pool, UserWithdrawalRequest, WithdrawalRequestsState } from '../accounts'
import { GeneralPoolsProgram } from '../program'
import { Buffer } from 'buffer'
import { UnwrapParams, WithdrawalTx } from '../transactions'
import { NATIVE_MINT } from '@solana/spl-token'
import { CreateAssociatedTokenAccount } from '../common'

/**
 * Creates a transaction object for a withdrawal from a general pool.
 * Also adds an extra instruction for creating a token ATA (token mint ATA) if a destination account doesn't exist.
 *
 * **NB! Everlend has a 2-step withdrawal process. The first one is creating a withdrawal request, the second one is an
 * actual token transfer from a general pool to user's account.**
 *
 * This function generates a transaction for the second step. Generally the second step is automatic but there can be a case when
 * a user deletes their token ATA right after creating a withdrawal request. In such a case the second step cannot be
 * finished automatically. This function allows re-opening the token ATA and finish the withdrawal process.
 *
 * @param actionOptions
 * @param withdrawalRequest the withdrawal request public key.
 *
 * @returns the object with a prepared withdrawal transaction.
 */
export const prepareWithdrawalTx = async (
  { connection, payerPublicKey }: ActionOptions,
  withdrawalRequest: PublicKey,
): Promise<ActionResult> => {
  const {
    data: { from, destination, pool },
  } = await UserWithdrawalRequest.load(connection, withdrawalRequest)

  const {
    data: { tokenMint, poolMarket, poolMint, tokenAccount },
  } = await Pool.load(connection, pool)

  const withdrawalRequests = await WithdrawalRequestsState.getPDA(poolMarket, tokenMint)
  const poolMarketAuthority = await GeneralPoolsProgram.findProgramAddress([poolMarket.toBuffer()])

  const collateralTransit = await GeneralPoolsProgram.findProgramAddress([
    Buffer.from('transit'),
    poolMarket.toBuffer(),
    poolMint.toBuffer(),
  ])

  let unwrapAccounts: UnwrapParams = undefined
  if (tokenMint.equals(NATIVE_MINT)) {
    const unwrapTokenAccount = await UserWithdrawalRequest.getUnwrapSOLPDA(withdrawalRequest)
    unwrapAccounts = {
      tokenMint: tokenMint,
      unwrapTokenAccount: unwrapTokenAccount,
      signer: payerPublicKey,
    }
  }

  const tx = new Transaction()

  // Create destination account for token mint if doesn't exist
  !(await connection.getAccountInfo(destination)) &&
    tx.add(
      new CreateAssociatedTokenAccount(
        { feePayer: payerPublicKey },
        {
          associatedTokenAddress: destination,
          tokenMint,
        },
      ),
    )

  tx.add(
    new WithdrawalTx(
      { feePayer: payerPublicKey },
      {
        poolMarket,
        pool,
        poolMarketAuthority,
        poolMint,
        withdrawalRequests,
        withdrawalRequest,
        destination,
        tokenAccount,
        collateralTransit,
        from,
        unwrapAccounts,
      },
    ),
  )

  return { tx }
}
