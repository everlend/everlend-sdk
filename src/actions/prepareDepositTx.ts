import { AccountLayout, NATIVE_MINT, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import BN from 'bn.js'
import { Pool } from '../accounts'
import { CreateAssociatedTokenAccount, findAssociatedTokenAccount } from '../common'
import { GeneralPoolsProgram } from '../program'
import { DepositTx } from '../transactions'
import { ActionOptions, ActionResult, getRewardPoolAndMiningAccount } from '../utils'
import { prepareInititalizeMining } from './prepareInitializeMiningTx'

/**
 * Creates a transaction object for depositing to a general pool.
 * Also adds an extra instruction for creating a collateral token ATA (pool mint ATA) if a destination account doesn't exist.
 * If depositing SOL, the wrapping process takes place.
 *
 * @param actionOptions
 * @param pool the general pool public key for a specific token, e.g. there can be a general pool for USDT or USDC etc.
 * @param authority
 * @param amount the amount of tokens in lamports to deposit.
 * @param source the public key which represents user's token ATA (token mint ATA) from which the token amount will be taken.
 * When depositing native SOL it will be replaced by a newly generated ATA for wrapped SOL, created by `payerPublicKey` from [[ActionOptions]].
 * @param destination the public key which represents user's collateral token ATA (pool mint ATA) where collateral tokens
 * will be sent after a deposit.
 *
 * @returns the object with a prepared deposit transaction and generated keypair if depositing SOL.
 */

export const prepareDepositTx = async (
  { connection, feePayer, network }: ActionOptions,
  pool: PublicKey,
  authority: PublicKey,
  amount: BN,
  source: PublicKey,
  destination?: PublicKey,
): Promise<ActionResult> => {
  const {
    data: { poolMarket, tokenAccount, poolMint, tokenMint },
  } = await Pool.load(connection, pool)
  const poolMarketAuthority = await GeneralPoolsProgram.findProgramAddress([poolMarket.toBuffer()])
  const { rewardPool, miningAccount } = await getRewardPoolAndMiningAccount({
    pool,
    connection,
    authority,
    network,
    tokenMint,
  })
  const miningAccountInfo = await connection.getAccountInfo(miningAccount)
  const rewardPoolInfo = await connection.getAccountInfo(rewardPool)
  const tx = new Transaction()

  if (!miningAccountInfo && rewardPoolInfo) {
    const { tx: initMiningTx } = await prepareInititalizeMining(
      { feePayer, connection },
      authority,
      rewardPool,
      miningAccount,
    )
    tx.add(initMiningTx)
  }

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
      fromPubkey: feePayer,
      newAccountPubkey: SOLDepositSource,
      programId: TOKEN_PROGRAM_ID,
      space: AccountLayout.span,
      lamports: amount.addn(rent).toNumber(),
    })
    const initTokenAccountIx = Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID,
      NATIVE_MINT,
      SOLDepositSource,
      feePayer,
    )
    closeTokenAccountIx = Token.createCloseAccountInstruction(
      TOKEN_PROGRAM_ID,
      SOLDepositSource,
      feePayer,
      feePayer,
      [],
    )

    tx.add(createTokenAccountIx, initTokenAccountIx)
    source = SOLDepositSource
  }

  destination = destination ?? (await findAssociatedTokenAccount(feePayer, poolMint))
  const destinationInfo = await connection.getAccountInfo(destination)

  if (!destinationInfo) {
    tx.add(
      new CreateAssociatedTokenAccount(
        { feePayer: feePayer },
        {
          associatedTokenAddress: destination,
          tokenMint: poolMint,
        },
      ),
    )
  }

  tx.add(
    new DepositTx(
      { feePayer: feePayer },
      {
        poolConfig,
        poolMarket,
        pool,
        source,
        destination,
        tokenAccount,
        poolMint,
        rewardPool,
        miningAccount,
        poolMarketAuthority,
        amount,
      },
    ),
  )

  if (closeTokenAccountIx) tx.add(closeTokenAccountIx)

  return { tx, keypairs: { SOLDepositKeypair } }
}
