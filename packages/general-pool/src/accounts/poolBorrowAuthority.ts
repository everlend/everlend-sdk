import { AccountInfo, Connection, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import bs58 from 'bs58'
import { Buffer } from 'buffer'
import { Account, Borsh, Errors } from '@everlend/common'
import { AccountType, GeneralPoolsProgram } from '../program'

type Args = {
  accountType: PublicKey
  pool: PublicKey
  borrowAuthority: PublicKey
  amountBorrowed: BN
  shareAllowed: BN
}
export class PoolBorrowAuthorityData extends Borsh.Data<Args> {
  static readonly SCHEMA = this.struct([
    ['accountType', 'u8'],
    ['pool', 'publicKey'],
    ['borrowAuthority', 'publicKey'],
    ['amountBorrowed', 'u64'],
    ['shareAllowed', 'u16'],
  ])

  // Account type - PoolBorrowAuthority
  accountType: PublicKey
  // Pool
  pool: PublicKey
  // Borrow authority
  borrowAuthority: PublicKey
  // Amount borrowed
  amountBorrowed: BN
  // Share allowed
  shareAllowed: BN
}

export class PoolBorrowAuthority extends Account<PoolBorrowAuthorityData> {
  constructor(publicKey: PublicKey, info: AccountInfo<Buffer>) {
    super(publicKey, info)

    if (!this.assertOwner(GeneralPoolsProgram.PUBKEY)) {
      throw Errors.ERROR_INVALID_OWNER()
    }

    this.data = PoolBorrowAuthorityData.deserialize(this.info.data)
  }

  static getPDA(pool: PublicKey, borrowAuthority: PublicKey) {
    return GeneralPoolsProgram.findProgramAddress([
      pool.toBuffer(),
      borrowAuthority.toBuffer(),
    ])
  }

  static async findMany(connection: Connection, filters: { pool?: PublicKey } = {}) {
    return (
      await GeneralPoolsProgram.getProgramAccounts(connection, {
        filters: [
          // Filter for PoolBorrowAuthority by key
          {
            memcmp: {
              offset: 0,
              bytes: bs58.encode(Buffer.from([AccountType.PoolBorrowAuthority])),
            },
          },
          // Filter for assigned to pool
          filters.pool && {
            memcmp: {
              offset: 1,
              bytes: new PublicKey(filters.pool).toBase58(),
            },
          },
        ].filter(Boolean),
      })
    )
      .map((account) => {
        try {
          return PoolBorrowAuthority.from(account)
        } catch (err) {}
      })
      .filter(Boolean)
  }
}
