import { BaseContract, Contract, Wallet } from 'ethers'
import { expandTo18Decimals } from './utilities'
import { ethers } from 'hardhat'
import * as zk from 'zksync-web3'
import { Deployer } from '@matterlabs/hardhat-zksync-deploy'
import AdamFactory from '../../build/AdamFactory.json'
import AdamFactory_zk from '../../build/AdamFactory_zk.json'

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ZkSyncArtifact } from '@matterlabs/hardhat-zksync-deploy/dist/types'
import { any } from 'hardhat/internal/core/params/argumentTypes'

const hre = require('hardhat')

const overrides = {
    gasLimit: 9999999
}

interface V2Fixture {
    token0: Contract
    token1: Contract
    WETH: Contract
    WETHPartner: Contract
    factoryV2: Contract
    router02: Contract
    routerEventEmitter: Contract
    router: Contract
    pair: Contract
    WETHPair: Contract
}

export async function loadWallet() {
    let wallet
    if (hre.network.name == 'hardhat') {
        const accounts = await hre.config.networks.hardhat.accounts
        wallet = ethers.Wallet.fromMnemonic(accounts.mnemonic, accounts.path + `/${0}`)
    } else if (hre.network.name == 'localhost') {
        const accounts = await hre.config.networks.localhost.accounts
        wallet = new ethers.Wallet(accounts[0])
    } else if (hre.network.name == 'zksyncdev') {
        const accounts = await hre.config.networks.zksyncdev.accounts
        wallet = new zk.Wallet(accounts[0])
    } else if (hre.network.name == 'zksynctest') {
        const accounts = await hre.config.networks.zksynctest.accounts
        wallet = new zk.Wallet(accounts[0])
    }
    return wallet
}

export async function deployContract(contractName : string, params = [] as any) {
    if (hre.network.name == 'zksyncdev' || hre.network.name == 'zksynctest') {
        const zkDeployer = new Deployer(hre, new zk.Wallet(hre.config.networks.zksyncdev.accounts[0]))
        if (contractName == 'AdamFactory') {
            //For zksync env, load AdamFactory from existing address
            return (await ethers.getContractAtFromArtifact(AdamFactory_zk, process.env.FACTORY!)) as BaseContract
        } else {
            let artifact = (await zkDeployer.loadArtifact(contractName)) as ZkSyncArtifact
            return (await zkDeployer.deploy(artifact, params, overrides)) as BaseContract
        }
    } else {
        let C
        if (contractName == 'AdamFactory') {
            C = await ethers.getContractFactoryFromArtifact(AdamFactory)
        } else {
            C = await ethers.getContractFactory(contractName)
        }
        return (await C.deploy(...params)) as BaseContract
    }
}

export async function v2Fixture(wallet: SignerWithAddress): Promise<V2Fixture> {
    // deploy tokens
    const tokenA = await deployContract('ERC20', [expandTo18Decimals(10000)])
    const tokenB = await deployContract('ERC20', [expandTo18Decimals(10000)])
    const WETH = await deployContract('WETH9')
    const WETHPartner = await deployContract('ERC20', [expandTo18Decimals(10000)])

    // deploy factory
    const factoryV2 = (await deployContract('AdamFactory', [wallet.address])) as Contract

    // deploy routers
    const router02 = await deployContract('AdamRouter', [factoryV2.address, WETH.address])

    // event emitter for testing
    const routerEventEmitter = await deployContract('RouterEventEmitter', [])

    // initialize V2
    let tx = await factoryV2.createPair(tokenA.address, tokenB.address, overrides)
    await tx.wait()
    const pairAddress = await factoryV2.getPair(tokenA.address, tokenB.address)

    const pair = await ethers.getContractAt('IAdamPair', pairAddress)
    const token0Address = await pair.token0()
    const token0 = tokenA.address === token0Address ? tokenA : tokenB
    const token1 = tokenA.address === token0Address ? tokenB : tokenA

    tx = await factoryV2.createPair(WETH.address, WETHPartner.address)
    await tx.wait()
    const WETHPairAddress = await factoryV2.getPair(WETH.address, WETHPartner.address)
    const WETHPair = await ethers.getContractAt('IAdamPair', WETHPairAddress)

    return {
        token0,
        token1,
        WETH,
        WETHPartner,
        factoryV2,
        router02,
        router: router02, // the default router
        routerEventEmitter,
        pair,
        WETHPair
    }
}
