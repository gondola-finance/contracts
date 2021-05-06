import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { BigNumber } from "ethers"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy, get, execute } = deployments
  const { deployer } = await getNamedAccounts()
  const BASE = 500

  // let GondolaToken = (await get("GondolaToken")).address
  // let GondolaETHPoolLPToken = (await get("GondolaETHPoolLPToken")).address
  // let GondolaUSDTPoolLPToken = (await get("GondolaUSDTPoolLPToken")).address
  // let GondolaDAIPoolLPToken = (await get("GondolaDAIPoolLPToken")).address
  let AvaxGdl = "0xc5ab0c94bc88b98f55f4e21c1474f67ab2329cfd"
  // let ZeroGDL = "0x158ede7f02475aa067fa35f4ff26c6cd86129429"

  // await execute("GondolaETHPool", { from: deployer, log: true }, "pause")
  // await execute("GondolaUSDTPool", { from: deployer, log: true }, "pause")
  // await execute("GondolaDAIPool", { from: deployer, log: true }, "pause")

  // const now = 1619791200
  // const BASE = 500

  // await execute("MasterChef",{ from: deployer, log: true }, "setRewards", now, now + 3600 * 24 * 31 * 2, BigNumber.from("18667861400000000000"))

  // await execute("MasterChef", { from: deployer, log: true }, "set", 3, 0, false)
  // await execute("MasterChef", { from: deployer, log: true }, "set", 4, 0, false)
  // await execute("MasterChef", { from: deployer, log: true }, "set", 5, 0, false)

  // • 20% for Gondola GDL staking
  // • 20% for Gondola zETH-ETH pool
  // • 10% for Gondola zUSDT-USDT pool
  // • 10% for Gondola zDAI-DAI pool
  // • 20% for Pangolin AVAX-GDL LPs
  // • 20% for Zero ZERO-GDL LPs

  // await execute("MasterChef", { from: deployer, log: true }, "add", BASE * 20, GondolaETHPoolLPToken, false)
  // await execute("MasterChef", { from: deployer, log: true }, "add", BASE * 10, GondolaUSDTPoolLPToken, false)
  // await execute("MasterChef", { from: deployer, log: true }, "add", BASE * 20, AvaxGdl, false)

  // await execute(
  //   "MasterChef",
  //   { from: deployer, log: true },
  //   "set",
  //   0,
  //   0,
  //   false,
  // )

  // await execute(
  //   "MasterChef",
  //   { from: deployer, log: true },
  //   "add",
  //   500,
  //   gondolaUSDPoolLPToken,
  //   false,
  // )

  // await execute(
  //   "MasterChef",
  //   { from: deployer, log: true },
  //   "add",
  //   500,
  //   GondolaToken,
  //   false,
  // )
}

export default func
func.tags = ["MasterChef"]
func.dependencies = ["GondolaToken"]
