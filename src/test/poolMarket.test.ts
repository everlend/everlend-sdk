import { sendAndConfirmTransaction } from '@solana/web3.js'
import { AccountType, prepareInitPoolMarketTx, PoolMarket } from 'src'
import { connection, payer, payerPublicKey, POOL_MARKET_PUBKEY } from './utils'

describe('PoolMarket', () => {
  beforeAll(() => {})

  describe('PoolMarket', () => {
    test('load', async () => {
      const poolMarket = await PoolMarket.load(connection, POOL_MARKET_PUBKEY)

      expect(poolMarket.publicKey).toEqual(POOL_MARKET_PUBKEY)
      expect(poolMarket.data.accountType).toEqual(AccountType.PoolMarket)
    })
  })

  describe('InitPoolMarket', () => {
    test('success', async () => {
      const { tx, keypairs } = await prepareInitPoolMarketTx({ connection, payerPublicKey })
      const poolMarketKeypair = keypairs.poolMarket

      await sendAndConfirmTransaction(connection, tx, [payer, poolMarketKeypair], {
        commitment: 'confirmed',
      })

      const poolMarket = await PoolMarket.load(connection, poolMarketKeypair.publicKey)
      expect(poolMarket.publicKey).toEqual(poolMarketKeypair.publicKey)
    })
  })
})
