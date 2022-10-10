import {
  PublicKey,
  Transaction,
  TransactionCtorFields,
  TransactionInstruction,
} from '@solana/web3.js'
import { Borsh } from '../common'
import { RewardProgram } from '../rewardProgram'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'

type ClaimTxParams = {
  rewardPool: PublicKey
  rewardMint: PublicKey
  vault: PublicKey
  mining: PublicKey
  userRewardTokenAccount: PublicKey
}

export class ClaimData extends Borsh.Data {
  static readonly SCHEMA = this.struct([['instruction', 'u8']])

  instruction = 6
}

export class ClaimTx extends Transaction {
  constructor(options: TransactionCtorFields, params: ClaimTxParams) {
    super(options)
    const { feePayer } = options
    const { rewardPool, rewardMint, vault, mining, userRewardTokenAccount } = params

    const data = ClaimData.serialize()

    this.add(
      new TransactionInstruction({
        keys: [
          { pubkey: rewardPool, isSigner: false, isWritable: false },
          { pubkey: rewardMint, isSigner: false, isWritable: false },
          { pubkey: vault, isSigner: false, isWritable: true },
          { pubkey: mining, isSigner: false, isWritable: true },
          { pubkey: feePayer, isSigner: true, isWritable: false },
          { pubkey: userRewardTokenAccount, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: RewardProgram.PUBKEY,
        data,
      }),
    )
  }
}
