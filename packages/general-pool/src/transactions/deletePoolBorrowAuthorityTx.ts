import {
  PublicKey,
  Transaction,
  TransactionCtorFields,
  TransactionInstruction,
} from '@solana/web3.js'
import { Borsh } from '@everlend/common'
import { GeneralPoolsProgram } from '../program'

export class DeletePoolBorrowAuthorityTxData extends Borsh.Data {
  static readonly SCHEMA = this.struct([['instruction', 'u8']])

  instruction = 4
}

type DeletePoolBorrowAuthorityTxParams = {
  poolBorrowAuthority: PublicKey
  receiver: PublicKey
  manager?: PublicKey
}

export class DeletePoolBorrowAuthorityTx extends Transaction {
  constructor(options: TransactionCtorFields, params: DeletePoolBorrowAuthorityTxParams) {
    super(options)
    const { feePayer } = options
    const { poolBorrowAuthority, receiver, manager } = params

    const data = DeletePoolBorrowAuthorityTxData.serialize()

    this.add(
      new TransactionInstruction({
        keys: [
          { pubkey: poolBorrowAuthority, isSigner: false, isWritable: true },
          { pubkey: receiver, isSigner: false, isWritable: true },
          { pubkey: manager || feePayer, isSigner: true, isWritable: false },
        ],
        programId: GeneralPoolsProgram.PUBKEY,
        data,
      }),
    )
  }
}
