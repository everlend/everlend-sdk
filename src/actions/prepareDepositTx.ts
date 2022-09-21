import { ActionOptions, ActionResult } from './types'
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import { Pool } from '../accounts'
import { GeneralPoolsProgram } from '../program'
import { Buffer } from 'buffer'
import { AccountLayout, NATIVE_MINT, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { CreateAssociatedTokenAccount, findAssociatedTokenAccount } from '../common'
import { DepositTx } from '../transactions'
import BN from 'bn.js'

/**
 * Creates a transaction object for depositing to a general pool.
 * Also adds an extra instruction for creating a collateral token ATA (pool mint ATA) if a destination account doesn't exist.
 * If depositing SOL, the wrapping process takes place.
 *
 * @param actionOptions
 * @param pool the general pool public key for a specific token, e.g. there can be a general pool for USDT or USDC etc.
 * @param amount the amount of tokens in lamports to deposit.
 * @param rewardProgramId reward program id
 * @param config const
 * @param rewardPool public key of reward pool
 * @param rewardAccount public key of user reward account
 * @param source the public key which represents user's token ATA (token mint ATA) from which the token amount will be taken.
 * When depositing native SOL it will be replaced by a newly generated ATA for wrapped SOL, created by `payerPublicKey` from [[ActionOptions]].
 * @param destination the public key which represents user's collateral token ATA (pool mint ATA) where collateral tokens
 * will be sent after a deposit.
 *
 * @returns the object with a prepared deposit transaction and generated keypair if depositing SOL.
 */
export const prepareDepositTx = async (
  { connection, payerPublicKey }: ActionOptions,
  pool: PublicKey,
  amount: BN,
  rewardProgramId: PublicKey,
  config: PublicKey,
  rewardPool: PublicKey,
  rewardAccount: PublicKey,
  source: PublicKey,
  destination?: PublicKey,
): Promise<ActionResult> => {
  const {
    data: { poolMarket, tokenAccount, poolMint, tokenMint },
  } = await Pool.load(connection, pool)

  const poolMarketAuthority = await GeneralPoolsProgram.findProgramAddress([poolMarket.toBuffer()])

  const tx = new Transaction()
  const poolConfig = await GeneralPoolsProgram.findProgramAddress([
    Buffer.from('config'),
    pool.toBuffer(),
  ])

  // Wrapping SOL
  let closeTokenAccountIx: TransactionInstruction
  let SOLDepositKeypair: Keypair
  let SOLDepositSource: PublicKey

  if (tokenMint.equals(NATIVE_MINT)) {
    SOLDepositKeypair = Keypair.generate()
    SOLDepositSource = SOLDepositKeypair.publicKey
    const rent = await connection.getMinimumBalanceForRentExemption(AccountLayout.span)

    const createTokenAccountIx = SystemProgram.createAccount({
      fromPubkey: payerPublicKey,
      newAccountPubkey: SOLDepositSource,
      programId: TOKEN_PROGRAM_ID,
      space: AccountLayout.span,
      lamports: amount.addn(rent).toNumber(),
    })
    const initTokenAccountIx = Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID,
      NATIVE_MINT,
      SOLDepositSource,
      payerPublicKey,
    )
    closeTokenAccountIx = Token.createCloseAccountInstruction(
      TOKEN_PROGRAM_ID,
      SOLDepositSource,
      payerPublicKey,
      payerPublicKey,
      [],
    )

    tx.add(createTokenAccountIx, initTokenAccountIx)
    source = SOLDepositSource
  }

  destination = destination ?? (await findAssociatedTokenAccount(payerPublicKey, poolMint))
  !(await connection.getAccountInfo(destination)) &&
    tx.add(
      new CreateAssociatedTokenAccount(
        { feePayer: payerPublicKey },
        {
          associatedTokenAddress: destination,
          tokenMint: poolMint,
        },
      ),
    )

  tx.add(
    new DepositTx(
      { feePayer: payerPublicKey },
      {
        poolConfig,
        poolMarket,
        pool,
        source,
        destination,
        tokenAccount,
        poolMint,
        rewardPool,
        rewardAccount,
        config,
        rewardProgramId,
        poolMarketAuthority,
        amount,
      },
    ),
  )

  closeTokenAccountIx && tx.add(closeTokenAccountIx)

  return { tx, keypairs: { SOLDepositKeypair } }
}
