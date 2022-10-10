import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  PublicKey,
  Transaction,
  TransactionCtorFields,
  TransactionInstruction,
} from '@solana/web3.js'
import BN from 'bn.js'
import { Borsh } from '../common'
import { GeneralPoolsProgram } from '../program'
import { RewardProgram } from '../rewardProgram'

export class DepositTxData extends Borsh.Data<{ amount: BN }> {
  static readonly SCHEMA = this.struct([
    ['instruction', 'u8'],
    ['amount', 'u64'],
  ])

  instruction = 5
}

type DepositTxParams = {
  poolConfig: PublicKey
  poolMarket: PublicKey
  pool: PublicKey
  source: PublicKey
  destination: PublicKey
  tokenAccount: PublicKey
  poolMint: PublicKey
  rewardPool: PublicKey
  rewardAccount: PublicKey
  poolMarketAuthority: PublicKey
  amount: BN
}

export class DepositTx extends Transaction {
  constructor(options: TransactionCtorFields, params: DepositTxParams) {
    super(options)
    const { feePayer } = options
    const {
      poolConfig,
      poolMarket,
      pool,
      source,
      destination,
      tokenAccount,
      poolMint,
      rewardPool,
      rewardAccount,
      poolMarketAuthority,
      amount,
    } = params

    const data = DepositTxData.serialize({ amount })

    this.add(
      new TransactionInstruction({
        keys: [
          { pubkey: poolConfig, isSigner: false, isWritable: false },
          { pubkey: poolMarket, isSigner: false, isWritable: false },
          { pubkey: pool, isSigner: false, isWritable: false },
          { pubkey: source, isSigner: false, isWritable: true },
          { pubkey: destination, isSigner: false, isWritable: true },
          { pubkey: tokenAccount, isSigner: false, isWritable: true },
          { pubkey: poolMint, isSigner: false, isWritable: true },
          { pubkey: poolMarketAuthority, isSigner: false, isWritable: false },
          { pubkey: feePayer, isSigner: true, isWritable: false },
          { pubkey: rewardPool, isSigner: false, isWritable: true },
          { pubkey: rewardAccount, isSigner: false, isWritable: true },
          { pubkey: RewardProgram.PUBKEY, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: GeneralPoolsProgram.PUBKEY,
        data,
      }),
    )
  }
}
