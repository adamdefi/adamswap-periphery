import { Contract } from 'ethers'
import { Web3Provider } from '@ethersproject/providers'
import { BigNumber } from '@ethersproject/bignumber'
import { defaultAbiCoder } from '@ethersproject/abi'
import { keccak256 } from '@ethersproject/keccak256'
import { toUtf8Bytes } from '@ethersproject/strings'
import { pack } from '@ethersproject/solidity'
import { ethers } from 'hardhat'
const hre = require('hardhat')

export const MINIMUM_LIQUIDITY = BigNumber.from(10).pow(3)

const PERMIT_TYPEHASH = keccak256(
  toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
)

export function expandTo18Decimals(n: number): BigNumber {
    return BigNumber.from(n).mul(BigNumber.from(10).pow(18))
}

function getDomainSeparator(name: string, tokenAddress: string) {
    return keccak256(
      defaultAbiCoder.encode(
        ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
        [
            keccak256(toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
            keccak256(toUtf8Bytes(name)),
            keccak256(toUtf8Bytes('1')),
            hre.network.config.chainId,
            tokenAddress
        ]
      )
    )
}

export async function getApprovalDigest(
  token: Contract,
  approve: {
      owner: string
      spender: string
      value: BigNumber
  },
  nonce: BigNumber,
  deadline: BigNumber
): Promise<string> {
    const name = await token.name()
    const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address)
    return keccak256(
      pack(
        ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
        [
            '0x19',
            '0x01',
            DOMAIN_SEPARATOR,
            keccak256(
              defaultAbiCoder.encode(
                ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
                [PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline]
              )
            )
        ]
      )
    )
}

export async function mineBlock(timestamp: number): Promise<void> {
    if (hre.network.name == 'hardhat') {
        await ethers.provider.send('evm_setNextBlockTimestamp', [timestamp])
    } else if (hre.network.name == 'localhost') {
        await ethers.provider.send('evm_setTime', [timestamp * 1000])
    } else if (hre.network.name == 'zksyncdev' || hre.network.name == 'zksynctest') {
        return
    }
    return await ethers.provider.send('evm_mine', [])
}

export function encodePrice(reserve0: BigNumber, reserve1: BigNumber) {
    return [reserve1.mul(BigNumber.from(2).pow(112)).div(reserve0), reserve0.mul(BigNumber.from(2).pow(112)).div(reserve1)]
}
