import { AccountInfo, Connection, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import bs58 from 'bs58'
import { Buffer } from 'buffer'
import {
  Account,
  Borsh,
  Errors,
} from '../common'
import { AccountType, GeneralPoolsProgram } from '../program'

interface Args {
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
    return GeneralPoolsProgram.findProgramAddress([poolMarket.toBuffer(), tokenMint.toBuffer()])
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
}
