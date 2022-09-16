import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  PublicKey,
  Transaction,
  TransactionCtorFields,
  TransactionInstruction,
} from '@solana/web3.js'
import BN from 'bn.js'
import { Borsh } from '@everlend/common'
import { LiquidityPoolsProgram } from '../program'

export class WithdrawArgs extends Borsh.Data<{ amount: BN }> {
  static readonly SCHEMA = this.struct([
    ['instruction', 'u8'],
    ['amount', 'u64'],
  ])

  instruction = 6
}

type WithdrawParams = {
  poolMarket: PublicKey
  pool: PublicKey
  source: PublicKey
  destination: PublicKey
  tokenAccount: PublicKey
  poolMint: PublicKey
  poolMarketAuthority: PublicKey
  amount: BN
}

export class Withdraw extends Transaction {
  constructor(options: TransactionCtorFields, params: WithdrawParams) {
    super(options)
    const { feePayer } = options
    const {
      poolMarket,
      pool,
      source,
      destination,
      tokenAccount,
      poolMint,
      poolMarketAuthority,
      amount,
    } = params

    const data = WithdrawArgs.serialize({ amount })

    this.add(
      new TransactionInstruction({
        keys: [
          { pubkey: poolMarket, isSigner: false, isWritable: false },
          { pubkey: pool, isSigner: false, isWritable: false },
          { pubkey: source, isSigner: false, isWritable: true },
          { pubkey: destination, isSigner: false, isWritable: true },
          { pubkey: tokenAccount, isSigner: false, isWritable: true },
          { pubkey: poolMint, isSigner: false, isWritable: true },
          { pubkey: poolMarketAuthority, isSigner: false, isWritable: false },
          { pubkey: feePayer, isSigner: true, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: LiquidityPoolsProgram.PUBKEY,
        data,
      }),
    )
  }
}
