//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '../libraries/AdamLiquidityMathLibrary.sol';

contract ExampleComputeLiquidityValue {
    address public immutable factory;

    constructor(address factory_) {
        factory = factory_;
    }

    // see AdamLiquidityMathLibrary#getReservesAfterArbitrage
    function getReservesAfterArbitrage(
        address tokenA,
        address tokenB,
        uint256 truePriceTokenA,
        uint256 truePriceTokenB
    ) external view returns (uint256 reserveA, uint256 reserveB) {
        return AdamLiquidityMathLibrary.getReservesAfterArbitrage(
            factory,
            tokenA,
            tokenB,
            truePriceTokenA,
            truePriceTokenB
        );
    }

    // see AdamLiquidityMathLibrary#getLiquidityValue
    function getLiquidityValue(
        address tokenA,
        address tokenB,
        uint256 liquidityAmount
    ) external view returns (
        uint256 tokenAAmount,
        uint256 tokenBAmount
    ) {
        return AdamLiquidityMathLibrary.getLiquidityValue(
            factory,
            tokenA,
            tokenB,
            liquidityAmount
        );
    }

    // see AdamLiquidityMathLibrary#getLiquidityValueAfterArbitrageToPrice
    function getLiquidityValueAfterArbitrageToPrice(
        address tokenA,
        address tokenB,
        uint256 truePriceTokenA,
        uint256 truePriceTokenB,
        uint256 liquidityAmount
    ) external view returns (
        uint256 tokenAAmount,
        uint256 tokenBAmount
    ) {
        return AdamLiquidityMathLibrary.getLiquidityValueAfterArbitrageToPrice(
            factory,
            tokenA,
            tokenB,
            truePriceTokenA,
            truePriceTokenB,
            liquidityAmount
        );
    }

    // test function to measure the gas cost of the above function
    function getGasCostOfGetLiquidityValueAfterArbitrageToPrice(
        address tokenA,
        address tokenB,
        uint256 truePriceTokenA,
        uint256 truePriceTokenB,
        uint256 liquidityAmount
    ) external view returns (
        uint256
    ) {
        uint gasBefore = gasleft();
        AdamLiquidityMathLibrary.getLiquidityValueAfterArbitrageToPrice(
            factory,
            tokenA,
            tokenB,
            truePriceTokenA,
            truePriceTokenB,
            liquidityAmount
        );
        uint gasAfter = gasleft();
        return gasBefore - gasAfter;
    }
}
