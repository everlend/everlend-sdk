import { ASSOCIATED_TOKEN_PROGRAM_ID, MintLayout, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction } from '@solana/web3.js'
import BN from 'bn.js'
import { CreateAssociatedTokenAccount, CreateMint, MintTo } from '../common'

export const ENDPOINT = 'http://localhost:8899'
export const connection = new Connection(ENDPOINT, 'recent')
export const payer = Keypair.fromSecretKey(
  Uint8Array.from([
    230, 130, 183, 211, 202, 141, 184, 115, 203, 212, 117, 219, 8, 19, 135, 200, 67, 52, 225, 10,
    106, 126, 118, 143, 20, 191, 14, 208, 157, 155, 199, 41, 109, 125, 225, 87, 230, 88, 40, 215,
    184, 236, 122, 125, 218, 233, 30, 111, 9, 20, 128, 200, 48, 109, 187, 135, 196, 140, 252, 2, 55,
    207, 142, 141,
  ]),
)
export const payerPublicKey = payer.publicKey

export const POOL_MARKET_PUBKEY: PublicKey = new PublicKey(
  '4P2WtU2RayKhRc1pfjJP5M9JmVVWZQi91za2ugJvHumG',
)
export const REGISTRY_PUBKEY: PublicKey = new PublicKey('6KCHtgSGR2WDE3aqrqSJppHRGVPgy9fHDX5XD8VZgb61')
export const POOL_PUBKEY: PublicKey = new PublicKey('CEDGxQ1Hga4LsCHAHme1C4RJM9fimTfwjUfokPM5YU8Q')
export const POOL2_PUBKEY: PublicKey = new PublicKey('4rEzYjgu8QyvG75waddZkTDdgP7XHy8YcWMxdNsPXAdV')
export const POOL_BORROW_AUTHORITY_PUBKEY: PublicKey = new PublicKey(
  '3XzKnYebNYu9rt7rxP8D9RCzkBXJ9zf9ucv6t9e6La3t',
)

export const createMint = async (tokenMint: Keypair) => {
  const mintRent = await connection.getMinimumBalanceForRentExemption(MintLayout.span)
  const createMintTx = new CreateMint(
    { feePayer: payer.publicKey },
    {
      newAccountPubkey: tokenMint.publicKey,
      lamports: mintRent,
    },
  )

  await sendAndConfirmTransaction(connection, createMintTx, [payer, tokenMint], {
    commitment: 'confirmed',
  })
}

export const createAssociatedTokenAccount = async (tokenMint: PublicKey) => {
  const publicKey = (
    await PublicKey.findProgramAddress(
      [payerPublicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), tokenMint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )
  )[0]
  const tx = new CreateAssociatedTokenAccount(
    { feePayer: payerPublicKey },
    {
      associatedTokenAddress: publicKey,
      tokenMint,
    },
  )

  await sendAndConfirmTransaction(connection, tx, [payer], {
    commitment: 'confirmed',
  })

  return publicKey
}

export const mintTo = async (tokenMint: PublicKey, destination: PublicKey, amount: BN) => {
  const tx = new MintTo(
    { feePayer: payerPublicKey },
    {
      mint: tokenMint,
      dest: destination,
      amount,
    },
  )

  await sendAndConfirmTransaction(connection, tx, [payer], {
    commitment: 'confirmed',
  })
}
