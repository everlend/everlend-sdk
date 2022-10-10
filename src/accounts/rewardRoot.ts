import { AccountInfo, PublicKey } from '@solana/web3.js'
import { Account, Borsh, Errors } from '../common'
import { RewardsAccountType, RewardProgram } from '../rewardProgram'

type Args = {
  accountType: RewardsAccountType
  authority: PublicKey
}

export class RootAccountData extends Borsh.Data<Args> {
  static readonly SCHEMA = this.struct([
    ['accountType', 'u8'],
    ['authority', 'publicKey'],
  ])

  accountType: RewardsAccountType
  authority: PublicKey
}

export class RewardsRoot extends Account<RootAccountData> {
  constructor(publicKey: PublicKey, info: AccountInfo<Buffer>) {
    super(publicKey, info)

    if (!this.assertOwner(RewardProgram.PUBKEY)) {
      throw Errors.ERROR_INVALID_OWNER()
    }

    this.data = RootAccountData.deserialize(this.info.data)
  }
}
