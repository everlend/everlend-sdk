import { Connection, PublicKey } from '@solana/web3.js'
import { deserializeMint, deserializeTokenAccount, findAssociatedTokenAccount } from '../common'
import { Pool } from '../accounts'
import { EverlendActions } from '../everlendActions'
import { UserCompoundBalancesByPool } from '../utils'

/**
 * Calculates user's compound balance by pools. If no pools are provided,
 * all the Everlend general pools will be automatically loaded.
 *
 * @param connection the JSON RPC connection instance.
 * @param owner the owner account, the account is used to find ATAs of pool mints.
 * @param poolMarket the public key which represents the main manager root account which is used for generating PDAs.
 * @param pools the general pools. If absent all the pools will be loaded instead.
 */

export const getUserCompoundBalancesByPools = async (
  connection: Connection,
  owner: PublicKey,
  poolMarket: PublicKey,
  pools?: Pool[],
): Promise<UserCompoundBalancesByPool> => {
  const _pools =
    pools ??
    (await Pool.findMany(connection, {
      poolMarket,
    }))

  const poolMints: PublicKey[] = []
  const tokenAccounts: PublicKey[] = []
  const poolMintsATAs: PublicKey[] = []
  for (const pool of _pools) {
    const { poolMint } = pool.data
    poolMints.push(poolMint)

    tokenAccounts.push(pool.data.tokenAccount)

    const foundATA = await findAssociatedTokenAccount(owner, poolMint)
    poolMintsATAs.push(foundATA)
  }

  const poolMintsInfo = await connection.getMultipleAccountsInfo(poolMints)
  const tokenAccountsInfo = await connection.getMultipleAccountsInfo(tokenAccounts)
  const poolMintsATAsInfo = await connection.getMultipleAccountsInfo(poolMintsATAs)

  return _pools.reduce((acc, pool, index) => {
    const poolMintInfoDeserialized = deserializeMint(poolMintsInfo[index].data)

    const tokenAccountBalance = deserializeTokenAccount(
      tokenAccountsInfo[index].data,
    ).amount.toNumber()

    const poolMintATAInfo = poolMintsATAsInfo[index]
    const eTokenAmount =
      poolMintATAInfo === null ? 0 : deserializeTokenAccount(poolMintATAInfo.data).amount.toNumber()

    const eTokenRate = EverlendActions.calcETokenRate({
      poolMintSupply: poolMintInfoDeserialized.supply.toNumber(),
      totalAmountBorrowed: pool.data.totalAmountBorrowed.toNumber(),
      tokenAccountAmount: tokenAccountBalance,
    })

    acc[pool.publicKey.toString()] = {
      balance: Math.floor(eTokenAmount / eTokenRate),
      tokenMint: pool.data.tokenMint,
    }

    return acc
  }, {})
}
