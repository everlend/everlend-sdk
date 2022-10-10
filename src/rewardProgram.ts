import { PublicKey } from '@solana/web3.js'
import { Program } from './common'

export enum RewardsAccountType {
  Uninitialized = 0,
  RewardsRoot = 1,
  RewardPool = 2,
}

export class RewardProgram extends Program {
  static readonly PUBKEY = new PublicKey('ELDR7M6m1ysPXks53T7da6zkhnhJV44twXLiAgTf2VpM')
}
