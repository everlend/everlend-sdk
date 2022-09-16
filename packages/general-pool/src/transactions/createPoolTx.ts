import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionCtorFields,
  TransactionInstruction,
} from '@solana/web3.js'
import { Borsh } from '@everlend/common'
import { GeneralPoolsProgram } from '../program'

export class CreatePoolTxData extends Borsh.Data {
  static readonly SCHEMA = this.struct([['instruction', 'u8']])

  instruction = 1
}

type CreatePoolTxParams = {
  poolMarket: PublicKey
  pool: PublicKey
  tokenMint: PublicKey
  tokenAccount: PublicKey
  poolMint: PublicKey
  poolMarketAuthority: PublicKey
  manager?: PublicKey
}

export class CreatePoolTx extends Transaction {
  constructor(options: TransactionCtorFields, params: CreatePoolTxParams) {
    super(options)
    const { feePayer } = options
    const { poolMarket, pool, tokenMint, tokenAccount, poolMint, poolMarketAuthority, manager } =
      params

    const data = CreatePoolTxData.serialize()

    this.add(
      new TransactionInstruction({
        keys: [
          { pubkey: poolMarket, isSigner: false, isWritable: false },
          { pubkey: pool, isSigner: false, isWritable: true },
          { pubkey: tokenMint, isSigner: false, isWritable: false },
          { pubkey: tokenAccount, isSigner: false, isWritable: true },
          { pubkey: poolMint, isSigner: false, isWritable: true },
          { pubkey: manager || feePayer, isSigner: true, isWritable: true },
          { pubkey: poolMarketAuthority, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: GeneralPoolsProgram.PUBKEY,
        data,
      }),
    )
  }
}
