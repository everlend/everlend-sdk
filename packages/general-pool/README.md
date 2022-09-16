# Everlend general-pool package

### What's Everlend?

Everlend is a lending aggregator and optimizer. Get the best rates on your deposits and loans, always.

### What's a general pool?

A general pool is an implementation of Solana pool program, which is responsible for storing users' liquidity and
minting collateral tokens. There’s a general pool for every token supported by Everlend. When users interact with
Everlend, they actually work with general pools, e.g. users' deposits and withdrawals are made via them.

The SDK allows interacting with Everlend general pools, specifically:

* getting general pools for tokens, e.g. there's a general pool for USDT, USDC etc.
* getting user's withdrawal requests
* preparing deposit transactions to a general pool
* preparing withdrawal request transactions from a general pool
* preparing withdrawal transactions from a general pool

It's still work in progress. In the future the SDK will be expanded with other useful features such as getting APYs for tokens etc.

## Installation

### Yarn

`$ yarn add @everlend/general-pool`

### NPM

`npm install @everlend/general-pool`

## Usage

### Find pools
```js
import { Pool } from '@everlend/general-pool';

const pools = await Pool.findMany(connection, {
    poolMarket,
});
```

### Find user's withdrawal requests
```js
import { UserWithdrawalRequest } from '@everlend/general-pool';

const userWithdrawalRequests = await UserWithdrawalRequest.findMany(connection, {
    from,
});
```

### Prepare a deposit transaction
```js
import { prepareDepositTx } from '@everlend/general-pool';

const depositTx = await prepareDepositTx(
  { connection, payerPublicKey, },
  pool,
  registry,
  amount,
  source,
  destination,
);
```

### Prepare a withdrawal request transaction
```js
import { prepareWithdrawalRequestTx } from '@everlend/general-pool';

const withdrawalRequestTx = await prepareWithdrawalRequestTx(
  { connection, payerPublicKey, },
  pool,
  registry,
  amount,
  source,
  destination,
);
```

### Prepare a withdrawal transaction
```js
import { prepareWithdrawalTx } from '@everlend/general-pool';

const withdrawalTx = await prepareWithdrawalTx(
  {
    connection,
    payerPublicKey,
  },
  withdrawalRequest,
);
```

## Pool market public keys

**Mainnet:** DzGDoJHdzUANM7P7V25t5nxqbvzRcHDmdhY51V6WNiXC

**Devnet:** 4yC3cUWXQmoyyybfnENpxo33hiNxUNa1YAmmuxz93WAJ

## Registry public keys

**Mainnet:** UaqUGgMvVzUZLthLHC9uuuBzgw5Ldesich94Wu5pMJg

**Devnet:** 6KCHtgSGR2WDE3aqrqSJppHRGVPgy9fHDX5XD8VZgb61
