import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { BigNumber } from "ethers"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy, get, execute } = deployments
  const { deployer } = await getNamedAccounts()
  let gondolaUSDPoolLPToken = (await get("GondolaUSDPoolLPToken")).address

  const now = Math.ceil(new Date().getTime() / 1000)

  await execute(
    "MasterChef",
    { from: deployer, log: true },
    "setRewards",
    now + 1,
    now + 3600 * 24 * 31 * 2,
    BigNumber.from("18667861400000000000"),
  )

  await execute(
    "MasterChef",
    { from: deployer, log: true },
    "add",
    500,
    gondolaUSDPoolLPToken,
    false,
  )
}

export default func
func.tags = ["MasterChef"]
func.dependencies = ["GondolaToken"]
