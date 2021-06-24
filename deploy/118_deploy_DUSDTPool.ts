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
  let gondolaDUSDTPool = await getOrNull("GondolaDUSDTPool")
  if (gondolaDUSDTPool) {
    log(`reusing "GondolaDUSDTPool" at ${gondolaDUSDTPool.address}`)
  } else {
    // Constructor arguments
    const TOKEN_ADDRESSES = [
      (await get("USDT")).address,
      (await get("DUSDT")).address,
    ]
    const TOKEN_DECIMALS = [6, 6]
    const LP_TOKEN_NAME = "Gondola USDT/DUSDT"
    const LP_TOKEN_SYMBOL = "gondolaDUSDT"
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
    const dusdtSwapAddress = newPoolEvent["args"]["swapAddress"]
    log(
      `deployed DUSDT pool clone (targeting "SwapFlashLoan") at ${dusdtSwapAddress}`,
    )
    await save("GondolaDUSDTPool", {
      abi: (await get("SwapFlashLoan")).abi,
      address: dusdtSwapAddress,
    })

    const lpTokenAddress = (await read("GondolaDUSDTPool", "swapStorage")).lpToken
    log(`DUSDT pool LP Token at ${lpTokenAddress}`)
  
    await save("GondolaDUSDTPoolLPToken", {
      abi: (await get("DUSDT")).abi, // Generic ERC20 ABI
      address: lpTokenAddress,
    })
  }
}
export default func
func.tags = ["DUSDPool"]
func.dependencies = [
  "SwapUtils",
  "SwapDeployer",
  "SwapFlashLoan",
  "DUSDTPoolTokens",
]
