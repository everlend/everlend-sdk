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

type InitializeMiningTxParams = {
  poolMarket: PublicKey
  pool: PublicKey
  poolMintATA: PublicKey
  config: PublicKey
  rewardPool: PublicKey
  mining: PublicKey
  user: PublicKey
  rewardProgramId: PublicKey
}

export class InitializeMiningData extends Borsh.Data<{ amount: BN }> {
  static readonly SCHEMA = this.struct([['instruction', 'u8']])

  instruction = 13
}

export class InitializeMining extends Transaction {
  constructor(options: TransactionCtorFields, params: InitializeMiningTxParams) {
    super(options)
    const { feePayer } = options
    const { pool, poolMarket, poolMintATA, config, rewardPool, rewardProgramId, mining, user } =
      params

    const data = InitializeMiningData.serialize()

    this.add(
      new TransactionInstruction({
        keys: [
          { pubkey: poolMarket, isSigner: false, isWritable: false },
          { pubkey: pool, isSigner: false, isWritable: false },
          { pubkey: poolMintATA, isSigner: false, isWritable: false },
          { pubkey: user, isSigner: false, isWritable: false },
          { pubkey: feePayer, isSigner: false, isWritable: true },
          { pubkey: rewardPool, isSigner: false, isWritable: true },
          { pubkey: mining, isSigner: false, isWritable: true },
          { pubkey: config, isSigner: false, isWritable: false },
          { pubkey: rewardProgramId, isSigner: false, isWritable: false },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        programId: GeneralPoolsProgram.PUBKEY,
        data,
      }),
    )
  }
}
