import { AccountInfo, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { Account, Borsh, Errors } from '../common'
import { RewardProgram } from '../rewardProgram'
import { Buffer } from 'buffer'

const PRECISION = 1_000_000_000_000_000_0

interface IRewardIndex {
  rewardMint: PublicKey
  indexWithPrecision: BN
  rewards: BN
}

interface Args {
  anchorId: Array<BN>
  rewardPool: PublicKey
  bump: BN
  share: BN
  owner: PublicKey
  indexes: Array<IRewardIndex>
}

const map = <T>(type: any, fields: any) => {
  const entries = type.map((v, i) => {
    return [v, { kind: 'struct', fields: fields[i] }]
  })

  return new Map<any, any>(entries)
}

export class RewardIndex extends Borsh.Data<RewardIndex> {
  static readonly SCHEMA = this.struct([
    ['rewardMint', 'publicKey'],
    ['indexWithPrecision', 'u128'],
    ['rewards', 'u128'],
  ])
  rewardMint: PublicKey
  indexWithPrecision: BN
  rewards: BN
}

export class MiningData extends Borsh.Data<Args> {
  static readonly SCHEMA = map(
    [RewardIndex, this],
    [
      [
        ['rewardMint', 'publicKey'],
        ['indexWithPrecision', 'u128'],
        ['rewards', 'u64'],
      ],
      [
        ['anchorId', ['u8', 8]],
        ['rewardPool', 'publicKey'],
        ['bump', 'u8'],
        ['share', 'u64'],
        ['owner', 'publicKey'],
        ['indexes', [RewardIndex]],
      ],
    ],
  )

  anchorId: Array<BN>
  rewardPool: PublicKey
  bump: BN
  share: BN
  owner: PublicKey
  indexes: Array<RewardIndex>
}

export class Mining extends Account<MiningData> {
  constructor(publicKey: PublicKey, info: AccountInfo<Buffer>) {
    super(publicKey, info)

    if (!this.assertOwner(RewardProgram.PUBKEY)) {
      throw Errors.ERROR_INVALID_OWNER()
    }

    this.data = MiningData.deserialize(this.info.data)
  }

  static getPDA(user: PublicKey, rewardPool: PublicKey) {
    return RewardProgram.findProgramAddress([
      Buffer.from('mining'),
      user.toBuffer(),
      rewardPool.toBuffer(),
    ])
  }
}
