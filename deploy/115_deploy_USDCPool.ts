import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { CHAIN_ID } from "../utils/network"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { execute, get, getOrNull, log, read, save } = deployments
  const { deployer } = await getNamedAccounts()

  // Manually check if the pool is already deployed
  let gondolaUSDCPool = await getOrNull("GondolaUSDCPool")
  if (gondolaUSDCPool) {
    log(`reusing "GondolaUSDCPool" at ${gondolaUSDCPool.address}`)
  } else {
    // Constructor arguments
    const TOKEN_ADDRESSES = [
      (await get("USDC")).address,
      (await get("ZUSDC")).address,
    ]
    const TOKEN_DECIMALS = [18, 6]
    const LP_TOKEN_NAME = "Gondola USDC/ZUSDC"
    const LP_TOKEN_SYMBOL = "gondolaUSDC"
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
    const usdcSwapAddress = newPoolEvent["args"]["swapAddress"]
    log(
      `deployed USDC pool clone (targeting "SwapFlashLoan") at ${usdcSwapAddress}`,
    )
    await save("GondolaUSDCPool", {
      abi: (await get("SwapFlashLoan")).abi,
      address: usdcSwapAddress,
    })
  }

  const lpTokenAddress = (await read("GondolaUSDCPool", "swapStorage")).lpToken
  log(`USDC pool LP Token at ${lpTokenAddress}`)

  await save("GondolaUSDCPoolLPToken", {
    abi: (await get("DAI")).abi, // Generic ERC20 ABI
    address: lpTokenAddress,
  })
}
export default func
func.tags = ["USDCPool"]
func.dependencies = [
  "SwapUtils",
  "SwapDeployer",
  "SwapFlashLoan",
  "USDCPoolTokens",
]
