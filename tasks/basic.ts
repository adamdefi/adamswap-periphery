import { task } from "hardhat/config";

task("AdamRouterInfo", "show AdamRouter info")
.addParam("factory")
.addParam("router")
.addParam("weth")
.addParam("token0")
.addParam("myAddress")
.setAction(async (taskArgs, hre) => {
  const wethContract = await hre.ethers.getContractAt("WETH9", taskArgs['weth']);
  const tokenContract = await hre.ethers.getContractAt("ERC20", taskArgs['token0']);
  const adamFactory = await hre.ethers.getContractAt('IAdamFactory', taskArgs['factory'])
  const adamRouter = await hre.ethers.getContractAt('AdamRouter', taskArgs['router'])

  // info
  console.log("AdamRouter WETH address: ", await adamRouter.WETH());
  console.log("AdamRouter factory address: ", await adamRouter.factory());
  const pairAddress = await adamFactory.getPair(taskArgs['weth'], taskArgs['token0']);
  console.log("AdamFactory weth-token getPair: ", pairAddress);
  console.log("token balance: ", await tokenContract.balanceOf(taskArgs['myAddress']));
  console.log("weth balance: ", await wethContract.balanceOf(taskArgs['myAddress']));
});

task("AdamRouterApproveTokens", "AdamRouter approve tokens")
.addParam("router")
.addParam("weth")
.addParam("token0")
.setAction(async (taskArgs, hre) => {
  const wethContract = await hre.ethers.getContractAt("WETH9", taskArgs['weth']);
  const tokenContract = await hre.ethers.getContractAt("ERC20", taskArgs['token0']);
  console.log("approve tokens start...");
  await wethContract.approve(taskArgs['router'], hre.ethers.constants.MaxUint256);
  await tokenContract.approve(taskArgs['router'], hre.ethers.constants.MaxUint256);
  console.log("approve tokens completed");
});

task("AdamRouterApproveLP", "AdamRouter approve LP")
.addParam("factory")
.addParam("router")
.addParam("weth")
.addParam("token0")
.setAction(async (taskArgs, hre) => {
  const adamFactory = await hre.ethers.getContractAt("IAdamFactory", taskArgs['factory']);
  const pairAddress = await adamFactory.getPair(taskArgs['weth'], taskArgs['token0']);
  const pairContract = await hre.ethers.getContractAt("IUniswapV2Pair", pairAddress);
  console.log("approve lp start...");
  await pairContract.approve(taskArgs['router'], hre.ethers.constants.MaxUint256);
  console.log("approve lp completed");

});

task("withdraw", "withdraw weth")
.addParam("weth")
.addParam("myAddress")
.setAction(async (taskArgs, hre) => {
  const wethContract = await hre.ethers.getContractAt("WETH9", taskArgs['weth']);
  console.log("weth contract eth balance : ", await hre.ethers.provider.getBalance(taskArgs['weth']));
  
  console.log("weth balance: ", await wethContract.balanceOf(taskArgs['myAddress']));
  console.log("weth withdraw start...");
  await wethContract.withdraw(hre.ethers.utils.parseEther("0.0001"));
  console.log("weth withdraw completed");
  console.log("weth balance after withdraw: ", await wethContract.balanceOf(taskArgs['myAddress']));
});
