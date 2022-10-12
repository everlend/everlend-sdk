import { Connection, PublicKey } from '@solana/web3.js'
import { IRewardVault, Mining, Pool } from '../accounts'
import { IAmounts, IRewardIndex, NetworkType } from './types'
import { deserializeMint } from '../common'
import { Buffer } from 'buffer'
import BN from 'bn.js'

const INDEX_LAMPORTS = new BN('10000000000000000')
const CONFIG_MAINNET = '69C4Ba9LyQvWHPSSqXWXHnaedrLEuY49rSj23nJdrkkn'
const CONFIG_DEVNET = 'Hjm8ZVys6828sY9BxzuQhVwdsX1N28dqh3fKqbpGWu25'
const REWARD_PROGRAM_ID = new PublicKey('ELDR7M6m1ysPXks53T7da6zkhnhJV44twXLiAgTf2VpM')

const getConfig = (network: NetworkType) => {
  return new PublicKey(network === 'devnet' ? CONFIG_DEVNET : CONFIG_MAINNET)
}

interface IGetRewardPoolAndMiningAccountParams {
  pool: PublicKey
  connection: Connection
  authority: PublicKey
  network: NetworkType
  tokenMint?: PublicKey
}

export const getRewardPoolAndMiningAccount = async ({
  pool,
  connection,
  authority,
  network,
  tokenMint,
}: IGetRewardPoolAndMiningAccountParams): Promise<{
  rewardPool: PublicKey
  miningAccount: PublicKey
}> => {
  let foundTokenMint
  if (!tokenMint) {
    const {
      data: { tokenMint: loadedTokenMint },
    } = await Pool.load(connection, pool)
    foundTokenMint = loadedTokenMint
  } else {
    foundTokenMint = tokenMint
  }

  const [rewardPool] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('reward_pool'),
      getConfig(network).toBuffer(),
      new PublicKey(foundTokenMint).toBuffer(),
    ],
    REWARD_PROGRAM_ID,
  )

  // use it instead Mining.getPDA() for make it sync
  const [miningAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('mining'), authority.toBuffer(), rewardPool.toBuffer()],
    REWARD_PROGRAM_ID,
  )

  return {
    rewardPool,
    miningAccount,
  }
}

export const getMintsDecimals = async (mints: PublicKey[], connection: Connection) => {
  const mintsInfo = await connection.getMultipleAccountsInfo(mints)
  return mintsInfo.map((info) => {
    const deserializedMintInfo = deserializeMint(Buffer.from(info.data))

    return {
      mint: deserializedMintInfo.mintAuthority,
      decimals: deserializedMintInfo.decimals,
    }
  })
}

export const convertLamportsToTokenAmount = (lamports: number, decimals: number): number => {
  return lamports / 10 ** decimals
}

export const calcPotentialBalance = (
  index: IRewardIndex,
  vault: IRewardVault,
  miningAccount: Mining,
) => {
  if (!index?.indexWithPrecision) return 0

  const accountIndex = index?.indexWithPrecision ?? new BN(0)
  const vaultIndex = vault.indexWithPrecision

  if (vaultIndex.gt(accountIndex)) {
    const rewards = vaultIndex
      .sub(accountIndex)
      .mul(miningAccount.data.share)
      .div(INDEX_LAMPORTS)
      .toNumber()

    return Math.floor(rewards)
  }
  return 0
}

export const calcETokenRate = ({
  poolMintSupply,
  tokenAccountAmount,
  totalAmountBorrowed,
}: IAmounts) => {
  return poolMintSupply / (totalAmountBorrowed + tokenAccountAmount)
}
