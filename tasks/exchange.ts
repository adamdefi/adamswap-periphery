import { task } from "hardhat/config";

task("AdamRouterExchange", "AdamRouter make some exchange")
.addParam("type", "tokens/tokensAndETH/feeOnTransfer")
.addParam("factory")
.addParam("router")
.addParam("weth")
.addParam("token0")
.addParam("myAddress")
.addParam("deadline", "deadline timestamp")
.setAction(async (taskArgs, hre) => {
    const wethContract = await hre.ethers.getContractAt("WETH9", taskArgs['weth']);
    const tokenContract = await hre.ethers.getContractAt('ERC20', taskArgs['token0'])
    const adamRouter = await hre.ethers.getContractAt('AdamRouter', taskArgs['router'])
  
    const token0_0 = await tokenContract.balanceOf(taskArgs['myAddress']);
    const weth_0 = await wethContract.balanceOf(taskArgs['myAddress']);
    const eth_0 = await hre.ethers.provider.getBalance(taskArgs['myAddress']);
    console.log("token balance: ", token0_0);
    console.log("weth balance: ", weth_0);
    console.log("eth balance: ", eth_0);

    switch(taskArgs['type']){
        case 'tokens':
            // swapExactTokensForTokens
            console.log("swapExactTokensForTokens weth to token... ");
            await adamRouter.swapExactTokensForTokens(hre.ethers.utils.parseEther("0.0000001"), 0, [taskArgs['weth'], taskArgs['token0']], taskArgs['myAddress'], taskArgs['deadline']);
            const token0_1 = await tokenContract.balanceOf(taskArgs['myAddress']);
            const weth_1 = await wethContract.balanceOf(taskArgs['myAddress']);
            console.log("token balance after swapExactTokensForTokens: ", token0_1);
            console.log("weth balance after swapExactTokensForTokens: ", weth_1);
            console.log("token balance change: ", token0_1.sub(token0_0));
            console.log("weth balance change: ", weth_1.sub(weth_0));
        
            // swapTokensForExactTokens
            console.log("swapTokensForExactTokens token to weth... ");
            await adamRouter.swapTokensForExactTokens(hre.ethers.utils.parseEther("0.0000001"), hre.ethers.constants.MaxUint256, [taskArgs['token0'], taskArgs['weth']], taskArgs['myAddress'], taskArgs['deadline']);
            console.log("swapTokensForExactTokens token to weth completed");
            const token0_2 = await tokenContract.balanceOf(taskArgs['myAddress']);
            const weth_2 = await wethContract.balanceOf(taskArgs['myAddress']);
            console.log("token balance after swapTokensForExactTokens: ", token0_2);
            console.log("weth balance after swapTokensForExactTokens: ", weth_2);
            console.log("token balance change: ", token0_2.sub(token0_1));
            console.log("weth balance change: ", weth_2.sub(weth_1));
            break;
        case 'tokensAndETH':
            // swapExactETHForTokens
            console.log("weth totalSupply: ", await wethContract.totalSupply());
            console.log("swapExactETHForTokens token to weth... ");
            await adamRouter.swapExactETHForTokens(0, [taskArgs['weth'], taskArgs['token0']], taskArgs['myAddress'], taskArgs['deadline'], { value: hre.ethers.utils.parseEther('0.0000001') });
            console.log("swapExactETHForTokens token to weth completed");
            const token0_3 = await tokenContract.balanceOf(taskArgs['myAddress']);
            const eth_1 = await hre.ethers.provider.getBalance(taskArgs['myAddress']);
            console.log("token balance after swapExactETHForTokens: ", token0_3);
            console.log("eth balance after swapExactETHForTokens: ", eth_1);
            console.log("token balance change: ", token0_3.sub(token0_0));
            console.log("eth balance change: ", eth_1.sub(eth_0));
            console.log("weth totalSupply: ", await wethContract.totalSupply());
        
            // swapTokensForExactETH
            console.log("swapTokensForExactETH token to weth... ");
            await adamRouter.swapTokensForExactETH(hre.ethers.utils.parseEther("0.0000001"), hre.ethers.constants.MaxUint256, [taskArgs['token0'], taskArgs['weth']], taskArgs['myAddress'], taskArgs['deadline']);
            console.log("swapTokensForExactETH token to weth completed");
            const token0_4 = await tokenContract.balanceOf(taskArgs['myAddress']);
            const eth_2 = await hre.ethers.provider.getBalance(taskArgs['myAddress']);
            console.log("token balance after swapTokensForExactETH: ", token0_4);
            console.log("eth balance after swapTokensForExactETH: ", eth_2);
            console.log("token balance change: ", token0_4.sub(token0_3));
            console.log("eth balance change: ", eth_2.sub(eth_1));
            console.log("weth totalSupply: ", await wethContract.totalSupply());
        
            // swapExactTokensForETH
            console.log("swapExactTokensForETH token to weth... ");
            await adamRouter.swapExactTokensForETH(hre.ethers.utils.parseEther("0.000001"), 0, [taskArgs['token0'], taskArgs['weth']], taskArgs['myAddress'], taskArgs['deadline']);
            console.log("swapExactTokensForETH token to weth completed");
            const token0_5 = await tokenContract.balanceOf(taskArgs['myAddress']);
            const eth_3 = await hre.ethers.provider.getBalance(taskArgs['myAddress']);
            console.log("token balance after swapExactTokensForETH: ", token0_5);
            console.log("eth balance after swapExactTokensForETH: ", eth_3);
            console.log("token balance change: ", token0_5.sub(token0_4));
            console.log("eth balance change: ", eth_3.sub(eth_2));
            console.log("weth totalSupply: ", await wethContract.totalSupply());
        
            // swapETHForExactTokens
            console.log("swapETHForExactTokens token to weth... ");
            await adamRouter.swapETHForExactTokens(hre.ethers.utils.parseEther("0.0000008"), [taskArgs['weth'], taskArgs['token0']], taskArgs['myAddress'], taskArgs['deadline'], { value: hre.ethers.utils.parseEther('0.0000001') });
            console.log("swapETHForExactTokens token to weth completed");
            const token0_6 = await tokenContract.balanceOf(taskArgs['myAddress']);
            const eth_4 = await hre.ethers.provider.getBalance(taskArgs['myAddress']);
            console.log("token balance after swapETHForExactTokens: ", token0_6);
            console.log("eth balance after swapETHForExactTokens: ", eth_4);
            console.log("token balance change: ", token0_6.sub(token0_5));
            console.log("eth balance change: ", eth_4.sub(eth_3));
            console.log("weth totalSupply: ", await wethContract.totalSupply());
            break;
        case 'feeOnTransfer':
            // swapExactTokensForTokensSupportingFeeOnTransferTokens
            console.log("swapExactTokensForTokensSupportingFeeOnTransferTokens weth to token... ");
            await adamRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(hre.ethers.utils.parseEther("0.0000001"), 0, [taskArgs['weth'], taskArgs['token0']], taskArgs['myAddress'], taskArgs['deadline']);
            const token0_7 = await tokenContract.balanceOf(taskArgs['myAddress']);
            const weth_3 = await wethContract.balanceOf(taskArgs['myAddress']);
            console.log("token balance after swapExactTokensForTokensSupportingFeeOnTransferTokens: ", token0_7);
            console.log("weth balance after swapExactTokensForTokensSupportingFeeOnTransferTokens: ", weth_3);
            console.log("token balance change: ", token0_7.sub(token0_0));
            console.log("weth balance change: ", weth_3.sub(weth_0));

            // swapExactETHForTokensSupportingFeeOnTransferTokens
            console.log("weth totalSupply: ", await wethContract.totalSupply());
            console.log("swapExactETHForTokensSupportingFeeOnTransferTokens token to weth... ");
            await adamRouter.swapExactETHForTokensSupportingFeeOnTransferTokens(0, [taskArgs['weth'], taskArgs['token0']], taskArgs['myAddress'], taskArgs['deadline'], { value: hre.ethers.utils.parseEther('0.0000001') });
            console.log("swapExactETHForTokensSupportingFeeOnTransferTokens token to weth completed");
            const token0_8 = await tokenContract.balanceOf(taskArgs['myAddress']);
            const eth_5 = await hre.ethers.provider.getBalance(taskArgs['myAddress']);
            console.log("token balance after swapExactETHForTokensSupportingFeeOnTransferTokens: ", token0_8);
            console.log("eth balance after swapExactETHForTokensSupportingFeeOnTransferTokens: ", eth_5);
            console.log("token balance change: ", token0_8.sub(token0_7));
            console.log("eth balance change: ", eth_5.sub(eth_0));
            console.log("weth totalSupply: ", await wethContract.totalSupply());

            // swapExactTokensForETHSupportingFeeOnTransferTokens
            console.log("swapExactTokensForETHSupportingFeeOnTransferTokens token to weth... ");
            await adamRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(hre.ethers.utils.parseEther("0.000001"), 0, [taskArgs['token0'], taskArgs['weth']], taskArgs['myAddress'], taskArgs['deadline']);
            console.log("swapExactTokensForETHSupportingFeeOnTransferTokens token to weth completed");
            const token0_9 = await tokenContract.balanceOf(taskArgs['myAddress']);
            const eth_6 = await hre.ethers.provider.getBalance(taskArgs['myAddress']);
            console.log("token balance after swapExactTokensForETHSupportingFeeOnTransferTokens: ", token0_9);
            console.log("eth balance after swapExactTokensForETHSupportingFeeOnTransferTokens: ", eth_6);
            console.log("token balance change: ", token0_9.sub(token0_8));
            console.log("eth balance change: ", eth_6.sub(eth_5));
            console.log("weth totalSupply: ", await wethContract.totalSupply());
            break;
    }
    
  
    
});
