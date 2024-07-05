import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    await deployUniswap();
}

async function deployUniswap() {
    console.log(`${"-".repeat(32) + deployUniswap.name + "-".repeat(32)}`);

    const factoryAddress = process.env.FACTORY == undefined ? "" : process.env.FACTORY;
    const wethAddress = process.env.WETH == undefined ? "" : process.env.WETH;
    // const factory = ethers.getContractAt();
    const router = await (await (await ethers.getContractFactory('AdamRouter')).deploy(factoryAddress, wethAddress)).deployed()
    console.log(`${"Router deployed to : ".padStart(28)}${router.address}`);
    const multicall = await (await (await ethers.getContractFactory('Multicall3')).deploy()).deployed()
    console.log(`${"Multicall3 deployed to : ".padStart(28)}${multicall.address}`);

    return;
}

main().then(() => console.log(" ")).catch(console.error);
