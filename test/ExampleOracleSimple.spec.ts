import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { solidity } from 'ethereum-waffle'

import { encodePrice, expandTo18Decimals, mineBlock } from './shared/utilities'
import { deployContract, v2Fixture } from './shared/fixtures'

import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

chai.use(solidity)

const overrides = {
    gasLimit: 9999999
}

const token0Amount = expandTo18Decimals(5)
const token1Amount = expandTo18Decimals(10)

describe('ExampleOracleSimple', () => {
    let token0: Contract
    let token1: Contract
    let pair: Contract
    let exampleOracleSimple: Contract

    let wallet: SignerWithAddress
    before(async function() {
          const accounts = await ethers.getSigners()
          wallet = accounts[0]
          console.log(`  wallet is ${wallet.address}  `)
      }
    )

    async function addLiquidity() {
        await token0.transfer(pair.address, token0Amount)
        await token1.transfer(pair.address, token1Amount)
        await pair.mint(wallet.address, overrides)
    }

    beforeEach(async function() {
        const fixture = await v2Fixture(wallet)

        token0 = fixture.token0
        token1 = fixture.token1
        pair = fixture.pair
        await addLiquidity()
        exampleOracleSimple = await deployContract('ExampleOracleSimple',
          [fixture.factoryV2.address, token0.address, token1.address])
    })

    it('update', async () => {
        const blockTimestamp = (await pair.getReserves())[2]
        await mineBlock(blockTimestamp + 60 * 60 * 23)
        await expect(exampleOracleSimple.update(overrides)).to.be.reverted
        await mineBlock(blockTimestamp + 60 * 60 * 24)
        await exampleOracleSimple.update(overrides)

        const expectedPrice = encodePrice(token0Amount, token1Amount)

        expect(await exampleOracleSimple.price0Average()).to.eq(expectedPrice[0])
        expect(await exampleOracleSimple.price1Average()).to.eq(expectedPrice[1])

        expect(await exampleOracleSimple.consult(token0.address, token0Amount)).to.eq(token1Amount)
        expect(await exampleOracleSimple.consult(token1.address, token1Amount)).to.eq(token0Amount)
    })
})
