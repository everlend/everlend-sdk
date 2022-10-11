import { AccountInfo, Connection, PublicKey } from '@solana/web3.js'
import { Buffer } from 'buffer'

export interface AccountConstructor<T> {
  new (publicKey: PublicKey, info: AccountInfo<Buffer>): T
}

export class Account<T = unknown> {
  readonly publicKey: PublicKey
  readonly info: AccountInfo<Buffer>
  data: T

  constructor(publicKey: PublicKey, info?: AccountInfo<Buffer>) {
    this.publicKey = new PublicKey(publicKey)
    this.info = info
  }

  static from<T>(this: AccountConstructor<T>, account: Account<unknown>) {
    return new this(account.publicKey, account.info)
  }

  static async load<T>(
    this: AccountConstructor<T>,
    connection: Connection,
    publicKey: PublicKey,
  ): Promise<T> {
    const info = await Account.getInfo(connection, publicKey)

    return new this(publicKey, info)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static isCompatible(data: Buffer): boolean {
    throw new Error(`method 'isCompatible' is not implemented`)
  }

  static async getInfo(connection: Connection, publicKey: PublicKey) {
    const info = await connection.getAccountInfo(new PublicKey(publicKey))
    if (!info) {
      throw new Error(`Unable to find account: ${publicKey}`)
    }

    return { ...info, data: Buffer.from(info?.data) }
  }

  assertOwner(publicKey: PublicKey) {
    return this.info?.owner.equals(new PublicKey(publicKey))
  }

  toJSON() {
    return {
      publicKey: this.publicKey.toString(),
      info: {
        executable: !!this.info?.executable,
        owner: this.info?.owner ? new PublicKey(this.info?.owner) : null,
        lamports: this.info?.lamports,
        data: this.info?.data.toJSON(),
      },
      data: this.data,
    }
  }

  toString() {
    return JSON.stringify(this.toJSON())
  }
}
