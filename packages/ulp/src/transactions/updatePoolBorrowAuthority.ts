import {
  PublicKey,
  Transaction,
  TransactionCtorFields,
  TransactionInstruction,
} from '@solana/web3.js'
import BN from 'bn.js'
import { Borsh } from '@everlend/common'
import { LiquidityPoolsProgram } from '../program'

export class UpdatePoolBorrowAuthorityArgs extends Borsh.Data<{ shareAllowed: BN }> {
  static readonly SCHEMA = this.struct([
    ['instruction', 'u8'],
    ['shareAllowed', 'u16'],
  ])

  instruction = 3
}

type UpdatePoolBorrowAuthorityParams = {
  poolBorrowAuthority: PublicKey
  shareAllowed: BN
  manager?: PublicKey
}

export class UpdatePoolBorrowAuthority extends Transaction {
  constructor(options: TransactionCtorFields, params: UpdatePoolBorrowAuthorityParams) {
    super(options)
    const { feePayer } = options
    const { poolBorrowAuthority, shareAllowed, manager } = params

    const data = UpdatePoolBorrowAuthorityArgs.serialize({ shareAllowed })

    this.add(
      new TransactionInstruction({
        keys: [
          { pubkey: poolBorrowAuthority, isSigner: false, isWritable: true },
          { pubkey: manager || feePayer, isSigner: true, isWritable: false },
        ],
        programId: LiquidityPoolsProgram.PUBKEY,
        data,
      }),
    )
  }
}
