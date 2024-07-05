import { Wallet } from "ethers";
import { ethers } from "hardhat";
import { task } from "hardhat/config";
import { Signer } from "zksync-web3";

// approve first, and need to change the last param deadline in addLiquidity to a available timestamp
task("AdamRouterLiquidity", "AdamRouter addLiquidity, addLiquidityETH")
.addParam("type", "addLiquidity/addLiquidityETH/removeLiquidity/removeLiquidityETH")
.addParam("factory")
.addParam("router")
.addParam("weth")
.addParam("token0")
.addParam("myaddress")
.addParam("deadline", "deadline timestamp")
.setAction(async (taskArgs, hre) => {
    const adamFactory = await hre.ethers.getContractAt("IAdamFactory", taskArgs['factory']);
    const adamRouter = await hre.ethers.getContractAt('AdamRouter', taskArgs['router'])
    const pairAddress = await adamFactory.getPair(taskArgs['weth'], taskArgs['token0']);
    const pairContract = await hre.ethers.getContractAt("IUniswapV2Pair", pairAddress);
    const lp = hre.ethers.BigNumber.from(await pairContract.totalSupply());
    const rmLp = lp.div(hre.ethers.BigNumber.from("10000"));

    const amountADesired = hre.ethers.utils.parseEther("2000000"); // Adjust the amount of WETH
    const amountBDesired = hre.ethers.utils.parseEther("500000"); 


    // Approve tokens if needed
    const wethContract = await hre.ethers.getContractAt("IERC20", taskArgs.weth);
    const token0Contract = await hre.ethers.getContractAt("IERC20", taskArgs.token0);

    const approveWethTx = await wethContract.approve(taskArgs.router, amountADesired);
    await approveWethTx.wait();
    console.log("WETH approved");

    const approveToken0Tx = await token0Contract.approve(taskArgs.router, amountBDesired);
    await approveToken0Tx.wait();
    console.log("Token0 approved");

    console.log("liquidity totalSupply:", lp);
    console.log("myAddress's liquidity:", hre.ethers.BigNumber.from(await pairContract.balanceOf(taskArgs['myaddress'])));

    switch(taskArgs['type']){
        case 'addLiquidity':
            console.log("AdamRouter addLiquidity to weth-token pair: ");
           
            console.log("AdamRouter addLiquidity to weth-token pair: ");
            await adamRouter.addLiquidity(taskArgs['weth'], taskArgs['token0'],amountADesired, amountBDesired, 0, 0, taskArgs['myaddress'], taskArgs['deadline']);
            console.log("myAddress's liquidity:", hre.ethers.BigNumber.from(await pairContract.balanceOf(taskArgs['myaddress'])));
            break;
        case 'addLiquidityETH':
            // addLiquidityETH
            console.log("AdamRouter addLiquidityETH to weth-token pair: ");
            await adamRouter.addLiquidityETH(taskArgs['token0'], hre.ethers.utils.parseEther("1"), 0, 0, taskArgs['myaddress'], taskArgs['deadline'], { value: hre.ethers.utils.parseEther('0.00011') })
            console.log("myAddress's liquidity after addLiquidityETH:", hre.ethers.BigNumber.from(await pairContract.balanceOf(taskArgs['myAddress'])));
            break;
        case 'removeLiquidity':
            console.log("remove liquidity:", rmLp);
            await adamRouter.removeLiquidity(taskArgs['weth'], taskArgs['token0'], rmLp, 0, 0, taskArgs['myaddress'], taskArgs['deadline']);
            console.log("myAddress's liquidity after removeLiquidity:", await pairContract.balanceOf(taskArgs['myaddress']));
            break;
        case 'removeLiquidityETH':
            console.log("remove liquidityETH:", rmLp);
            await adamRouter.removeLiquidityETH(taskArgs['token0'], rmLp, 0, 0, taskArgs['myAddress'], taskArgs['deadline']);
            console.log("myAddress's liquidity after removeLiquidity:", await pairContract.balanceOf(taskArgs['myaddress']));
            break;
        case 'removeLiquidityETHSupportingFeeOnTransferTokens':
            console.log("remove liquidityETH Supporting FeeOn Transfer Tokens:", rmLp);
            await adamRouter.removeLiquidityETH(taskArgs['token0'], rmLp, 0, 0, taskArgs['myAddress'], taskArgs['deadline']);
            console.log("myAddress's liquidity after removeLiquidity:", await pairContract.balanceOf(taskArgs['myaddress']));
            break;
        default:
            console.log("input right type parameter please");
    }
    console.log("liquidity task finnished...");
  });
