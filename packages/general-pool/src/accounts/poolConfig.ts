import { AccountType, GeneralPoolsProgram } from '../program'
import { AccountInfo, Connection, PublicKey } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Account, Borsh, Errors } from '@everlend/common'

type Args = {
  accountType: AccountType
  deposit_minimum: number
  withdraw_minimum: number
}

export class PoolConfigData extends Borsh.Data<Args> {
  static readonly SCHEMA = this.struct([
    ['accountType', 'u8'],
    ['deposit_minimum', 'u64'],
    ['withdraw_minimum', 'u64'],
  ])

  accountType: AccountType
  deposit_minimum: number
  withdraw_minimum: number
}

export class PoolConfig extends Account<PoolConfigData> {
  static readonly LEN = 17;

  constructor(key: PublicKey, info: AccountInfo<Buffer>) {
    super(key, info)

    if (!this.assertOwner(GeneralPoolsProgram.PUBKEY)) {
      throw Errors.ERROR_INVALID_OWNER()
    }

    this.data = PoolConfigData.deserialize(this.info.data)
  }

  static getPDA(pool: PublicKey) {
    return GeneralPoolsProgram.findProgramAddress([
      Buffer.from('config'),
      pool.toBuffer(),
    ])
  }

  /**
   * Get batch pool configs
   *
   * @param connection the JSON RPC connection instance.
   * @param pools public keys of pools to load configs for
   */
  static async findMany(
    connection: Connection,
    pools: PublicKey[],
  ) {
    const poolConfigs: PublicKey[] = []
    for (const pool of pools) {
      const poolConfig = await PoolConfig.getPDA(pool)
      poolConfigs.push(poolConfig)
    }

    const poolConfigAccounts = await connection.getMultipleAccountsInfo(poolConfigs)
    return poolConfigAccounts.map((account, idx) => {
      if (account == null) {
        return
      }

      try {
          return new PoolConfig(poolConfigs[idx], account)
      } catch (err) {
          console.error(new Error(`cannot deserialize pool config for ${pools[idx].toString()}`))
      }
    }).filter(Boolean)
  }
}
