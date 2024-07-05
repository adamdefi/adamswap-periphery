# AdamSwap Periphery Contracts

## Init env

```shell
yarn
```

## Deploy to normal evm chain

```shell
yarn compile
yarn deploy
```

## Deploy to ZULU

```shell
yarn compile:zk --network=zulutestnet
yarn deploy:zk --network=zulutestnet
```

## Test

```shell
# test one
yarn test test/AdamwapRouter.spec.ts
# test all
yarn test
```
