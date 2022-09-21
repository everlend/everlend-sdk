import { AccountInfo, Connection, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import bs58 from 'bs58'
import { Buffer } from 'buffer'
import {
  Account,
  Borsh,
  deserialize,
  Errors,
  findAssociatedTokenAccount,
  deserializeTokenAccount,
} from '../common'
import { AccountType, GeneralPoolsProgram } from '../program'

export type UserCompoundBalancesByPool = {
  [poolPubKey: string]: {
    /** lamports */
    balance: number
    tokenMint: PublicKey
  }
}

type Args = {
  accountType: PublicKey
  poolMarket: PublicKey
  tokenMint: PublicKey
  tokenAccount: PublicKey
  poolMint: PublicKey
  totalAmountBorrowed: BN
}
export class PoolData extends Borsh.Data<Args> {
  static readonly SCHEMA = this.struct([
    ['accountType', 'u8'],
    ['poolMarket', 'publicKey'],
    ['tokenMint', 'publicKey'],
    ['tokenAccount', 'publicKey'],
    ['poolMint', 'publicKey'],
    ['totalAmountBorrowed', 'u64'],
  ])

  // Account type - Pool
  accountType: PublicKey
  // Pool market
  poolMarket: PublicKey
  // Token mint
  tokenMint: PublicKey
  // Token account
  tokenAccount: PublicKey
  // Pool mint
  poolMint: PublicKey
  // Total amount borrowed
  totalAmountBorrowed: BN
}

export class Pool extends Account<PoolData> {
  constructor(publicKey: PublicKey, info: AccountInfo<Buffer>) {
    super(publicKey, info)

    if (!this.assertOwner(GeneralPoolsProgram.PUBKEY)) {
      throw Errors.ERROR_INVALID_OWNER()
    }

    this.data = PoolData.deserialize(this.info.data)
  }

  static getPDA(poolMarket: PublicKey, tokenMint: PublicKey) {
    return GeneralPoolsProgram.findProgramAddress([
      poolMarket.toBuffer(),
      tokenMint.toBuffer(),
    ])
  }

  /**
   * Finds general pools. Also, can filter them.
   *
   * @param connection the JSON RPC connection instance.
   * @param filters the filter config object.
   */
  static async findMany(
    connection: Connection,
    filters: {
      /** the public key which represents the main manager root account which is used for generating PDAs. */
      poolMarket?: PublicKey
    } = {},
  ) {
    return (
      await GeneralPoolsProgram.getProgramAccounts(connection, {
        filters: [
          // Filter for Pool by key
          {
            memcmp: {
              offset: 0,
              bytes: bs58.encode(Buffer.from([AccountType.Pool])),
            },
          },
          // Filter for assigned to pool market
          filters.poolMarket && {
            memcmp: {
              offset: 1,
              bytes: new PublicKey(filters.poolMarket).toBase58(),
            },
          },
        ].filter(Boolean),
      })
    )
      .map((account) => {
        try {
          return Pool.from(account)
        } catch (err) {}
      })
      .filter(Boolean)
  }

  /**
   * Calculates e-token rate.
   *
   * @param amounts the amount values needed for the calculation.
   */
  static calcETokenRate(amounts: {
    /** the total supply of a pool collateral token mint. */
    poolMintSupply: number
    /** the amount of tokens borrowed from a pool. */
    totalAmountBorrowed: number
    /** the amount of tokens left in a pool. */
    tokenAccountAmount: number
  }) {
    const { poolMintSupply, totalAmountBorrowed, tokenAccountAmount } = amounts

    return poolMintSupply / (totalAmountBorrowed + tokenAccountAmount)
  }

  /**
   * Calculates user's compound balance by pools. If no pools are provided,
   * all the Everlend general pools will be automatically loaded.
   *
   * @param connection the JSON RPC connection instance.
   * @param owner the owner account, the account is used to find ATAs of pool mints.
   * @param poolMarket the public key which represents the main manager root account which is used for generating PDAs.
   * @param pools the general pools. If absent all the pools will be loaded instead.
   */
  static async getUserCompoundBalancesByPools(
    connection: Connection,
    owner: PublicKey,
    poolMarket: PublicKey,
    pools?: Pool[],
  ): Promise<UserCompoundBalancesByPool> {
    const _pools =
      pools ??
      (await this.findMany(connection, {
        poolMarket,
      }))

    const poolMints: PublicKey[] = []
    const tokenAccounts: PublicKey[] = []
    const poolMintsATAs: PublicKey[] = []
    for (const pool of _pools) {
      const { poolMint } = pool.data
      poolMints.push(poolMint)

      tokenAccounts.push(pool.data.tokenAccount)

      const foundATA = await findAssociatedTokenAccount(owner, poolMint)
      poolMintsATAs.push(foundATA)
    }

    const poolMintsInfo = await connection.getMultipleAccountsInfo(poolMints)
    const tokenAccountsInfo = await connection.getMultipleAccountsInfo(tokenAccounts)
    const poolMintsATAsInfo = await connection.getMultipleAccountsInfo(poolMintsATAs)

    return _pools.reduce((acc, pool, index) => {
      const poolMintInfoDeserialized = deserialize(poolMintsInfo[index].data)

      const tokenAccountBalance = deserializeTokenAccount(
        tokenAccountsInfo[index].data,
      ).amount.toNumber()

      const poolMintATAInfo = poolMintsATAsInfo[index]
      const eTokenAmount =
        poolMintATAInfo === null
          ? 0
          : deserializeTokenAccount(poolMintATAInfo.data).amount.toNumber()

      const eTokenRate = this.calcETokenRate({
        poolMintSupply: poolMintInfoDeserialized.supply.toNumber(),
        totalAmountBorrowed: pool.data.totalAmountBorrowed.toNumber(),
        tokenAccountAmount: tokenAccountBalance,
      })

      acc[pool.publicKey.toString()] = {
        balance: Math.floor(eTokenAmount / eTokenRate),
        tokenMint: pool.data.tokenMint,
      }

      return acc
    }, {})
  }
}
