import {ethers} from "hardhat";
import { Wallet } from "zksync-web3";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import * as dotenv from "dotenv";
dotenv.config();


export default async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Running deploy script for the AdamRouter contract`);

  // init params
  const factoryAddress = '0xeD0371C731B16c421C27d2140b7Ba7d0077e7DfA'; 
  const wethAddress = '0xdaB48025262189fAD131E21702a525ee2ebe5cE9';
  
  // init wallet
  const wallet = new Wallet(process.env.ZKSYNCTEST_PRIVATE_KEY !== undefined ? process.env.ZKSYNCTEST_PRIVATE_KEY : "");

  // new deployer
  const deployer = new Deployer(hre, wallet);

  // load AdamFactory contract
  const adamRouter = await deployer.loadArtifact("AdamRouter");
  // gas fee
  const deploymentRouterFee = await deployer.estimateDeployFee(adamRouter, [factoryAddress, wethAddress]);
  const parsedRouterFee = ethers.utils.formatEther(deploymentRouterFee.toString());
  console.log(`The deploymentRouter is estimated to cost ${parsedRouterFee} ETH`);
  // deploy contract
  const adamRouterContract = await deployer.deploy(adamRouter, [factoryAddress, wethAddress]);
  console.log("adamRouterContract constructor args:" + adamRouterContract.interface.encodeDeploy([factoryAddress, wethAddress]));
  console.log(`${adamRouter.contractName} was deployed to ${adamRouterContract.address}`);
}
