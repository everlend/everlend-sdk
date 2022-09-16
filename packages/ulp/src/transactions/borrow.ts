import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  PublicKey,
  Transaction,
  TransactionCtorFields,
  TransactionInstruction,
} from '@solana/web3.js'
import BN from 'bn.js'
import { Borsh } from '@everlend/common'
import { LiquidityPoolsProgram } from '../program'

export class BorrowArgs extends Borsh.Data<{ amount: BN }> {
  static readonly SCHEMA = this.struct([
    ['instruction', 'u8'],
    ['amount', 'u64'],
  ])

  instruction = 7
}

type BorrowParams = {
  poolMarket: PublicKey
  pool: PublicKey
  poolBorrowAuthority: PublicKey
  destination: PublicKey
  tokenAccount: PublicKey
  poolMarketAuthority: PublicKey
  amount: BN
  borrowAuthority?: PublicKey
}

export class Borrow extends Transaction {
  constructor(options: TransactionCtorFields, params: BorrowParams) {
    super(options)
    const { feePayer } = options
    const {
      poolMarket,
      pool,
      poolBorrowAuthority,
      destination,
      tokenAccount,
      poolMarketAuthority,
      borrowAuthority,
      amount,
    } = params

    const data = BorrowArgs.serialize({ amount })

    this.add(
      new TransactionInstruction({
        keys: [
          { pubkey: poolMarket, isSigner: false, isWritable: false },
          { pubkey: pool, isSigner: false, isWritable: true },
          { pubkey: poolBorrowAuthority, isSigner: false, isWritable: true },
          { pubkey: destination, isSigner: false, isWritable: true },
          { pubkey: tokenAccount, isSigner: false, isWritable: true },
          { pubkey: poolMarketAuthority, isSigner: false, isWritable: false },
          { pubkey: borrowAuthority || feePayer, isSigner: true, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: LiquidityPoolsProgram.PUBKEY,
        data,
      }),
    )
  }
}
