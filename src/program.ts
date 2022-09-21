import { PublicKey } from '@solana/web3.js'
import { Program } from './common'

export enum AccountType {
  Uninitialized = 0,
  PoolMarket = 1,
  Pool = 2,
  PoolBorrowAuthority = 3,
  WithdrawRequests = 4,
  WithdrawRequest = 5,
}

export class GeneralPoolsProgram extends Program {
  static readonly PUBKEY = new PublicKey('GenUMNGcWca1GiPLfg89698Gfys1dzk9BAGsyb9aEL2u')
}
