import {
  PublicKey,
  Transaction,
  TransactionCtorFields,
  TransactionInstruction,
} from '@solana/web3.js'
import BN from 'bn.js'
import { Borsh } from '../common'
import { GeneralPoolsProgram } from '../program'

export class UpdatePoolBorrowAuthorityTxData extends Borsh.Data<{ shareAllowed: BN }> {
  static readonly SCHEMA = this.struct([
    ['instruction', 'u8'],
    ['shareAllowed', 'u16'],
  ])

  instruction = 3
}

type UpdatePoolBorrowAuthorityTxParams = {
  poolBorrowAuthority: PublicKey
  shareAllowed: BN
  manager?: PublicKey
}

export class UpdatePoolBorrowAuthorityTx extends Transaction {
  constructor(options: TransactionCtorFields, params: UpdatePoolBorrowAuthorityTxParams) {
    super(options)
    const { feePayer } = options
    const { poolBorrowAuthority, shareAllowed, manager } = params

    const data = UpdatePoolBorrowAuthorityTxData.serialize({ shareAllowed })

    this.add(
      new TransactionInstruction({
        keys: [
          { pubkey: poolBorrowAuthority, isSigner: false, isWritable: true },
          { pubkey: manager || feePayer, isSigner: true, isWritable: false },
        ],
        programId: GeneralPoolsProgram.PUBKEY,
        data,
      }),
    )
  }
}
