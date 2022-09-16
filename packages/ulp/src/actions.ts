import { AccountLayout, MintLayout, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import BN from 'bn.js'
import { Pool, PoolBorrowAuthority, PoolMarket } from './accounts'
import { LiquidityPoolsProgram } from './program'
import { CreateAssociatedTokenAccount, findAssociatedTokenAccount } from '@everlend/common'
import { Borrow, CreatePool, Deposit, InitPoolMarket, Repay, Withdraw } from './transactions'

export type ActionResult = {
  tx: Transaction
  keypairs?: Record<string, Keypair>
}

export type ActionOptions = {
  connection: Connection
  payerPublicKey: PublicKey
}

export const initPoolMarket = async (
  { connection, payerPublicKey }: ActionOptions,
  poolMarket = Keypair.generate(),
): Promise<ActionResult> => {
  const lamports = await connection.getMinimumBalanceForRentExemption(PoolMarket.LEN)

  const tx = new Transaction()
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: payerPublicKey,
      newAccountPubkey: poolMarket.publicKey,
      lamports,
      space: PoolMarket.LEN,
      programId: LiquidityPoolsProgram.PUBKEY,
    }),
  )
  tx.add(
    new InitPoolMarket(
      { feePayer: payerPublicKey },
      {
        poolMarket: poolMarket.publicKey,
      },
    ),
  )

  return { tx, keypairs: { poolMarket } }
}

export const createPool = async (
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
  const poolMarketAuthority = await LiquidityPoolsProgram.findProgramAddress([
    poolMarket.toBuffer(),
  ])

  tx.add(
    new CreatePool(
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

export const deposit = async (
  { connection, payerPublicKey }: ActionOptions,
  pool: PublicKey,
  amount: BN,
  source: PublicKey,
  destination?: PublicKey,
): Promise<ActionResult> => {
  const {
    data: { poolMarket, tokenAccount, poolMint },
  } = await Pool.load(connection, pool)

  const poolMarketAuthority = await LiquidityPoolsProgram.findProgramAddress([
    poolMarket.toBuffer(),
  ])

  const tx = new Transaction()

  // Create destination account for pool mint if doesn't exist
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
    new Deposit(
      { feePayer: payerPublicKey },
      {
        poolMarket,
        pool,
        source,
        destination,
        tokenAccount,
        poolMint,
        poolMarketAuthority,
        amount,
      },
    ),
  )

  return { tx }
}

export const withdraw = async (
  { connection, payerPublicKey }: ActionOptions,
  pool: PublicKey,
  amount: BN,
  source: PublicKey,
  destination?: PublicKey,
): Promise<ActionResult> => {
  const {
    data: { tokenMint, poolMarket, tokenAccount, poolMint },
  } = await Pool.load(connection, pool)

  const poolMarketAuthority = await LiquidityPoolsProgram.findProgramAddress([
    poolMarket.toBuffer(),
  ])

  const tx = new Transaction()

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
    new Withdraw(
      { feePayer: payerPublicKey },
      {
        poolMarket,
        pool,
        source,
        destination,
        tokenAccount,
        poolMint,
        poolMarketAuthority,
        amount,
      },
    ),
  )

  return { tx }
}

export const borrow = async (
  { connection, payerPublicKey }: ActionOptions,
  pool: PublicKey,
  amount: BN,
  destination?: PublicKey,
): Promise<ActionResult> => {
  const {
    data: { poolMarket, tokenAccount, tokenMint },
  } = await Pool.load(connection, pool)

  const poolMarketAuthority = await LiquidityPoolsProgram.findProgramAddress([
    poolMarket.toBuffer(),
  ])
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
    new Borrow(
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

export const repay = async (
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

  const tx = new Repay(
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
