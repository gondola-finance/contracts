import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { BigNumber } from "ethers"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy, get, execute } = deployments
  const { deployer } = await getNamedAccounts()
  let masterChefAddress = (await get("MasterChef")).address

  await execute("GondolaToken", { from: deployer, log: true }, "transferOwnership", masterChefAddress)
}

export default func
func.tags = ["MasterChef"]
func.dependencies = ["GondolaToken"]
