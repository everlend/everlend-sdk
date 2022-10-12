import {
  ActionResult,
  calcETokenRate,
  GetRewardsByPoolsResponse,
  IAmounts,
  NetworkType,
} from './utils'
import { Connection, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import {
  getRewardsByPool,
  prepareDepositTx,
  prepareInititalizeMining,
  prepareTransferDepositTx,
  prepareWithdrawalRequestTx,
  prepareWithdrawalTx,
} from './actions'
import { Pool } from './accounts'
import { getUserCompoundBalancesByPools } from './actions'

type EverlendActionsParams = {
  network: NetworkType
  connection: Connection
  feePayer: PublicKey
}

export class EverlendActions {
  private network: NetworkType
  private connection: Connection
  private feePayer: PublicKey

  constructor({ network, connection, feePayer }: EverlendActionsParams) {
    this.feePayer = feePayer
    this.network = network
    this.connection = connection
  }

  async getDepositTx(
    pool: PublicKey,
    authority: PublicKey,
    amount: BN,
    source: PublicKey,
    destination?: PublicKey,
  ): Promise<ActionResult> {
    const { connection, feePayer, network } = this
    return await prepareDepositTx(
      { connection, feePayer, network },
      pool,
      authority,
      amount,
      source,
      destination,
    )
  }

  async getWithdrawalRequestTx(
    pool: PublicKey,
    authority: PublicKey,
    amount: BN,
    source: PublicKey,
    destination?: PublicKey,
  ): Promise<ActionResult> {
    const { connection, feePayer, network } = this
    return await prepareWithdrawalRequestTx(
      { connection, feePayer, network },
      pool,
      authority,
      amount,
      source,
      destination,
    )
  }

  async getWithdrawalTx(withdrawalRequest: PublicKey): Promise<ActionResult> {
    const { connection, feePayer, network } = this
    return await prepareWithdrawalTx({ connection, feePayer, network }, withdrawalRequest)
  }

  async getRewards(authority: PublicKey, pools: PublicKey[]): Promise<GetRewardsByPoolsResponse[]> {
    const { connection, network, feePayer } = this
    return await getRewardsByPool({ connection, network, feePayer }, authority, pools)
  }

  async getTransferDepositTx(
    authority: PublicKey,
    pool: PublicKey,
    source: PublicKey,
    destination: PublicKey,
    destinationUserAuthority: PublicKey,
    destinationRewardAccount: PublicKey,
  ): Promise<ActionResult> {
    const { connection, feePayer, network } = this
    return await prepareTransferDepositTx(
      { connection, feePayer, network },
      authority,
      pool,
      source,
      destination,
      destinationUserAuthority,
      destinationRewardAccount,
    )
  }

  async getInintMiningTx(
    authority: PublicKey,
    rewardPool: PublicKey,
    mining?: PublicKey,
  ): Promise<ActionResult> {
    const { connection, feePayer } = this
    return await prepareInititalizeMining({ connection, feePayer }, authority, rewardPool, mining)
  }

  static calcETokenRate = calcETokenRate

  async getUserCompoundBalancesByPools(owner: PublicKey, poolMarket: PublicKey, pools?: Pool[]) {
    return await getUserCompoundBalancesByPools(this.connection, owner, poolMarket, pools)
  }
}
