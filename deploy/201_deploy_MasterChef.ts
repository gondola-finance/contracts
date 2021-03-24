import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { BigNumber } from "ethers"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy, get } = deployments
  const { deployer } = await getNamedAccounts()
  let tokenAddress = (await get("GondolaToken")).address

  await deploy("MasterChef", {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [tokenAddress],
  })
}

export default func
func.tags = ["MasterChef"]
func.dependencies = ["GondolaToken"]
