import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { Keypair, PublicKey, sendAndConfirmTransaction } from '@solana/web3.js'
import BN from 'bn.js'
import { AccountType, createPool, deposit, Pool, withdraw } from '../src'
import {
  connection,
  createMint,
  payer,
  payerPublicKey,
  POOL_MARKET_PUBKEY,
  POOL_PUBKEY,
} from './utils'

describe('Pool', () => {
  let source: PublicKey
  let destination: PublicKey

  beforeAll(async () => {
    console.log(payerPublicKey)

    const {
      data: { tokenMint, poolMint },
    } = await Pool.load(connection, POOL_PUBKEY)
    source = (
      await PublicKey.findProgramAddress(
        [payerPublicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), tokenMint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID,
      )
    )[0]
    destination = (
      await PublicKey.findProgramAddress(
        [payerPublicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), poolMint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID,
      )
    )[0]
  })

  describe('Pool', () => {
    test('load', async () => {
      const pool = await Pool.load(connection, POOL_PUBKEY)

      expect(pool.publicKey).toEqual(POOL_PUBKEY)
      expect(pool.data.accountType).toEqual(AccountType.Pool)
    })

    test('findMany', async () => {
      const pools = await Pool.findMany(connection, { poolMarket: POOL_MARKET_PUBKEY })

      expect(pools[0].data.accountType).toEqual(AccountType.Pool)
    })
  })

  describe('CreatePool', () => {
    const tokenMint = Keypair.generate()

    beforeAll(async () => {
      await createMint(tokenMint)
    })

    test('success', async () => {
      const { tx, keypairs } = await createPool(
        { connection, payerPublicKey },
        POOL_MARKET_PUBKEY,
        tokenMint.publicKey,
      )
      const tokenAccountKeypair = keypairs.tokenAccount
      const poolMintKeypair = keypairs.poolMint
      const poolPubkey = await Pool.getPDA(POOL_MARKET_PUBKEY, tokenMint.publicKey)

      await sendAndConfirmTransaction(
        connection,
        tx,
        [payer, tokenAccountKeypair, poolMintKeypair],
        {
          commitment: 'confirmed',
        },
      )

      const pool = await Pool.load(connection, poolPubkey)
      expect(pool.publicKey).toEqual(poolPubkey)
    })
  })

  describe('Deposit', () => {
    test('success', async () => {
      const amount = new BN(1000)
      const { tx } = await deposit(
        { connection, payerPublicKey },
        POOL_PUBKEY,
        amount,
        source,
        destination,
      )

      const {
        data: { tokenAccount },
      } = await Pool.load(connection, POOL_PUBKEY)
      const balance0 = new BN((await connection.getTokenAccountBalance(tokenAccount)).value.amount)

      await sendAndConfirmTransaction(connection, tx, [payer], {
        commitment: 'confirmed',
      })

      const balance1 = new BN((await connection.getTokenAccountBalance(tokenAccount)).value.amount)
      expect(balance1.eq(balance0.add(amount))).toBeTruthy()
    })
  })

  describe('Withdraw', () => {
    test('success', async () => {
      const amount = new BN(1000)
      const { tx } = await withdraw(
        { connection, payerPublicKey },
        POOL_PUBKEY,
        amount,
        destination,
        source,
      )

      const {
        data: { tokenAccount },
      } = await Pool.load(connection, POOL_PUBKEY)
      const balance0 = new BN((await connection.getTokenAccountBalance(tokenAccount)).value.amount)

      await sendAndConfirmTransaction(connection, tx, [payer], {
        commitment: 'confirmed',
      })

      const balance1 = new BN((await connection.getTokenAccountBalance(tokenAccount)).value.amount)
      expect(balance1.eq(balance0.sub(amount))).toBeTruthy()
    })
  })
})
