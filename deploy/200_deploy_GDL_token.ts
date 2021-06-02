import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { BigNumber } from "ethers"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { execute, deploy, get } = deployments
  const { deployer } = await getNamedAccounts()
  const total = 500_000_000
  const reserve = 200_000_000 // TODO

  await deploy("GondolaToken", {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [BigNumber.from(total).mul(BigNumber.from(10).pow(18))],
  })

  // await execute("GondolaToken", { from: deployer, log: true }, "distribute", deployer, BigNumber.from(reserve).mul(BigNumber.from(10).pow(18)))
}
export default func
func.tags = []
