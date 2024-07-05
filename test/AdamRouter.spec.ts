import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { Contract } from 'ethers'
import { ethers } from 'hardhat'
import { ecsign } from 'ethereumjs-util'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero, MaxUint256, Zero } from '@ethersproject/constants'
import { deployContract, loadWallet, v2Fixture } from './shared/fixtures'
import { expandTo18Decimals, getApprovalDigest, mineBlock, MINIMUM_LIQUIDITY } from './shared/utilities'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

chai.use(solidity)

const overrides = {
    gasLimit: 9999999
}

enum RouterVersion {
    AdamRouter = 'AdamRouter'
}

describe('AdamRouter', () => {
    let token0: Contract
    let token1: Contract
    let router: Contract

    let wallet:any
    before(async function() {
            const accounts = await ethers.getSigners()
            wallet = accounts[0]
            console.log(`  wallet is ${wallet.address}  `)
        }
    )

    beforeEach(async function() {
        const fixture = await v2Fixture(wallet)
        token0 = fixture.token0
        token1 = fixture.token1
        router = fixture.router02
    })

    it('quote', async () => {
        expect(await router.quote(BigNumber.from(1), BigNumber.from(100), BigNumber.from(200))).to.eq(BigNumber.from(2))
        expect(await router.quote(BigNumber.from(2), BigNumber.from(200), BigNumber.from(100))).to.eq(BigNumber.from(1))
        await expect(router.quote(BigNumber.from(0), BigNumber.from(100), BigNumber.from(200))).to.be.revertedWith(
            'AdamLibrary: INSUFFICIENT_AMOUNT'
        )
        await expect(router.quote(BigNumber.from(1), BigNumber.from(0), BigNumber.from(200))).to.be.revertedWith(
            'AdamLibrary: INSUFFICIENT_LIQUIDITY'
        )
        await expect(router.quote(BigNumber.from(1), BigNumber.from(100), BigNumber.from(0))).to.be.revertedWith(
            'AdamLibrary: INSUFFICIENT_LIQUIDITY'
        )
    })

    it('getAmountOut', async () => {
        expect(await router.getAmountOut(BigNumber.from(2), BigNumber.from(100), BigNumber.from(100))).to.eq(BigNumber.from(1))
        await expect(router.getAmountOut(BigNumber.from(0), BigNumber.from(100), BigNumber.from(100))).to.be.revertedWith(
            'AdamLibrary: INSUFFICIENT_INPUT_AMOUNT'
        )
        await expect(router.getAmountOut(BigNumber.from(2), BigNumber.from(0), BigNumber.from(100))).to.be.revertedWith(
            'AdamLibrary: INSUFFICIENT_LIQUIDITY'
        )
        await expect(router.getAmountOut(BigNumber.from(2), BigNumber.from(100), BigNumber.from(0))).to.be.revertedWith(
            'AdamLibrary: INSUFFICIENT_LIQUIDITY'
        )
    })

    it('getAmountIn', async () => {
        expect(await router.getAmountIn(BigNumber.from(1), BigNumber.from(100), BigNumber.from(100))).to.eq(BigNumber.from(2))
        await expect(router.getAmountIn(BigNumber.from(0), BigNumber.from(100), BigNumber.from(100))).to.be.revertedWith(
            'AdamLibrary: INSUFFICIENT_OUTPUT_AMOUNT'
        )
        await expect(router.getAmountIn(BigNumber.from(1), BigNumber.from(0), BigNumber.from(100))).to.be.revertedWith(
            'AdamLibrary: INSUFFICIENT_LIQUIDITY'
        )
        await expect(router.getAmountIn(BigNumber.from(1), BigNumber.from(100), BigNumber.from(0))).to.be.revertedWith(
            'AdamLibrary: INSUFFICIENT_LIQUIDITY'
        )
    })

    it('getAmountsOut', async () => {
        await token0.approve(router.address, MaxUint256)
        await token1.approve(router.address, MaxUint256)
        let tx = await router.addLiquidity(
            token0.address,
            token1.address,
            BigNumber.from(10000),
            BigNumber.from(10000),
            0,
            0,
            wallet.address,
            MaxUint256,
            overrides
        )
        await tx.wait()

        await expect(router.getAmountsOut(BigNumber.from(2), [token0.address])).to.be.revertedWith(
            'AdamLibrary: INVALID_PATH'
        )
        const path = [token0.address, token1.address]
        expect(await router.getAmountsOut(BigNumber.from(2), path)).to.deep.eq([BigNumber.from(2), BigNumber.from(1)])
    })

    it('getAmountsIn', async () => {
        await token0.approve(router.address, MaxUint256)
        await token1.approve(router.address, MaxUint256)
        let tx = await router.addLiquidity(
            token0.address,
            token1.address,
            BigNumber.from(10000),
            BigNumber.from(10000),
            0,
            0,
            wallet.address,
            MaxUint256,
            overrides
        )
        await tx.wait()

        await expect(router.getAmountsIn(BigNumber.from(1), [token0.address])).to.be.revertedWith(
            'AdamLibrary: INVALID_PATH'
        )
        const path = [token0.address, token1.address]
        expect(await router.getAmountsIn(BigNumber.from(1), path)).to.deep.eq([BigNumber.from(2), BigNumber.from(1)])
    })
})

