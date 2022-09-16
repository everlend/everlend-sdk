import { AccountLayout, MintLayout, TOKEN_PROGRAM_ID, NATIVE_MINT, Token } from '@solana/spl-token'
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import BN from 'bn.js'
import {
  Pool,
  PoolBorrowAuthority,
  PoolMarket,
  UserWithdrawalRequest,
  WithdrawalRequestsState,
} from './accounts'
import { GeneralPoolsProgram } from './program'
import { CreateAssociatedTokenAccount, findAssociatedTokenAccount } from '@everlend/common'
import {
  BorrowTx,
  CreatePoolTx,
  DepositTx,
  InitPoolMarketTx,
  RepayTx,
  WithdrawalRequestTx,
  WithdrawalTx,
  UnwrapParams,
  TransferDepositTx,
} from './transactions'
import { Buffer } from 'buffer'

/** The type is returned by actions, e.g. [[prepareDepositTx]] or [[prepareWithdrawalRequestTx]]. */
export type ActionResult = {
  /** the prepared transaction, ready for signing and sending. */
  tx: Transaction
  /** the additional key pairs which may be needed for signing and sending transactions. */
  keypairs?: Record<string, Keypair>
}

/** The type is used for actions params, e.g. [[prepareDepositTx]] or [[prepareWithdrawalRequestTx]]. */
export type ActionOptions = {
  /** the JSON RPC connection instance. */
  connection: Connection
  /** the fee payer public key, can be user's SOL address (owner address). */
  payerPublicKey: PublicKey
}

export const prepareInitPoolMarketTx = async (
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
      programId: GeneralPoolsProgram.PUBKEY,
    }),
  )
  tx.add(
    new InitPoolMarketTx(
      { feePayer: payerPublicKey },
      {
        poolMarket: poolMarket.publicKey,
      },
    ),
  )

  return { tx, keypairs: { poolMarket } }
}

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
 * @param rewardProgramId reward program id
 * @param config const
 * @param rewardPool public key of reward pool
 * @param rewardAccount public key of user reward account
 * @param source the public key which represents user's collateral token ATA (pool mint ATA) from which the collateral tokens will be taken.
 * @param destination the public key which represents user's token ATA (token mint ATA) to which the withdrawn from
 * a general pool tokens will be sent. The param isn't used when withdrawing SOL. There is wrapped SOL unwrapping logic
 * during the process, thus SOL is sent directly to user's native SOL address (owner address).
 *
 * @returns the object with a prepared withdrawal request transaction.
 */
export const prepareWithdrawalRequestTx = async (
  { connection, payerPublicKey }: ActionOptions,
  pool: PublicKey,
  collateralAmount: BN,
  rewardProgramId: PublicKey,
  config: PublicKey,
  rewardPool: PublicKey,
  rewardAccount: PublicKey,
  source: PublicKey,
  destination?: PublicKey,
): Promise<ActionResult> => {
  const {
    data: { tokenMint, poolMarket, tokenAccount, poolMint },
  } = await Pool.load(connection, pool)

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
        rewardProgramId,
        config,
      },
    ),
  )

  return { tx }
}

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

/**
 * Creates a transaction object for borrowing from a general pool.
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

// export const prepareInititalizeMining = async (
//   { connection, payerPublicKey }: ActionOptions,
//   rewardPool: PublicKey,
//   rewardAccount: PublicKey,
//   config: PublicKey,
//   rewardProgramId: PublicKey,
//   pool: PublicKey,
//   poolMarket: PublicKey,
//   poolMint: PublicKey,
//   poolMintATA: PublicKey,
// ): Promise<ActionResult> => {
//   const tx = new Transaction()
//
//   if (!(await connection.getAccountInfo(poolMintATA))) {
//     tx.add(
//       new CreateAssociatedTokenAccount(
//         { feePayer: payerPublicKey },
//         {
//           associatedTokenAddress: poolMintATA,
//           tokenMint: new PublicKey(poolMint),
//         },
//       ),
//     )
//   }
//
//   tx.add(
//     new InitializeMining(
//       { feePayer: payerPublicKey },
//       {
//         config,
//         rewardPool,
//         mining: rewardAccount,
//         user: payerPublicKey,
//         rewardProgramId,
//         pool,
//         poolMarket,
//         poolMintATA,
//       },
//     ),
//   )
//
//   return { tx }
// }

/**
 * Creates a transaction object for a transferring deposit to destination account.
 *
 * @param actionOptions
 * @param pool the general pool public key for a specific token, e.g. there can be a general pool for USDT or USDC etc.
 * @param source the public key which represents user's collateral token ATA (pool mint ATA) from which the collateral tokens will be taken.
 * @param destination the public key which represents user's token ATA (token mint ATA) to which the withdrawn from
 * @param destinationUserAuthority the public key of destination user authority
 * @param rewardPool public key of reward pool
 * @param rewardAccount public key of user reward account
 * @param destinationRewardAccount public key of destination user reward account
 * @param config const
 * @param rewardProgramId reward program id
 *
 * @returns the object with a prepared transfer transaction.
 */
export const prepareTransferDepositTx = async (
  { connection, payerPublicKey }: ActionOptions,
  pool: PublicKey,
  source: PublicKey,
  destination: PublicKey,
  destinationUserAuthority: PublicKey,
  rewardPool: PublicKey,
  rewardAccount: PublicKey,
  destinationRewardAccount: PublicKey,
  config: PublicKey,
  rewardProgramId: PublicKey,
): Promise<ActionResult> => {
  const tx = new Transaction()

  tx.add(
    new TransferDepositTx(
      { feePayer: payerPublicKey },
      {
        pool,
        source,
        destination,
        destinationUserAuthority,
        rewardPool,
        rewardAccount,
        destinationRewardAccount,
        config,
        rewardProgramId,
      },
    ),
  )

  return { tx }
}
