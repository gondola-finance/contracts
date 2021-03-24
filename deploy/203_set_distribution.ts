import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { BigNumber } from "ethers"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy, get, execute } = deployments
  const { deployer } = await getNamedAccounts()
  let gondolaUSDPoolLPToken = (await get("GondolaUSDPoolLPToken")).address

  const now = Math.ceil(new Date().getTime() / 1000)

  await execute("MasterChef", { from: deployer, log: true }, "setRewards", now + 100, now + 3600 * 24 * 30, BigNumber.from(10).pow(18))
  await execute("MasterChef", { from: deployer, log: true }, "add", 500, gondolaUSDPoolLPToken, false)
}

export default func
func.tags = ["MasterChef"]
func.dependencies = ["GondolaToken"]
