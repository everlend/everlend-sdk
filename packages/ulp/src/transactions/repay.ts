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

export class RepayArgs extends Borsh.Data<{ amount: BN; interestAmount: BN }> {
  static readonly SCHEMA = this.struct([
    ['instruction', 'u8'],
    ['amount', 'u64'],
    ['interestAmount', 'u64'],
  ])

  instruction = 8
}

type RepayParams = {
  poolMarket: PublicKey
  pool: PublicKey
  poolBorrowAuthority: PublicKey
  source: PublicKey
  tokenAccount: PublicKey
  amount: BN
  interestAmount: BN
}

export class Repay extends Transaction {
  constructor(options: TransactionCtorFields, params: RepayParams) {
    super(options)
    const { feePayer } = options
    const { poolMarket, pool, poolBorrowAuthority, source, tokenAccount, amount, interestAmount } =
      params

    const data = RepayArgs.serialize({ amount, interestAmount })

    this.add(
      new TransactionInstruction({
        keys: [
          { pubkey: poolMarket, isSigner: false, isWritable: false },
          { pubkey: pool, isSigner: false, isWritable: true },
          { pubkey: poolBorrowAuthority, isSigner: false, isWritable: true },
          { pubkey: source, isSigner: false, isWritable: true },
          { pubkey: tokenAccount, isSigner: false, isWritable: true },
          { pubkey: feePayer, isSigner: true, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: LiquidityPoolsProgram.PUBKEY,
        data,
      }),
    )
  }
}
