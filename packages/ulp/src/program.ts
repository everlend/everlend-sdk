import { PublicKey } from '@solana/web3.js'
import { Program } from '@everlend/common'

export enum AccountType {
  Uninitialized = 0,
  PoolMarket = 1,
  Pool = 2,
  PoolBorrowAuthority = 3,
}

export class LiquidityPoolsProgram extends Program {
  static readonly PUBKEY = new PublicKey('ULPo9DYcrWaAG9XGPwDoLP52qgzfaxKq1QConw2AQV6')
}
