import { MintInfo, MintLayout, TOKEN_PROGRAM_ID, u64 } from '@solana/spl-token'
import { AccountInfo, PublicKey } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { ERROR_INVALID_OWNER, ERROR_INVALID_ACCOUNT_DATA } from '../../errors'
import { Account } from '../../base'

export class Mint extends Account<MintInfo> {
  constructor(publicKey: PublicKey, info: AccountInfo<Buffer>) {
    super(publicKey, info)

    if (!this.assertOwner(TOKEN_PROGRAM_ID)) {
      throw ERROR_INVALID_OWNER()
    }

    if (!Mint.isCompatible(this.info.data)) {
      throw ERROR_INVALID_ACCOUNT_DATA()
    }

    this.data = deserialize(this.info.data)
  }

  static isCompatible(data: Buffer) {
    return data.length === MintLayout.span
  }
}

export const deserialize = (data: Buffer) => {
  const mintInfo = MintLayout.decode(data)

  if (mintInfo.mintAuthorityOption === 0) {
    mintInfo.mintAuthority = null
  } else {
    mintInfo.mintAuthority = new PublicKey(mintInfo.mintAuthority)
  }

  mintInfo.supply = u64.fromBuffer(mintInfo.supply)
  mintInfo.isInitialized = mintInfo.isInitialized != 0

  if (mintInfo.freezeAuthorityOption === 0) {
    mintInfo.freezeAuthority = null
  } else {
    mintInfo.freezeAuthority = new PublicKey(mintInfo.freezeAuthority)
  }

  return mintInfo
}
