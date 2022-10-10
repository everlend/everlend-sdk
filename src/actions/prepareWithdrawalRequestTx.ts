import { ActionOptions, ActionResult } from '../utils'
import { PublicKey, Transaction } from '@solana/web3.js'
import { Pool, UserWithdrawalRequest, WithdrawalRequestsState } from '../accounts'
import { GeneralPoolsProgram } from '../program'
import { Buffer } from 'buffer'
import { CreateAssociatedTokenAccount, findAssociatedTokenAccount } from '../common'
import { WithdrawalRequestTx } from '../transactions'
import BN from 'bn.js'
import { getRewardPoolAndAccount } from '../utils'

/**
 * Creates a transaction object for a withdrawal request from a general pool.
 * Also adds an extra instruction for creating a token ATA (token mint ATA) if a destination account doesn't exist.
 *
 * **NB! Everlend has a 2-step withdrawal process. The first one is creating a withdrawal request, the second one is an
 * actual token transfer from a general pool to user's account.**
 *
 * This function generates a transaction for the first step.
 *
 * @param actionOptions
 * @param pool the general pool public key for a specific token, e.g. there can be a general pool for USDT or USDC etc.
 * @param collateralAmount the amount of collateral tokens in lamports which will be taken from a user.
 * @param source the public key which represents user's collateral token ATA (pool mint ATA) from which the collateral tokens will be taken.
 * @param destination the public key which represents user's token ATA (token mint ATA) to which the withdrawn from
 * a general pool tokens will be sent. The param isn't used when withdrawing SOL. There is wrapped SOL unwrapping logic
 * during the process, thus SOL is sent directly to user's native SOL address (owner address).
 *
 * @returns the object with a prepared withdrawal request transaction.
 */
export const prepareWithdrawalRequestTx = async (
  { connection, payerPublicKey, user, network }: ActionOptions,
  pool: PublicKey,
  collateralAmount: BN,
  source: PublicKey,
  destination?: PublicKey,
): Promise<ActionResult> => {
  const {
    data: { tokenMint, poolMarket, tokenAccount, poolMint },
  } = await Pool.load(connection, pool)
  const { rewardPool, rewardAccount } = await getRewardPoolAndAccount(
    pool,
    connection,
    user,
    network,
  )

  const withdrawRequests = await WithdrawalRequestsState.getPDA(poolMarket, tokenMint)
  const withdrawalRequest = await UserWithdrawalRequest.getPDA(withdrawRequests, payerPublicKey)

  const collateralTransit = await GeneralPoolsProgram.findProgramAddress([
    Buffer.from('transit'),
    poolMarket.toBuffer(),
    poolMint.toBuffer(),
  ])

  const tx = new Transaction()

  const poolConfig = await GeneralPoolsProgram.findProgramAddress([
    Buffer.from('config'),
    pool.toBuffer(),
  ])

  // Create destination account for token mint if doesn't exist
  destination = destination ?? (await findAssociatedTokenAccount(payerPublicKey, tokenMint))
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
    new WithdrawalRequestTx(
      { feePayer: payerPublicKey },
      {
        poolConfig,
        poolMarket,
        pool,
        withdrawRequests,
        withdrawalRequest,
        source,
        destination,
        tokenAccount,
        collateralTransit,
        poolMint,
        collateralAmount,
        rewardPool,
        rewardAccount,
      },
    ),
  )

  return { tx }
}
