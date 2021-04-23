import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { CHAIN_ID } from "../utils/network"
import path from "path"
import { BigNumber } from "ethers"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { execute, log, read, get } = deployments
  const { deployer } = await getNamedAccounts()
  let poolAddress = (await get("GondolaUSDPool")).address

  const TOKENS = ["DAI", "USDT"]
  

  const amounts = []

  const currentChain = await getChainId()
  if (currentChain == CHAIN_ID.AVAFUJI) {
    for (const token of TOKENS) {
      let decimals = await read(token, "decimals")
      let amount = BigNumber.from(100000).mul(BigNumber.from(10).pow(decimals))
      await execute(token, { from: deployer, log: true }, "mint", deployer, amount)
      
    //   await execute(
    //     token,
    //     { from: deployer, log: true },
    //     "approve",
    //     poolAddress,
    //     amount.div(10),
    //   )
    //   amounts.push(amount)
    }
    // console.log(amounts)
    // await execute(
    //   "GondolaUSDPool",
    //   { from: deployer, log: true },
    //   "addLiquidity",
    //   amounts,
    //   1,
    //   new Date().getTime(),
    // )
  } else {
    log(`deployment is not on testnet. skipping ${path.basename(__filename)}`)
  }
}

export default func
func.tags = ["TransferOwnership"]
func.dependencies = [ "USDPool"]
