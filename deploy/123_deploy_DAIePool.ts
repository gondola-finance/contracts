import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { CHAIN_ID } from "../utils/network"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { execute, get, getOrNull, log, read, save } = deployments
  const { deployer } = await getNamedAccounts()

  // Manually check if the pool is already deployed
  let gondolaDAIePool = await getOrNull("GondolaDAIePool")
  if (gondolaDAIePool) {
    log(`reusing "GondolaDAIePool" at ${gondolaDAIePool.address}`)
  } else {
    // Constructor arguments
    const TOKEN_ADDRESSES = [
      (await get("DAI")).address,
      (await get("DAIE")).address,
    ]
    const TOKEN_DECIMALS = [18, 18]
    const LP_TOKEN_NAME = "Gondola DAI/DAIe"
    const LP_TOKEN_SYMBOL = "gondolaDAIe"
    const INITIAL_A = 100
    const SWAP_FEE = 2e6
    const ADMIN_FEE = 2e6
    const WITHDRAW_FEE = 0

    const receipt = await execute(
      "SwapDeployer",
      { from: deployer, log: true },
      "deploy",
      (
        await get("SwapFlashLoan")
      ).address,
      TOKEN_ADDRESSES,
      TOKEN_DECIMALS,
      LP_TOKEN_NAME,
      LP_TOKEN_SYMBOL,
      INITIAL_A,
      SWAP_FEE,
      ADMIN_FEE,
      WITHDRAW_FEE,
      (
        await get("LPToken")
      ).address,
    )

    const newPoolEvent = receipt?.events?.find(
      (e: any) => e["event"] == "NewSwapPool",
    )
    const daieSwapAddress = newPoolEvent["args"]["swapAddress"]
    log(
      `deployed DAIe pool clone (targeting "SwapFlashLoan") at ${daieSwapAddress}`,
    )
    await save("GondolaDAIePool", {
      abi: (await get("SwapFlashLoan")).abi,
      address: daieSwapAddress,
    })
    const lpTokenAddress = (await read("GondolaDAIePool", "swapStorage")).lpToken
    log(`DAIe pool LP Token at ${lpTokenAddress}`)
  
    await save("GondolaDAIePoolLPToken", {
      abi: (await get("DAI")).abi, // Generic ERC20 ABI
      address: lpTokenAddress,
    })
  }
}
export default func
func.tags = ["DAIePool"]
func.dependencies = [
  "SwapUtils",
  "SwapDeployer",
  "SwapFlashLoan",
  "DAIePoolTokens",
]
