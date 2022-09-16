import { AccountType, GeneralPoolsProgram } from '../program'
import { AccountInfo, Connection, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import bs58 from 'bs58'
import { Buffer } from 'buffer'
import { Account, Borsh, Errors } from '@everlend/common'

type Args = {
  accountType: AccountType
  pool: PublicKey
  from: PublicKey
  source: PublicKey
  destination: PublicKey
  liquidityAmount: BN
  collateralAmount: BN
  ticket: BN
}

export class UserWithdrawalRequestData extends Borsh.Data<Args> {
  static readonly SCHEMA = this.struct([
    ['accountType', 'u8'],
    ['pool', 'publicKey'],
    ['from', 'publicKey'],
    ['source', 'publicKey'],
    ['destination', 'publicKey'],
    ['liquidityAmount', 'u64'],
    ['collateralAmount', 'u64'],
    ['ticket', 'u64'],
  ])

  accountType: AccountType
  pool: PublicKey
  from: PublicKey
  source: PublicKey
  destination: PublicKey
  liquidityAmount: BN
  collateralAmount: BN
  ticket: BN
}

export class UserWithdrawalRequest extends Account<UserWithdrawalRequestData> {
  static readonly LEN = 153

  constructor(key: PublicKey, info: AccountInfo<Buffer>) {
    super(key, info)

    if (!this.assertOwner(GeneralPoolsProgram.PUBKEY)) {
      throw Errors.ERROR_INVALID_OWNER()
    }

    this.data = UserWithdrawalRequestData.deserialize(this.info.data)
  }

  static getPDA(withdrawalRequests: PublicKey, from: PublicKey) {
    return GeneralPoolsProgram.findProgramAddress([
      Buffer.from('withdrawal'),
      withdrawalRequests.toBuffer(),
      from.toBuffer(),
    ])
  }

  static getUnwrapSOLPDA(withdrawalRequest: PublicKey) {
    return GeneralPoolsProgram.findProgramAddress([
      Buffer.from(`unwrap`),
      new PublicKey(withdrawalRequest).toBuffer(),
    ])
  }

  /**
   * Finds user's unfinished withdrawal requests. Also, can filter them.
   *
   * @param connection the JSON RPC connection instance.
   * @param filters the filter config object.
   */
  static async findMany(
    connection: Connection,
    filters: {
      /** the public key which represents a general pool address. */
      pool?: PublicKey
      /** the public key which initialized withdrawal requests, usually user's SOL account (owner address). */
      from?: PublicKey
    } = {},
  ) {
    return (
      await GeneralPoolsProgram.getProgramAccounts(connection, {
        filters: [
          // Filter for WithdrawRequest by key
          {
            memcmp: {
              offset: 0,
              bytes: bs58.encode(Buffer.from([AccountType.WithdrawRequest])),
            },
          },
          // Filter for assigned to pool
          filters.pool && {
            memcmp: {
              offset: 1,
              bytes: new PublicKey(filters.pool).toBase58(),
            },
          },
          // Filter for assigned to from
          filters.from && {
            memcmp: {
              offset: 33,
              bytes: new PublicKey(filters.from).toBase58(),
            },
          },
        ].filter(Boolean),
      })
    )
      .map((account) => {
        try {
          return UserWithdrawalRequest.from(account)
        } catch (err) {}
      })
      .filter(Boolean)
  }
}
