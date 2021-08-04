import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { CHAIN_ID } from "../utils/network"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { execute, get, getOrNull, log, read, save } = deployments
  const { deployer } = await getNamedAccounts()

  if((await getChainId()) != CHAIN_ID.AVA_MAINNET) {
    return
  }

  // Manually check if the pool is already deployed
  let gondolaWBTCePool = await getOrNull("GondolaWBTCePool")
  if (gondolaWBTCePool) {
    log(`reusing "GondolaWBTCePool" at ${gondolaWBTCePool.address}`)
  } else {
    // Constructor arguments
    const TOKEN_ADDRESSES = [
      (await get("WBTC")).address,
      (await get("WBTCE")).address,
    ]
    const TOKEN_DECIMALS = [8, 8]
    const LP_TOKEN_NAME = "Gondola WBTC/WBTCe"
    const LP_TOKEN_SYMBOL = "gondolaWBTCe"
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
    const wbtceSwapAddress = newPoolEvent["args"]["swapAddress"]
    log(
      `deployed WBTCe pool clone (targeting "SwapFlashLoan") at ${wbtceSwapAddress}`,
    )
    await save("GondolaWBTCePool", {
      abi: (await get("SwapFlashLoan")).abi,
      address: wbtceSwapAddress,
    })

    const lpTokenAddress = (await read("GondolaWBTCePool", "swapStorage")).lpToken
    log(`WBTCe pool LP Token at ${lpTokenAddress}`)
  
    await save("GondolaWBTCePoolLPToken", {
      abi: (await get("DAI")).abi, // Generic ERC20 ABI
      address: lpTokenAddress,
    })
  }
}
export default func
func.tags = ["WBTCePool"]
func.dependencies = [
  "SwapUtils",
  "SwapDeployer",
  "SwapFlashLoan",
  "WBTCePoolTokens",
]
