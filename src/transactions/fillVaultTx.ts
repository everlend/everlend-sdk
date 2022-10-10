import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  PublicKey,
  Transaction,
  TransactionCtorFields,
  TransactionInstruction,
} from '@solana/web3.js'
import BN from 'bn.js'
import { Borsh } from '../common'
import { RewardProgram } from '../rewardProgram'

export class FillVaultTxData extends Borsh.Data<{ amount: BN }> {
  static readonly SCHEMA = this.struct([
    ['instruction', 'u8'],
    ['amount', 'u64'],
  ])

  instruction = 2
}

type FillVaultParams = {
  rewardPool: PublicKey
  rewardMint: PublicKey
  vault: PublicKey
  feeAccount: PublicKey
  authority: PublicKey
  from: PublicKey
  amount: BN
}

export class FillVaultTx extends Transaction {
  constructor(options: TransactionCtorFields, params: FillVaultParams) {
    super(options)
    const { rewardPool, rewardMint, vault, feeAccount, authority, from, amount } = params

    const data = FillVaultTxData.serialize({ amount })

    this.add(
      new TransactionInstruction({
        keys: [
          { pubkey: rewardPool, isSigner: false, isWritable: true },
          { pubkey: rewardMint, isSigner: false, isWritable: false },
          { pubkey: vault, isSigner: false, isWritable: true },
          { pubkey: feeAccount, isSigner: false, isWritable: true },
          { pubkey: authority, isSigner: true, isWritable: false },
          { pubkey: from, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: RewardProgram.PUBKEY,
        data,
      }),
    )
  }
}
