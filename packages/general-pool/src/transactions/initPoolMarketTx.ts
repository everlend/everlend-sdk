import {
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionCtorFields,
  TransactionInstruction,
} from '@solana/web3.js'
import { Borsh } from '@everlend/common'
import { GeneralPoolsProgram } from '../program'

export class InitPoolMarketTxData extends Borsh.Data {
  static readonly SCHEMA = this.struct([['instruction', 'u8']])

  instruction = 0
}

type InitPoolMarketTxParams = {
  poolMarket: PublicKey
  manager?: PublicKey
}

export class InitPoolMarketTx extends Transaction {
  constructor(options: TransactionCtorFields, params: InitPoolMarketTxParams) {
    super(options)
    const { feePayer } = options
    const { poolMarket, manager } = params

    const data = InitPoolMarketTxData.serialize()

    this.add(
      new TransactionInstruction({
        keys: [
          { pubkey: poolMarket, isSigner: false, isWritable: true },
          { pubkey: manager || feePayer, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        programId: GeneralPoolsProgram.PUBKEY,
        data,
      }),
    )
  }
}
