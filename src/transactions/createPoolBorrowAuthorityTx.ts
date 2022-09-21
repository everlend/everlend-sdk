import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionCtorFields,
  TransactionInstruction,
} from '@solana/web3.js'
import BN from 'bn.js'
import { Borsh } from '../common'
import { GeneralPoolsProgram } from '../program'

export class CreatePoolBorrowAuthorityTxData extends Borsh.Data<{ shareAllowed: BN }> {
  static readonly SCHEMA = this.struct([
    ['instruction', 'u8'],
    ['shareAllowed', 'u16'],
  ])

  instruction = 2
}

type CreatePoolBorrowAuthorityTxParams = {
  poolMarket: PublicKey
  pool: PublicKey
  poolBorrowAuthority: PublicKey
  borrowAuthority: PublicKey
  shareAllowed: BN
  manager?: PublicKey
}

export class CreatePoolBorrowAuthorityTx extends Transaction {
  constructor(options: TransactionCtorFields, params: CreatePoolBorrowAuthorityTxParams) {
    super(options)
    const { feePayer } = options
    const { poolMarket, pool, poolBorrowAuthority, borrowAuthority, shareAllowed, manager } = params

    const data = CreatePoolBorrowAuthorityTxData.serialize({ shareAllowed })

    this.add(
      new TransactionInstruction({
        keys: [
          { pubkey: poolMarket, isSigner: false, isWritable: false },
          { pubkey: pool, isSigner: false, isWritable: false },
          { pubkey: poolBorrowAuthority, isSigner: false, isWritable: true },
          { pubkey: borrowAuthority, isSigner: false, isWritable: false },
          { pubkey: manager || feePayer, isSigner: true, isWritable: true },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: GeneralPoolsProgram.PUBKEY,
        data,
      }),
    )
  }
}