describe('AdamRouter{RouterVersion}', () => {
    for (const routerVersion of Object.keys(RouterVersion)) {
        let token0: Contract
        let token1: Contract
        let WETH: Contract
        let WETHPartner: Contract
        let factory: Contract
        let router: Contract
        let pair: Contract
        let WETHPair: Contract
        let routerEventEmitter: Contract

        let wallet: any 
        before(async function() {
            wallet = await loadWallet()
            console.log(`  wallet is ${wallet.address}  `)
            }
        )

        beforeEach(async function() {
            const fixture = await v2Fixture(wallet)
            token0 = fixture.token0
            token1 = fixture.token1
            WETH = fixture.WETH
            WETHPartner = fixture.WETHPartner
            factory = fixture.factoryV2
            router = {
                [RouterVersion.AdamRouter]: fixture.router02
            }[routerVersion as RouterVersion]
            pair = fixture.pair
            WETHPair = fixture.WETHPair
            routerEventEmitter = fixture.routerEventEmitter
        })

        afterEach(async function() {
            expect(await ethers.provider.getBalance(router.address)).to.eq(Zero)
        })

        describe(routerVersion, () => {
            it('factory, WETH', async () => {
                expect(await router.factory()).to.eq(factory.address)
                expect(await router.WETH()).to.eq(WETH.address)
            })

            it('addLiquidity', async () => {
                const token0Amount = expandTo18Decimals(1)
                const token1Amount = expandTo18Decimals(4)

                const expectedLiquidity = expandTo18Decimals(2)
                await token0.approve(router.address, MaxUint256)
                await token1.approve(router.address, MaxUint256)
                await expect(
                    router.addLiquidity(
                        token0.address,
                        token1.address,
                        token0Amount,
                        token1Amount,
                        0,
                        0,
                        wallet.address,
                        MaxUint256,
                        overrides
                    )
                )
                    .to.emit(token0, 'Transfer')
                    .withArgs(wallet.address, pair.address, token0Amount)
                    .to.emit(token1, 'Transfer')
                    .withArgs(wallet.address, pair.address, token1Amount)
                    .to.emit(pair, 'Transfer')
                    .withArgs(AddressZero, AddressZero, MINIMUM_LIQUIDITY)
                    .to.emit(pair, 'Transfer')
                    .withArgs(AddressZero, wallet.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
                    .to.emit(pair, 'Sync')
                    .withArgs(token0Amount, token1Amount)
                    .to.emit(pair, 'Mint')
                    .withArgs(router.address, token0Amount, token1Amount)

                expect(await pair.balanceOf(wallet.address)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY))
            })

            it('addLiquidityETH', async () => {
                const WETHPartnerAmount = expandTo18Decimals(1)
                const ETHAmount = expandTo18Decimals(4)

                const expectedLiquidity = expandTo18Decimals(2)
                const WETHPairToken0 = await WETHPair.token0()
                await WETHPartner.approve(router.address, MaxUint256)
                await expect(
                    router.addLiquidityETH(
                        WETHPartner.address,
                        WETHPartnerAmount,
                        WETHPartnerAmount,
                        ETHAmount,
                        wallet.address,
                        MaxUint256,
                        { ...overrides, value: ETHAmount }
                    )
                )
                    .to.emit(WETHPair, 'Transfer')
                    .withArgs(AddressZero, AddressZero, MINIMUM_LIQUIDITY)
                    .to.emit(WETHPair, 'Transfer')
                    .withArgs(AddressZero, wallet.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
                    .to.emit(WETHPair, 'Sync')
                    .withArgs(
                        WETHPairToken0 === WETHPartner.address ? WETHPartnerAmount : ETHAmount,
                        WETHPairToken0 === WETHPartner.address ? ETHAmount : WETHPartnerAmount
                    )
                    .to.emit(WETHPair, 'Mint')
                    .withArgs(
                        router.address,
                        WETHPairToken0 === WETHPartner.address ? WETHPartnerAmount : ETHAmount,
                        WETHPairToken0 === WETHPartner.address ? ETHAmount : WETHPartnerAmount
                    )

                expect(await WETHPair.balanceOf(wallet.address)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY))
            })

            async function addLiquidity(token0Amount: BigNumber, token1Amount: BigNumber) {
                await token0.transfer(pair.address, token0Amount)
                await token1.transfer(pair.address, token1Amount)
                await pair.mint(wallet.address, overrides)
            }

            it('removeLiquidity', async () => {
                const token0Amount = expandTo18Decimals(1)
                const token1Amount = expandTo18Decimals(4)
                await addLiquidity(token0Amount, token1Amount)

                const expectedLiquidity = expandTo18Decimals(2)
                await pair.approve(router.address, MaxUint256)
                await expect(
                    router.removeLiquidity(
                        token0.address,
                        token1.address,
                        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
                        0,
                        0,
                        wallet.address,
                        MaxUint256,
                        overrides
                    )
                )
                    .to.emit(pair, 'Transfer')
                    .withArgs(wallet.address, pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
                    .to.emit(pair, 'Transfer')
                    .withArgs(pair.address, AddressZero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
                    .to.emit(token0, 'Transfer')
                    .withArgs(pair.address, wallet.address, token0Amount.sub(500))
                    .to.emit(token1, 'Transfer')
                    .withArgs(pair.address, wallet.address, token1Amount.sub(2000))
                    .to.emit(pair, 'Sync')
                    .withArgs(500, 2000)
                    .to.emit(pair, 'Burn')
                    .withArgs(router.address, token0Amount.sub(500), token1Amount.sub(2000), wallet.address)

                expect(await pair.balanceOf(wallet.address)).to.eq(0)
                const totalSupplyToken0 = await token0.totalSupply()
                const totalSupplyToken1 = await token1.totalSupply()
                expect(await token0.balanceOf(wallet.address)).to.eq(totalSupplyToken0.sub(500))
                expect(await token1.balanceOf(wallet.address)).to.eq(totalSupplyToken1.sub(2000))
            })

            it('removeLiquidityETH', async () => {
                const WETHPartnerAmount = expandTo18Decimals(1)
                const ETHAmount = expandTo18Decimals(4)
                await WETHPartner.transfer(WETHPair.address, WETHPartnerAmount)
                await WETH.deposit({ value: ETHAmount, gasLimit: 9999999 })
                await WETH.transfer(WETHPair.address, ETHAmount, overrides)
                await WETHPair.mint(wallet.address, overrides)

                const expectedLiquidity = expandTo18Decimals(2)
                const WETHPairToken0 = await WETHPair.token0()
                await WETHPair.approve(router.address, MaxUint256, overrides)
                await expect(
                    router.removeLiquidityETH(
                        WETHPartner.address,
                        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
                        0,
                        0,
                        wallet.address,
                        MaxUint256,
                        overrides
                    )
                )
                    .to.emit(WETHPair, 'Transfer')
                    .withArgs(wallet.address, WETHPair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
                    .to.emit(WETHPair, 'Transfer')
                    .withArgs(WETHPair.address, AddressZero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
                    .to.emit(WETH, 'Transfer')
                    .withArgs(WETHPair.address, router.address, ETHAmount.sub(2000))
                    .to.emit(WETHPartner, 'Transfer')
                    .withArgs(WETHPair.address, router.address, WETHPartnerAmount.sub(500))
                    .to.emit(WETHPartner, 'Transfer')
                    .withArgs(router.address, wallet.address, WETHPartnerAmount.sub(500))
                    .to.emit(WETHPair, 'Sync')
                    .withArgs(
                        WETHPairToken0 === WETHPartner.address ? 500 : 2000,
                        WETHPairToken0 === WETHPartner.address ? 2000 : 500
                    )
                    .to.emit(WETHPair, 'Burn')
                    .withArgs(
                        router.address,
                        WETHPairToken0 === WETHPartner.address ? WETHPartnerAmount.sub(500) : ETHAmount.sub(2000),
                        WETHPairToken0 === WETHPartner.address ? ETHAmount.sub(2000) : WETHPartnerAmount.sub(500),
                        router.address
                    )

                expect(await WETHPair.balanceOf(wallet.address)).to.eq(0)
                const totalSupplyWETHPartner = await WETHPartner.totalSupply()
                const totalSupplyWETH = await WETH.totalSupply()
                expect(await WETHPartner.balanceOf(wallet.address)).to.eq(totalSupplyWETHPartner.sub(500))
                expect(await WETH.balanceOf(wallet.address)).to.eq(totalSupplyWETH.sub(2000))
            })

            it('removeLiquidityWithPermit', async () => {
                const token0Amount = expandTo18Decimals(1)
                const token1Amount = expandTo18Decimals(4)
                await addLiquidity(token0Amount, token1Amount)

                const expectedLiquidity = expandTo18Decimals(2)

                const nonce = await pair.nonces(wallet.address)

                const digest = await getApprovalDigest(
                    pair,
                    { owner: wallet.address, spender: router.address, value: expectedLiquidity.sub(MINIMUM_LIQUIDITY) },
                    nonce,
                    MaxUint256
                )

                const {
                    v,
                    r,
                    s
                } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(wallet.privateKey.slice(2), 'hex'))

                await router.removeLiquidityWithPermit(
                    token0.address,
                    token1.address,
                    expectedLiquidity.sub(MINIMUM_LIQUIDITY),
                    0,
                    0,
                    wallet.address,
                    MaxUint256,
                    false,
                    v,
                    r,
                    s,
                    overrides
                )
            })

            it('removeLiquidityETHWithPermit', async () => {
                const WETHPartnerAmount = expandTo18Decimals(1)
                const ETHAmount = expandTo18Decimals(4)
                await WETHPartner.transfer(WETHPair.address, WETHPartnerAmount)
                await WETH.deposit({ value: ETHAmount, gasLimit: 9999999 })
                await WETH.transfer(WETHPair.address, ETHAmount, overrides)
                await WETHPair.mint(wallet.address, overrides)

                const expectedLiquidity = expandTo18Decimals(2)

                const nonce = await WETHPair.nonces(wallet.address)
                const digest = await getApprovalDigest(
                    WETHPair,
                    { owner: wallet.address, spender: router.address, value: expectedLiquidity.sub(MINIMUM_LIQUIDITY) },
                    nonce,
                    MaxUint256
                )

                const {
                    v,
                    r,
                    s
                } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(wallet.privateKey.slice(2), 'hex'))

                await router.removeLiquidityETHWithPermit(
                    WETHPartner.address,
                    expectedLiquidity.sub(MINIMUM_LIQUIDITY),
                    0,
                    0,
                    wallet.address,
                    MaxUint256,
                    false,
                    v,
                    r,
                    s,
                    overrides
                )
            })

            describe('swapExactTokensForTokens', () => {
                const token0Amount = expandTo18Decimals(5)
                const token1Amount = expandTo18Decimals(10)
                const swapAmount = expandTo18Decimals(1)
                const expectedOutputAmount = BigNumber.from('1662497915624478906')

                beforeEach(async () => {
                    await addLiquidity(token0Amount, token1Amount)
                    await token0.approve(router.address, MaxUint256)
                })

                it('happy path', async () => {
                    await expect(
                        router.swapExactTokensForTokens(
                            swapAmount,
                            0,
                            [token0.address, token1.address],
                            wallet.address,
                            MaxUint256,
                            overrides
                        )
                    )
                        .to.emit(token0, 'Transfer')
                        .withArgs(wallet.address, pair.address, swapAmount)
                        .to.emit(token1, 'Transfer')
                        .withArgs(pair.address, wallet.address, expectedOutputAmount)
                        .to.emit(pair, 'Sync')
                        .withArgs(token0Amount.add(swapAmount), token1Amount.sub(expectedOutputAmount))
                        .to.emit(pair, 'Swap')
                        .withArgs(router.address, swapAmount, 0, 0, expectedOutputAmount, wallet.address)
                })

                it('amounts', async () => {
                    await token0.approve(routerEventEmitter.address, MaxUint256)
                    await expect(
                        routerEventEmitter.swapExactTokensForTokens(
                            router.address,
                            swapAmount,
                            0,
                            [token0.address, token1.address],
                            wallet.address,
                            MaxUint256,
                            overrides
                        )
                    )
                        .to.emit(routerEventEmitter, 'Amounts')
                        .withArgs([swapAmount, expectedOutputAmount])
                })

                it('gas', async () => {
                    // ensure that setting price{0,1}CumulativeLast for the first time doesn't affect our gas math
                    await mineBlock((await ethers.provider.getBlock('latest')).timestamp + 1)
                    await pair.sync(overrides)

                    await token0.approve(router.address, MaxUint256)
                    await mineBlock((await ethers.provider.getBlock('latest')).timestamp + 1)
                    const tx = await router.swapExactTokensForTokens(
                        swapAmount,
                        0,
                        [token0.address, token1.address],
                        wallet.address,
                        MaxUint256,
                        overrides
                    )
                    const receipt = await tx.wait()
                    expect(receipt.gasUsed).to.eq(
                        {
                            [RouterVersion.AdamRouter]: 108666
                        }[routerVersion as RouterVersion]
                    )
                }).retries(3)
            })

            describe('swapTokensForExactTokens', () => {
                const token0Amount = expandTo18Decimals(5)
                const token1Amount = expandTo18Decimals(10)
                const expectedSwapAmount = BigNumber.from('557227237267357629')
                const outputAmount = expandTo18Decimals(1)

                beforeEach(async () => {
                    await addLiquidity(token0Amount, token1Amount)
                })

                it('happy path', async () => {
                    await token0.approve(router.address, MaxUint256)
                    await expect(
                        router.swapTokensForExactTokens(
                            outputAmount,
                            MaxUint256,
                            [token0.address, token1.address],
                            wallet.address,
                            MaxUint256,
                            overrides
                        )
                    )
                        .to.emit(token0, 'Transfer')
                        .withArgs(wallet.address, pair.address, expectedSwapAmount)
                        .to.emit(token1, 'Transfer')
                        .withArgs(pair.address, wallet.address, outputAmount)
                        .to.emit(pair, 'Sync')
                        .withArgs(token0Amount.add(expectedSwapAmount), token1Amount.sub(outputAmount))
                        .to.emit(pair, 'Swap')
                        .withArgs(router.address, expectedSwapAmount, 0, 0, outputAmount, wallet.address)
                })

                it('amounts', async () => {
                    await token0.approve(routerEventEmitter.address, MaxUint256)
                    await expect(
                        routerEventEmitter.swapTokensForExactTokens(
                            router.address,
                            outputAmount,
                            MaxUint256,
                            [token0.address, token1.address],
                            wallet.address,
                            MaxUint256,
                            overrides
                        )
                    )
                        .to.emit(routerEventEmitter, 'Amounts')
                        .withArgs([expectedSwapAmount, outputAmount])
                })
            })

            describe('swapExactETHForTokens', () => {
                const WETHPartnerAmount = expandTo18Decimals(10)
                const ETHAmount = expandTo18Decimals(5)
                const swapAmount = expandTo18Decimals(1)
                const expectedOutputAmount = BigNumber.from('1662497915624478906')

                beforeEach(async () => {
                    await WETHPartner.transfer(WETHPair.address, WETHPartnerAmount)
                    await WETH.deposit({ value: ETHAmount, gasLimit: 9999999 })
                    await WETH.transfer(WETHPair.address, ETHAmount, overrides)
                    await WETHPair.mint(wallet.address, overrides)

                    await token0.approve(router.address, MaxUint256)
                })

                it('happy path', async () => {
                    const WETHPairToken0 = await WETHPair.token0()
                    await expect(
                        router.swapExactETHForTokens(0, [WETH.address, WETHPartner.address], wallet.address, MaxUint256, {
                            ...overrides,
                            value: swapAmount
                        })
                    )
                        .to.emit(WETH, 'Transfer')
                        .withArgs(router.address, WETHPair.address, swapAmount)
                        .to.emit(WETHPartner, 'Transfer')
                        .withArgs(WETHPair.address, wallet.address, expectedOutputAmount)
                        .to.emit(WETHPair, 'Sync')
                        .withArgs(
                            WETHPairToken0 === WETHPartner.address
                                ? WETHPartnerAmount.sub(expectedOutputAmount)
                                : ETHAmount.add(swapAmount),
                            WETHPairToken0 === WETHPartner.address
                                ? ETHAmount.add(swapAmount)
                                : WETHPartnerAmount.sub(expectedOutputAmount)
                        )
                        .to.emit(WETHPair, 'Swap')
                        .withArgs(
                            router.address,
                            WETHPairToken0 === WETHPartner.address ? 0 : swapAmount,
                            WETHPairToken0 === WETHPartner.address ? swapAmount : 0,
                            WETHPairToken0 === WETHPartner.address ? expectedOutputAmount : 0,
                            WETHPairToken0 === WETHPartner.address ? 0 : expectedOutputAmount,
                            wallet.address
                        )
                })

                it('amounts', async () => {
                    await expect(
                        routerEventEmitter.swapExactETHForTokens(
                            router.address,
                            0,
                            [WETH.address, WETHPartner.address],
                            wallet.address,
                            MaxUint256,
                            {
                                ...overrides,
                                value: swapAmount
                            }
                        )
                    )
                        .to.emit(routerEventEmitter, 'Amounts')
                        .withArgs([swapAmount, expectedOutputAmount])
                })

                it('gas', async () => {
                    const WETHPartnerAmount = expandTo18Decimals(10)
                    const ETHAmount = expandTo18Decimals(5)
                    await WETHPartner.transfer(WETHPair.address, WETHPartnerAmount)
                    await WETH.deposit({ value: ETHAmount, gasLimit: 9999999 })
                    await WETH.transfer(WETHPair.address, ETHAmount, overrides)
                    await WETHPair.mint(wallet.address, overrides)

                    // ensure that setting price{0,1}CumulativeLast for the first time doesn't affect our gas math
                    await mineBlock((await ethers.provider.getBlock('latest')).timestamp + 1)
                    await pair.sync(overrides)

                    const swapAmount = expandTo18Decimals(1)
                    await mineBlock((await ethers.provider.getBlock('latest')).timestamp + 1)
                    const tx = await router.swapExactETHForTokens(
                        0,
                        [WETH.address, WETHPartner.address],
                        wallet.address,
                        MaxUint256,
                        {
                            ...overrides,
                            value: swapAmount
                        }
                    )
                    const receipt = await tx.wait()
                    expect(receipt.gasUsed).to.eq(
                        {
                            [RouterVersion.AdamRouter]: 111856
                        }[routerVersion as RouterVersion]
                    )
                }).retries(3)
            })

            describe('swapTokensForExactETH', () => {
                const WETHPartnerAmount = expandTo18Decimals(5)
                const ETHAmount = expandTo18Decimals(10)
                const expectedSwapAmount = BigNumber.from('557227237267357629')
                const outputAmount = expandTo18Decimals(1)

                beforeEach(async () => {
                    await WETHPartner.transfer(WETHPair.address, WETHPartnerAmount)
                    await WETH.deposit({ value: ETHAmount, gasLimit: 9999999 })
                    await WETH.transfer(WETHPair.address, ETHAmount, overrides)
                    await WETHPair.mint(wallet.address, overrides)
                })

                it('happy path', async () => {
                    await WETHPartner.approve(router.address, MaxUint256)
                    const WETHPairToken0 = await WETHPair.token0()
                    await expect(
                        router.swapTokensForExactETH(
                            outputAmount,
                            MaxUint256,
                            [WETHPartner.address, WETH.address],
                            wallet.address,
                            MaxUint256,
                            overrides
                        )
                    )
                        .to.emit(WETHPartner, 'Transfer')
                        .withArgs(wallet.address, WETHPair.address, expectedSwapAmount)
                        .to.emit(WETH, 'Transfer')
                        .withArgs(WETHPair.address, router.address, outputAmount)
                        .to.emit(WETHPair, 'Sync')
                        .withArgs(
                            WETHPairToken0 === WETHPartner.address
                                ? WETHPartnerAmount.add(expectedSwapAmount)
                                : ETHAmount.sub(outputAmount),
                            WETHPairToken0 === WETHPartner.address
                                ? ETHAmount.sub(outputAmount)
                                : WETHPartnerAmount.add(expectedSwapAmount)
                        )
                        .to.emit(WETHPair, 'Swap')
                        .withArgs(
                            router.address,
                            WETHPairToken0 === WETHPartner.address ? expectedSwapAmount : 0,
                            WETHPairToken0 === WETHPartner.address ? 0 : expectedSwapAmount,
                            WETHPairToken0 === WETHPartner.address ? 0 : outputAmount,
                            WETHPairToken0 === WETHPartner.address ? outputAmount : 0,
                            router.address
                        )
                })

                it('amounts', async () => {
                    await WETHPartner.approve(routerEventEmitter.address, MaxUint256)
                    await expect(
                        routerEventEmitter.swapTokensForExactETH(
                            router.address,
                            outputAmount,
                            MaxUint256,
                            [WETHPartner.address, WETH.address],
                            wallet.address,
                            MaxUint256,
                            overrides
                        )
                    )
                        .to.emit(routerEventEmitter, 'Amounts')
                        .withArgs([expectedSwapAmount, outputAmount])
                })
            })

            describe('swapExactTokensForETH', () => {
                const WETHPartnerAmount = expandTo18Decimals(5)
                const ETHAmount = expandTo18Decimals(10)
                const swapAmount = expandTo18Decimals(1)
                const expectedOutputAmount = BigNumber.from('1662497915624478906')

                beforeEach(async () => {
                    await WETHPartner.transfer(WETHPair.address, WETHPartnerAmount)
                    await WETH.deposit({ value: ETHAmount, gasLimit: 9999999 })
                    await WETH.transfer(WETHPair.address, ETHAmount, overrides)
                    await WETHPair.mint(wallet.address, overrides)
                })

                it('happy path', async () => {
                    await WETHPartner.approve(router.address, MaxUint256)
                    const WETHPairToken0 = await WETHPair.token0()
                    await expect(
                        router.swapExactTokensForETH(
                            swapAmount,
                            0,
                            [WETHPartner.address, WETH.address],
                            wallet.address,
                            MaxUint256,
                            overrides
                        )
                    )
                        .to.emit(WETHPartner, 'Transfer')
                        .withArgs(wallet.address, WETHPair.address, swapAmount)
                        .to.emit(WETH, 'Transfer')
                        .withArgs(WETHPair.address, router.address, expectedOutputAmount)
                        .to.emit(WETHPair, 'Sync')
                        .withArgs(
                            WETHPairToken0 === WETHPartner.address
                                ? WETHPartnerAmount.add(swapAmount)
                                : ETHAmount.sub(expectedOutputAmount),
                            WETHPairToken0 === WETHPartner.address
                                ? ETHAmount.sub(expectedOutputAmount)
                                : WETHPartnerAmount.add(swapAmount)
                        )
                        .to.emit(WETHPair, 'Swap')
                        .withArgs(
                            router.address,
                            WETHPairToken0 === WETHPartner.address ? swapAmount : 0,
                            WETHPairToken0 === WETHPartner.address ? 0 : swapAmount,
                            WETHPairToken0 === WETHPartner.address ? 0 : expectedOutputAmount,
                            WETHPairToken0 === WETHPartner.address ? expectedOutputAmount : 0,
                            router.address
                        )
                })

                it('amounts', async () => {
                    await WETHPartner.approve(routerEventEmitter.address, MaxUint256)
                    await expect(
                        routerEventEmitter.swapExactTokensForETH(
                            router.address,
                            swapAmount,
                            0,
                            [WETHPartner.address, WETH.address],
                            wallet.address,
                            MaxUint256,
                            overrides
                        )
                    )
                        .to.emit(routerEventEmitter, 'Amounts')
                        .withArgs([swapAmount, expectedOutputAmount])
                })
            })

            describe('swapETHForExactTokens', () => {
                const WETHPartnerAmount = expandTo18Decimals(10)
                const ETHAmount = expandTo18Decimals(5)
                const expectedSwapAmount = BigNumber.from('557227237267357629')
                const outputAmount = expandTo18Decimals(1)

                beforeEach(async () => {
                    await WETHPartner.transfer(WETHPair.address, WETHPartnerAmount)
                    await WETH.deposit({ value: ETHAmount, gasLimit: 9999999 })
                    await WETH.transfer(WETHPair.address, ETHAmount, overrides)
                    await WETHPair.mint(wallet.address, overrides)
                })

                it('happy path', async () => {
                    const WETHPairToken0 = await WETHPair.token0()
                    await expect(
                        router.swapETHForExactTokens(
                            outputAmount,
                            [WETH.address, WETHPartner.address],
                            wallet.address,
                            MaxUint256,
                            {
                                ...overrides,
                                value: expectedSwapAmount
                            }
                        )
                    )
                        .to.emit(WETH, 'Transfer')
                        .withArgs(router.address, WETHPair.address, expectedSwapAmount)
                        .to.emit(WETHPartner, 'Transfer')
                        .withArgs(WETHPair.address, wallet.address, outputAmount)
                        .to.emit(WETHPair, 'Sync')
                        .withArgs(
                            WETHPairToken0 === WETHPartner.address
                                ? WETHPartnerAmount.sub(outputAmount)
                                : ETHAmount.add(expectedSwapAmount),
                            WETHPairToken0 === WETHPartner.address
                                ? ETHAmount.add(expectedSwapAmount)
                                : WETHPartnerAmount.sub(outputAmount)
                        )
                        .to.emit(WETHPair, 'Swap')
                        .withArgs(
                            router.address,
                            WETHPairToken0 === WETHPartner.address ? 0 : expectedSwapAmount,
                            WETHPairToken0 === WETHPartner.address ? expectedSwapAmount : 0,
                            WETHPairToken0 === WETHPartner.address ? outputAmount : 0,
                            WETHPairToken0 === WETHPartner.address ? 0 : outputAmount,
                            wallet.address
                        )
                })

                it('amounts', async () => {
                    await expect(
                        routerEventEmitter.swapETHForExactTokens(
                            router.address,
                            outputAmount,
                            [WETH.address, WETHPartner.address],
                            wallet.address,
                            MaxUint256,
                            {
                                ...overrides,
                                value: expectedSwapAmount
                            }
                        )
                    )
                        .to.emit(routerEventEmitter, 'Amounts')
                        .withArgs([expectedSwapAmount, outputAmount])
                })
            })
        })
    }
})

describe('fee-on-transfer tokens', () => {
    let DTT: Contract
    let WETH: Contract
    let router: Contract
    let pair: Contract

    let wallet : any
    before(async function() {
            wallet = await loadWallet()
            console.log(`  wallet is ${wallet.address}  `)
        }
    )

    beforeEach(async function() {
        const fixture = await v2Fixture(wallet)

        WETH = fixture.WETH
        router = fixture.router02

        DTT = await deployContract('DeflatingERC20', [expandTo18Decimals(10000)])
        // make a DTT<>WETH pair
        let tx = await fixture.factoryV2.createPair(DTT.address, WETH.address)
        await tx.wait()
        const pairAddress = await fixture.factoryV2.getPair(DTT.address, WETH.address)

        pair = await ethers.getContractAt('IAdamPair', pairAddress)
    })

    afterEach(async function() {
        expect(await ethers.provider.getBalance(router.address)).to.eq(0)
    })

    async function addLiquidity(DTTAmount: BigNumber, WETHAmount: BigNumber) {
        await DTT.approve(router.address, MaxUint256)
        let tx = await router.addLiquidityETH(DTT.address, DTTAmount, DTTAmount, WETHAmount, wallet.address, MaxUint256, {
            ...overrides,
            value: WETHAmount
        })
        await tx.wait()
    }

    it('removeLiquidityETHSupportingFeeOnTransferTokens', async () => {
        const DTTAmount = expandTo18Decimals(1)
        const ETHAmount = expandTo18Decimals(4)
        await addLiquidity(DTTAmount, ETHAmount)

        const DTTInPair = await DTT.balanceOf(pair.address)
        const WETHInPair = await WETH.balanceOf(pair.address)
        const liquidity = await pair.balanceOf(wallet.address)
        const totalSupply = await pair.totalSupply()
        const NaiveDTTExpected = DTTInPair.mul(liquidity).div(totalSupply)
        const WETHExpected = WETHInPair.mul(liquidity).div(totalSupply)

        await pair.approve(router.address, MaxUint256)
        await router.removeLiquidityETHSupportingFeeOnTransferTokens(
            DTT.address,
            liquidity,
            NaiveDTTExpected,
            WETHExpected,
            wallet.address,
            MaxUint256,
            overrides
        )
    })

    it('removeLiquidityETHWithPermitSupportingFeeOnTransferTokens', async () => {
        const DTTAmount = expandTo18Decimals(1)
            .mul(100)
            .div(99)
        const ETHAmount = expandTo18Decimals(4)
        await addLiquidity(DTTAmount, ETHAmount)

        const expectedLiquidity = expandTo18Decimals(2)

        const nonce = await pair.nonces(wallet.address)
        const digest = await getApprovalDigest(
            pair,
            { owner: wallet.address, spender: router.address, value: expectedLiquidity.sub(MINIMUM_LIQUIDITY) },
            nonce,
            MaxUint256
        )
        const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(wallet.privateKey.slice(2), 'hex'))

        const DTTInPair = await DTT.balanceOf(pair.address)
        const WETHInPair = await WETH.balanceOf(pair.address)
        const liquidity = await pair.balanceOf(wallet.address)
        const totalSupply = await pair.totalSupply()
        const NaiveDTTExpected = DTTInPair.mul(liquidity).div(totalSupply)
        const WETHExpected = WETHInPair.mul(liquidity).div(totalSupply)

        await pair.approve(router.address, MaxUint256)
        await router.removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
            DTT.address,
            liquidity,
            NaiveDTTExpected,
            WETHExpected,
            wallet.address,
            MaxUint256,
            false,
            v,
            r,
            s,
            overrides
        )
    })

    describe('swapExactTokensForTokensSupportingFeeOnTransferTokens', () => {
        const DTTAmount = expandTo18Decimals(5)
            .mul(100)
            .div(99)
        const ETHAmount = expandTo18Decimals(10)
        const amountIn = expandTo18Decimals(1)

        beforeEach(async () => {
            await addLiquidity(DTTAmount, ETHAmount)
        })

        it('DTT -> WETH', async () => {
            await DTT.approve(router.address, MaxUint256)

            await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                amountIn,
                0,
                [DTT.address, WETH.address],
                wallet.address,
                MaxUint256,
                overrides
            )
        })

        // WETH -> DTT
        it('WETH -> DTT', async () => {
            await WETH.deposit({ value: amountIn }) // mint WETH
            await WETH.approve(router.address, MaxUint256)

            await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                amountIn,
                0,
                [WETH.address, DTT.address],
                wallet.address,
                MaxUint256,
                overrides
            )
        })
    })

    // ETH -> DTT
    it('swapExactETHForTokensSupportingFeeOnTransferTokens', async () => {
        const DTTAmount = expandTo18Decimals(10)
            .mul(100)
            .div(99)
        const ETHAmount = expandTo18Decimals(5)
        const swapAmount = expandTo18Decimals(1)
        await addLiquidity(DTTAmount, ETHAmount)

        await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
            0,
            [WETH.address, DTT.address],
            wallet.address,
            MaxUint256,
            {
                ...overrides,
                value: swapAmount
            }
        )
    })

    // DTT -> ETH
    it('swapExactTokensForETHSupportingFeeOnTransferTokens', async () => {
        const DTTAmount = expandTo18Decimals(5)
            .mul(100)
            .div(99)
        const ETHAmount = expandTo18Decimals(10)
        const swapAmount = expandTo18Decimals(1)

        await addLiquidity(DTTAmount, ETHAmount)
        await DTT.approve(router.address, MaxUint256)

        await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            swapAmount,
            0,
            [DTT.address, WETH.address],
            wallet.address,
            MaxUint256,
            overrides
        )
    })
})

