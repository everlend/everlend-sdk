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
import { RewardProgram } from '../rewardProgram'

type InitializeMiningTxParams = {
  rewardPool: PublicKey
  mining: PublicKey
  user: PublicKey
}

export class InitializeMiningData extends Borsh.Data<{ amount: BN }> {
  static readonly SCHEMA = this.struct([['instruction', 'u8']])

  instruction = 3
}

export class InitializeMining extends Transaction {
  constructor(options: TransactionCtorFields, params: InitializeMiningTxParams) {
    super(options)
    const { feePayer } = options
    const { rewardPool, mining, user } = params

    const data = InitializeMiningData.serialize()

    this.add(
        new TransactionInstruction({
          keys: [
            { pubkey: rewardPool, isSigner: false, isWritable: true },
            { pubkey: mining, isSigner: false, isWritable: true },
            { pubkey: user, isSigner: false, isWritable: false },
            { pubkey: feePayer, isSigner: true, isWritable: true },
            {
              pubkey: SystemProgram.programId,
              isSigner: false,
              isWritable: false,
            },
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
          ],
          programId: RewardProgram.PUBKEY,
          data,
        }),
    )
  }
}