import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { CHAIN_ID } from "../utils/network"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { execute, get, getOrNull, log, read, save } = deployments
  const { deployer } = await getNamedAccounts()

  // Manually check if the pool is already deployed
  let gondolaUSDTePool = await getOrNull("GondolaUSDTePool")
  if (gondolaUSDTePool) {
    log(`reusing "GondolaUSDTePool" at ${gondolaUSDTePool.address}`)
  } else {
    // Constructor arguments
    const TOKEN_ADDRESSES = [
      (await get("USDT")).address,
      (await get("USDTE")).address,
    ]
    const TOKEN_DECIMALS = [6, 6]
    const LP_TOKEN_NAME = "Gondola USDT/USDTe"
    const LP_TOKEN_SYMBOL = "gondolaUSDTe"
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
    const usdteSwapAddress = newPoolEvent["args"]["swapAddress"]
    log(
      `deployed USDTe pool clone (targeting "SwapFlashLoan") at ${usdteSwapAddress}`,
    )
    await save("GondolaUSDTePool", {
      abi: (await get("SwapFlashLoan")).abi,
      address: usdteSwapAddress,
    })
  }

  const lpTokenAddress = (await read("GondolaUSDTePool", "swapStorage")).lpToken
  log(`USDTe pool LP Token at ${lpTokenAddress}`)

  await save("GondolaUSDTePoolLPToken", {
    abi: (await get("DAI")).abi, // Generic ERC20 ABI
    address: lpTokenAddress,
  })
}
export default func
func.tags = ["USDTePool"]
func.dependencies = [
  "SwapUtils",
  "SwapDeployer",
  "SwapFlashLoan",
  "USDTePoolTokens",
]
