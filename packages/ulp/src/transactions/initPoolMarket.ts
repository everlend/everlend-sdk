import {
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionCtorFields,
  TransactionInstruction,
} from '@solana/web3.js'
import { Borsh } from '@everlend/common'
import { LiquidityPoolsProgram } from '../program'

export class InitPoolMarketArgs extends Borsh.Data {
  static readonly SCHEMA = this.struct([['instruction', 'u8']])

  instruction = 0
}

type InitPoolMarketParams = {
  poolMarket: PublicKey
  manager?: PublicKey
}

export class InitPoolMarket extends Transaction {
  constructor(options: TransactionCtorFields, params: InitPoolMarketParams) {
    super(options)
    const { feePayer } = options
    const { poolMarket, manager } = params

    const data = InitPoolMarketArgs.serialize()

    this.add(
      new TransactionInstruction({
        keys: [
          { pubkey: poolMarket, isSigner: false, isWritable: true },
          { pubkey: manager || feePayer, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        programId: LiquidityPoolsProgram.PUBKEY,
        data,
      }),
    )
  }
}
