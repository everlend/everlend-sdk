import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  PublicKey,
  Transaction,
  TransactionCtorFields,
  TransactionInstruction,
} from '@solana/web3.js'
import BN from 'bn.js'
import { Borsh } from '../common'
import { GeneralPoolsProgram } from '../program'

export class RepayTxData extends Borsh.Data<{ amount: BN; interestAmount: BN }> {
  static readonly SCHEMA = this.struct([
    ['instruction', 'u8'],
    ['amount', 'u64'],
    ['interestAmount', 'u64'],
  ])

  instruction = 8
}

type RepayTxParams = {
  poolMarket: PublicKey
  pool: PublicKey
  poolBorrowAuthority: PublicKey
  source: PublicKey
  tokenAccount: PublicKey
  amount: BN
  interestAmount: BN
}

export class RepayTx extends Transaction {
  constructor(options: TransactionCtorFields, params: RepayTxParams) {
    super(options)
    const { feePayer } = options
    const { poolMarket, pool, poolBorrowAuthority, source, tokenAccount, amount, interestAmount } =
      params

    const data = RepayTxData.serialize({ amount, interestAmount })

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
        programId: GeneralPoolsProgram.PUBKEY,
        data,
      }),
    )
  }
}
