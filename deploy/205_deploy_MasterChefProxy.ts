import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { BigNumber } from "ethers"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy, get, execute } = deployments
  const { deployer } = await getNamedAccounts()

  let masterChefAddress = (await get("MasterChef")).address

  await deploy("MasterChefProxy", {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [masterChefAddress],
  })
  let masterChefProxyAddress = (await get("MasterChefProxy")).address

  await execute("MasterChef", { from: deployer, log: true }, "transferOwnership", masterChefProxyAddress)

}

export default func
func.tags = ["MasterChefProxy"]
func.dependencies = ["MasterChef"]
