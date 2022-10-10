import { AccountInfo, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { Account, Borsh, Errors } from '../common'
import { RewardProgram } from '../rewardProgram'
import { Buffer } from 'buffer'

const PRECISION = 1_000_000_000_000_000_0

type IRewardIndex = {
  rewardMint: PublicKey
  indexWithPrecision: BN
  rewards: BN
}

type Args = {
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

  /**
   * Calculates user's claim amount.
   *
   * @param rewardMint Reward mint
   * @param rewardPool Reward pool
   */
  // getUserClaimAmount(rewardMint: PublicKey, rewardPool: RewardPool) {
  //   const share = this.share
  //
  //   for (const vault of rewardPool.data.vaults) {
  //     const rewardIndex = this.indexes.find((i) => i.rewardMint == vault.rewardMint)
  //     const rewardIndexI = this.indexes.indexOf(rewardIndex)
  //
  //     if (vault.indexWithPrecision.toNumber() > rewardIndex) {
  //       const rewards =
  //         ((vault.indexWithPrecision - rewardIndex.indexWithPrecision) * share) / PRECISION
  //
  //       if (rewards > 0) {
  //         this.indexes[rewardIndexI].rewards = rewardIndex.rewards.toNumber() + rewards
  //       }
  //
  //       this.indexes[rewardIndexI].indexWithPrecision = vault.indexWithPrecision
  //     }
  //
  //     vault.indexWithPrecision
  //   }
  //
  //   const index = this.indexes.find((i) => i.rewardMint == rewardMint)
  //
  //   return index.rewards
  // }
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
