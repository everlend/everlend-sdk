import {
  ActionOptions,
  calcPotentialBalance,
  convertLamportsToTokenAmount,
  getMintsDecimals,
  getRewardPoolAndMiningAccount,
  IRewardIndex,
  IRewardToken,
} from '../utils'
import { PublicKey } from '@solana/web3.js'
import { Mining, RewardPool } from '../accounts'

/**
 * Give an array of reward balances for each pool
 *
 * @param actionOptions
 * @param authority main sol address
 * @param pools an array of pools for getting rewards
 *
 */

export const getRewardsByPool = async (
  { connection, network }: ActionOptions,
  authority: PublicKey,
  pools: PublicKey[],
) => {
  try {
    const rewardPoolsAndAccounts = await Promise.all(
      pools.map(
        async (pool) =>
          await getRewardPoolAndMiningAccount({ pool, connection, authority, network }),
      ),
    )
    const rewardPoolsInfo = await connection.getMultipleAccountsInfo(
      rewardPoolsAndAccounts.map((obj) => obj.rewardPool),
    )
    const miningAccountsInfo = await connection.getMultipleAccountsInfo(
      rewardPoolsAndAccounts.map((obj) => obj.miningAccount),
    )

    return await Promise.all(
      pools.map(async (pool, index) => {
        const { miningAccount: miningAccountPubKey, rewardPool: rewardPoolPubKey } =
          rewardPoolsAndAccounts[index]
        const rewardPoolInfo = rewardPoolsInfo[index]
        const miningAccountInfo = miningAccountsInfo[index]
        const rewardPool = new RewardPool(rewardPoolPubKey, rewardPoolInfo)
        const miningAccount = new Mining(miningAccountPubKey, miningAccountInfo)
        const poolRewards = [] as IRewardToken[]

        try {
          const { vaults } = rewardPool.data
          const rewardMints = vaults.map((vault) => new PublicKey(vault.rewardMint))
          const rewardMintsDecimals = await getMintsDecimals(rewardMints, connection)

          vaults.forEach((vault, idx) => {
            const rewardMint = vault.rewardMint.toString()
            const tokenDecimals = rewardMintsDecimals[idx].decimals
            const { indexes } = miningAccount.data
            let index = indexes.find((el) => {
              return el.rewardMint.toString() === rewardMint
            })

            if (!index) {
              index = {} as IRewardIndex
            }

            const refreshedBalance = index?.rewards?.toNumber() || 0
            const potentialRewardBalance = calcPotentialBalance(index, vault, miningAccount)

            const totalBalance = refreshedBalance + potentialRewardBalance
            const totalBalanceToUIAmount = convertLamportsToTokenAmount(totalBalance, tokenDecimals)

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
          })

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
