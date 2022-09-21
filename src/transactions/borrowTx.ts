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

export class BorrowTxData extends Borsh.Data<{ amount: BN }> {
  static readonly SCHEMA = this.struct([
    ['instruction', 'u8'],
    ['amount', 'u64'],
  ])

  instruction = 7
}

type BorrowTxParams = {
  poolMarket: PublicKey
  pool: PublicKey
  poolBorrowAuthority: PublicKey
  destination: PublicKey
  tokenAccount: PublicKey
  poolMarketAuthority: PublicKey
  amount: BN
  borrowAuthority?: PublicKey
}

export class BorrowTx extends Transaction {
  constructor(options: TransactionCtorFields, params: BorrowTxParams) {
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

    const data = BorrowTxData.serialize({ amount })

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
        programId: GeneralPoolsProgram.PUBKEY,
        data,
      }),
    )
  }
}
