# everlend-sdk package

### What's Everlend?

Everlend is a lending aggregator and optimizer. Get the best rates on your deposits and loans,
always.

### What's a general pool?

A general pool is an implementation of Solana pool program, which is responsible for storing users'
liquidity and minting collateral tokens. There’s a general pool for every token supported by
Everlend. When users interact with Everlend, they actually work with general pools, e.g. users'
deposits and withdrawals are made via them.

The SDK allows interacting with Everlend general pools, specifically:

- getting general pools for tokens, e.g. there's a general pool for USDT, USDC etc.
- getting user's withdrawal requests
- preparing deposit transactions to a general pool
- preparing withdrawal request transactions from a general pool
- preparing withdrawal transactions from a general pool
- preparing transactions for initializing a mining account for a user to allow receiving liquidity
  mining rewards
- preparing transactions for claiming liquidity mining rewards
- preparing transactions for transferring deposits

It's still work in progress. In the future the SDK will be expanded with other useful features such
as getting APYs for tokens etc.

## Installation

### Yarn

`$ yarn add @everlend/sdk`

### NPM

`npm install @everlend/sdk`

## Usage

### Actions

```js
// Create an instance of EverlendActions class
import { EverlendActions } from '@everlend/sdk'

const everlendActions = new EverlendActions({
  connection, //  solana web3 connection
  network, // 'devnet' | 'mainnet'
  feePayer, // public key
})
```

### Make deposit using actions class

```js
const { tx: depositTx } = await everlendActions.getDepositTx(
  pool,
  authority,
  amount,
  source,
  destination,
)
```

### Make withdrawal using actions class

```js
const { tx: withdrawalTx } = await everlendActions.getWithdrawalRequestTx(
  pool,
  authority,
  amount,
  source,
  destination,
)
```

### Prepare a withdrawal without actions class

```js
import { prepareWithdrawalRequestTx } from '@everlend/sdk'

const { tx: withdrawalRequestTx } = await prepareWithdrawalRequestTx(
  { connection, feePayer, network },
  pool,
  authority,
  amount,
  source,
  destination,
)
```

### Prepare a deposit without actions class

```js
import { prepareDepositTx } from '@everlend/sdk'

const { tx: depositTx } = await prepareDepositTx(
  { connection, feePayer, network },
  pool,
  authority,
  amount,
  source,
  destination,
)
```

### Prepare a withdrawal transaction

```js
import { prepareWithdrawalTx } from '@everlend/sdk'

const withdrawalTx = await prepareWithdrawalTx(
  {
    connection,
    feePayer,
  },
  withdrawalRequest,
)
```

## Pool market public keys

**Mainnet:** DzGDoJHdzUANM7P7V25t5nxqbvzRcHDmdhY51V6WNiXC

**Devnet:** 4yC3cUWXQmoyyybfnENpxo33hiNxUNa1YAmmuxz93WAJ
