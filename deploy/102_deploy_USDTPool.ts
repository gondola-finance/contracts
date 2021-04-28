import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { CHAIN_ID } from "../utils/network"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { execute, get, getOrNull, log, read, save } = deployments
  const { deployer } = await getNamedAccounts()

  const currentChain = await getChainId()

  if (currentChain != CHAIN_ID.AVA_MAINNET) {
    return
  }

  // Manually check if the pool is already deployed
  let gondolaUSDTPool = await getOrNull("GondolaUSDTPool")
  if (gondolaUSDTPool) {
    log(`reusing "GondolaUSDTPool" at ${gondolaUSDTPool.address}`)
  } else {
    // Constructor arguments
    const TOKEN_ADDRESSES = [
      (await get("USDT")).address,
      (await get("ZUSDT")).address,
    ]
    const TOKEN_DECIMALS = [6, 6]
    const LP_TOKEN_NAME = "Gondola USDT/ZUSDT"
    const LP_TOKEN_SYMBOL = "gondolaUSDTPool"
    const INITIAL_A = 200
    const SWAP_FEE = 4e6 // 4bps
    const ADMIN_FEE = 0
    const WITHDRAW_FEE = 0

    const receipt = await execute(
      "SwapDeployer",
      { from: deployer, log: true },
      "deploy",
      (await get("SwapFlashLoan")).address,
      TOKEN_ADDRESSES,
      TOKEN_DECIMALS,
      LP_TOKEN_NAME,
      LP_TOKEN_SYMBOL,
      INITIAL_A,
      SWAP_FEE,
      ADMIN_FEE,
      WITHDRAW_FEE,
    )

    const newPoolEvent = receipt?.events?.find(
      (e: any) => e["event"] == "NewSwapPool",
    )
    const usdtSwapAddress = newPoolEvent["args"]["swapAddress"]
    console.log(
      `deployed USDT pool clone (targeting "SwapFlashLoan") at ${usdtSwapAddress}`,
    )
    await save("GondolaUSDTPool", {
      abi: (await get("SwapFlashLoan")).abi,
      address: usdtSwapAddress,
    })
  }

  const lpTokenAddress = (await read("GondolaUSDTPool", "swapStorage")).lpToken
  log(`USDT pool LP Token at ${lpTokenAddress}`)

  await save("GondolaUSDTPoolLPToken", {
    abi: (await get("USDT")).abi, // Generic ERC20 ABI
    address: lpTokenAddress,
  })
}
export default func
func.tags = ["USDTPool"]
func.dependencies = [
  "SwapUtils",
  "SwapDeployer",
  "SwapFlashLoan",
  "USDTPoolTokens",
]
