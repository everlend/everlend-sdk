import {
  PublicKey,
  Transaction,
  TransactionCtorFields,
  TransactionInstruction,
} from '@solana/web3.js'
import { Borsh } from '@everlend/common'
import { LiquidityPoolsProgram } from '../program'

export class DeletePoolBorrowAuthorityArgs extends Borsh.Data {
  static readonly SCHEMA = this.struct([['instruction', 'u8']])

  instruction = 4
}

type DeletePoolBorrowAuthorityParams = {
  poolBorrowAuthority: PublicKey
  receiver: PublicKey
  manager?: PublicKey
}

export class DeletePoolBorrowAuthority extends Transaction {
  constructor(options: TransactionCtorFields, params: DeletePoolBorrowAuthorityParams) {
    super(options)
    const { feePayer } = options
    const { poolBorrowAuthority, receiver, manager } = params

    const data = DeletePoolBorrowAuthorityArgs.serialize()

    this.add(
      new TransactionInstruction({
        keys: [
          { pubkey: poolBorrowAuthority, isSigner: false, isWritable: true },
          { pubkey: receiver, isSigner: false, isWritable: true },
          { pubkey: manager || feePayer, isSigner: true, isWritable: false },
        ],
        programId: LiquidityPoolsProgram.PUBKEY,
        data,
      }),
    )
  }
}
