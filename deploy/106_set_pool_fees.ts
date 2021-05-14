import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { BigNumber } from "ethers"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy, get, execute, read } = deployments
  const { deployer } = await getNamedAccounts()
  const {adminFee} = await read("GondolaETHPool", "swapStorage")
  if (adminFee.eq(2e6)) {
    return
  }
  
  await execute("GondolaETHPool", { from: deployer, log: true }, "setAdminFee", 2e6)
  await execute("GondolaETHPool", { from: deployer, log: true }, "setSwapFee", 2e6)

  await execute("GondolaUSDTPool", { from: deployer, log: true }, "setAdminFee", 2e6)
  await execute("GondolaUSDTPool", { from: deployer, log: true }, "setSwapFee", 2e6)


  await execute("GondolaDAIPool", { from: deployer, log: true }, "setAdminFee", 2e6)
  await execute("GondolaDAIPool", { from: deployer, log: true }, "setSwapFee", 2e6)

  await execute("GondolaBTCPool", { from: deployer, log: true }, "setAdminFee", 2e6)
  await execute("GondolaBTCPool", { from: deployer, log: true }, "setSwapFee", 2e6)
}

export default func
func.tags = ["Update fees"]
func.dependencies = ["MasterChef"]

