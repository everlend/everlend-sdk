import {
  AccountInfo as TokenAccountInfo,
  AccountLayout,
  TOKEN_PROGRAM_ID,
  u64,
} from '@solana/spl-token'
import { AccountInfo, Connection, PublicKey } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { ERROR_INVALID_OWNER, ERROR_INVALID_ACCOUNT_DATA } from '../../errors'
import { Account } from '../../base'

export interface DeserializeTokenResponse {
  amount: u64
  closeAuthority: null | PublicKey
  closeAuthorityOption: number
  delegate: null | PublicKey
  delegateOption: number
  delegatedAmount: u64
  isFrozen: boolean
  isNative: boolean
  isNativeOption: number
  mint: PublicKey
  owner: PublicKey
  state: number
  rentExemptReserve: null | number
}

export class TokenAccount extends Account<TokenAccountInfo> {
  constructor(publicKey: PublicKey, info: AccountInfo<Buffer>) {
    super(publicKey, info)

    if (!this.assertOwner(TOKEN_PROGRAM_ID)) {
      throw ERROR_INVALID_OWNER()
    }

    if (!TokenAccount.isCompatible(this.info.data)) {
      throw ERROR_INVALID_ACCOUNT_DATA()
    }

    this.data = deserializeTokenAccount(this.info.data)
  }

  static isCompatible(data: Buffer) {
    return data.length === AccountLayout.span
  }

  static async getTokenAccountsByOwner(connection: Connection, owner: PublicKey) {
    return (
      await connection.getTokenAccountsByOwner(new PublicKey(owner), {
        programId: TOKEN_PROGRAM_ID,
      })
    ).value.map(({ pubkey, account }) => new TokenAccount(pubkey, account))
  }
}

export const deserializeTokenAccount = (data: Buffer) => {
  const accountInfo = AccountLayout.decode(data)
  accountInfo.mint = new PublicKey(accountInfo.mint)
  accountInfo.owner = new PublicKey(accountInfo.owner)
  accountInfo.amount = u64.fromBuffer(accountInfo.amount)

  if (accountInfo.delegateOption === 0) {
    accountInfo.delegate = null
    accountInfo.delegatedAmount = new u64(0)
  } else {
    accountInfo.delegate = new PublicKey(accountInfo.delegate)
    accountInfo.delegatedAmount = u64.fromBuffer(accountInfo.delegatedAmount)
  }

  accountInfo.isInitialized = accountInfo.state !== 0
  accountInfo.isFrozen = accountInfo.state === 2

  if (accountInfo.isNativeOption === 1) {
    accountInfo.rentExemptReserve = u64.fromBuffer(accountInfo.isNative)
    accountInfo.isNative = true
  } else {
    accountInfo.rentExemptReserve = null
    accountInfo.isNative = false
  }

  if (accountInfo.closeAuthorityOption === 0) {
    accountInfo.closeAuthority = null
  } else {
    accountInfo.closeAuthority = new PublicKey(accountInfo.closeAuthority)
  }

  return accountInfo
}
