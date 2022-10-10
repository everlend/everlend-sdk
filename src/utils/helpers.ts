import { Connection, PublicKey } from '@solana/web3.js'
import { Mining, Pool, RewardPool } from '../accounts'
import { ActionOptions, NetworkType, IRewardIndex, IRewardToken } from './types'
import BN from 'bn.js'
import { deserialize } from '../common'
import { Buffer } from 'buffer'

const INDEX_LAMPORTS = 10000000000000000
const CONFIG_MAINNET = '69C4Ba9LyQvWHPSSqXWXHnaedrLEuY49rSj23nJdrkkn'
const CONFIG_DEVNET = 'Hjm8ZVys6828sY9BxzuQhVwdsX1N28dqh3fKqbpGWu25'
const REWARD_PROGRAM_ID = new PublicKey('ELDR7M6m1ysPXks53T7da6zkhnhJV44twXLiAgTf2VpM')

const getConfig = (network: NetworkType) => {
  return new PublicKey(network === 'devnet' ? CONFIG_DEVNET : CONFIG_MAINNET)
}

export const getRewardPoolAndAccount = async (
  pool: PublicKey,
  connection: Connection,
  user: PublicKey,
  network: NetworkType,
): Promise<{
  rewardPool: PublicKey
  rewardAccount: PublicKey
}> => {
  const {
    data: { tokenMint },
  } = await Pool.load(connection, pool)

  const [rewardPool] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('reward_pool'),
      getConfig(network).toBuffer(),
      new PublicKey(tokenMint).toBuffer(),
    ],
    REWARD_PROGRAM_ID,
  )

  const rewardAccount = await Mining.getPDA(user, rewardPool)

  return {
    rewardPool,
    rewardAccount,
  }
}

const getMintDecimals = async (mint: PublicKey, connection: Connection) => {
  const mintInfo = await connection.getAccountInfo(mint)
  const deserializedMintInfo = deserialize(Buffer.from(mintInfo.data))

  return deserializedMintInfo.decimals
}

const convertLamportsToTokenAmount = (lamports: number, decimals: number): number => {
  return lamports / 10 ** decimals
}

export const getRewardsByPool = async (
  { connection, user, network }: ActionOptions,
  pools: PublicKey[],
) => {
  try {
    const rewardPoolsAndAccounts = await Promise.all(
      pools.map(async (pool) => await getRewardPoolAndAccount(pool, connection, user, network)),
    )
    const rewardPoolsInfo = await connection.getMultipleAccountsInfo(
      rewardPoolsAndAccounts.map((obj) => obj.rewardPool),
    )
    const rewardAccountsInfo = await connection.getMultipleAccountsInfo(
      rewardPoolsAndAccounts.map((obj) => obj.rewardAccount),
    )

    return await Promise.all(
      pools.map(async (pool, index) => {
        const { rewardAccount: rewardAccountPK, rewardPool: rewardPoolPK } =
          rewardPoolsAndAccounts[index]
        const rewardPoolInfo = rewardPoolsInfo[index]
        const rewardAccountInfo = rewardAccountsInfo[index]
        const rewardPool = new RewardPool(rewardPoolPK, rewardPoolInfo)
        const rewardAccount = new Mining(rewardAccountPK, rewardAccountInfo)
        const poolRewards = [] as IRewardToken[]

        try {
          const { vaults } = rewardPool.data

          await Promise.all(
            vaults.map(async (vault) => {
              const rewardMint = vault.rewardMint.toString()
              const tokenDecimals = await getMintDecimals(new PublicKey(rewardMint), connection)
              const { indexes } = rewardAccount.data
              let index = indexes.find((el) => {
                return el.rewardMint.toString() === rewardMint
              })

              if (!index) {
                index = {} as IRewardIndex
              }

              const potentialBalance = async () => {
                if (!index?.indexWithPrecision) return 0

                const accountIndex = index?.indexWithPrecision ?? new BN(0)
                const vaultIndex = vault.indexWithPrecision

                if (vaultIndex.gt(accountIndex)) {
                  const rewards = vaultIndex
                    .sub(accountIndex)
                    .mul(rewardAccount.data.share)
                    .div(new BN(INDEX_LAMPORTS.toString()))
                    .toNumber()

                  return Math.floor(rewards)
                }
                return 0
              }

              const refreshedBalance = index?.rewards?.toNumber() || 0
              const potentialRewardBalance = await potentialBalance()

              const totalBalance = refreshedBalance + potentialRewardBalance
              const totalBalanceToUIAmount = convertLamportsToTokenAmount(
                totalBalance,
                tokenDecimals,
              )

              if (totalBalance) {
                poolRewards.push({
                  rewardMint,
                  balance: {
                    lamports: totalBalance,
                    ui: totalBalanceToUIAmount,
                    decimals: tokenDecimals,
                  },
                })
              }
            }),
          )

          return {
            pool: pool.toString(),
            poolRewards,
          }
        } catch (e) {
          console.error(e)
        }
      }),
    )
  } catch (e) {
    console.error(e)
  }
}