describe('fee-on-transfer tokens: reloaded', () => {
    let DTT: Contract
    let DTT2: Contract
    let router: Contract

    let wallet : any
    before(async function() {
            const accounts = await ethers.getSigners()
            wallet = accounts[0]
            console.log(`  wallet is ${wallet.address}  `)
        }
    )

    beforeEach(async function() {
        const fixture = await v2Fixture(wallet)

        router = fixture.router02

        DTT = await deployContract('DeflatingERC20', [expandTo18Decimals(10000)])
        DTT2 = await deployContract('DeflatingERC20', [expandTo18Decimals(10000)])

        // make a DTT<>WETH pair
        await fixture.factoryV2.createPair(DTT.address, DTT2.address)
        const pairAddress = await fixture.factoryV2.getPair(DTT.address, DTT2.address)
    })

    afterEach(async function() {
        expect(await ethers.provider.getBalance(router.address)).to.eq(0)
    })

    async function addLiquidity(DTTAmount: BigNumber, DTT2Amount: BigNumber) {
        await DTT.approve(router.address, MaxUint256)
        await DTT2.approve(router.address, MaxUint256)
        let tx = await router.addLiquidity(
            DTT.address,
            DTT2.address,
            DTTAmount,
            DTT2Amount,
            DTTAmount,
            DTT2Amount,
            wallet.address,
            MaxUint256,
            overrides
        )
        await tx.wait()
    }

    describe('swapExactTokensForTokensSupportingFeeOnTransferTokens', () => {
        const DTTAmount = expandTo18Decimals(5)
            .mul(100)
            .div(99)
        const DTT2Amount = expandTo18Decimals(5)
        const amountIn = expandTo18Decimals(1)

        beforeEach(async () => {
            await addLiquidity(DTTAmount, DTT2Amount)
        })

        it('DTT -> DTT2', async () => {
            await DTT.approve(router.address, MaxUint256)

            await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                amountIn,
                0,
                [DTT.address, DTT2.address],
                wallet.address,
                MaxUint256,
                overrides
            )
        })
    })
})
