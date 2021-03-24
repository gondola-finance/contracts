import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { BigNumber } from "ethers"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { execute, deploy, get } = deployments
  const { deployer } = await getNamedAccounts()

  await deploy("GondolaToken", {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [BigNumber.from(500_000_000).mul(BigNumber.from(10).pow(18))],
  })
  //let tokenAddress = (await get("GondolaToken")).address
  // await execute("GondolaToken", { from: deployer, log: true }, "distribute", deployer, BigNumber.from(100).mul(BigNumber.from(10).pow(18)))
}
export default func
func.tags = []
