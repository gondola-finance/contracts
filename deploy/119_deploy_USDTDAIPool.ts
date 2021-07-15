import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { CHAIN_ID } from "../utils/network"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { execute, get, getOrNull, log, read, save } = deployments
  const { deployer } = await getNamedAccounts()

 

  // Manually check if the pool is already deployed
  let gondolaUSDTDAIPool = await getOrNull("GondolaUSDTDAIPool")
  if (gondolaUSDTDAIPool) {
    log(`reusing "GondolaUSDDAITPool" at ${gondolaUSDTDAIPool.address}`)
  } else {
    // Constructor arguments
    const TOKEN_ADDRESSES = [
      (await get("USDT")).address,
      (await get("DAI")).address,
    ]
    const TOKEN_DECIMALS = [6, 18]
    const LP_TOKEN_NAME = "Gondola USDT/DAI"
    const LP_TOKEN_SYMBOL = "gondolaUSDTDAI"
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
    const usdtdaiSwapAddress = newPoolEvent["args"]["swapAddress"]
    log(
      `deployed USDT DAI pool clone (targeting "SwapFlashLoan") at ${usdtdaiSwapAddress}`,
    )
    await save("GondolaUSDTDAIPool", {
      abi: (await get("SwapFlashLoan")).abi,
      address: usdtdaiSwapAddress,
    })

    const lpTokenAddress = (await read("GondolaUSDTDAIPool", "swapStorage")).lpToken
    log(`USDT DAI pool LP Token at ${lpTokenAddress}`)
  
    await save("GondolaUSDTDAIPoolLPToken", {
      abi: (await get("USDT")).abi, // Generic ERC20 ABI
      address: lpTokenAddress,
    })
  }
}
export default func
func.tags = ["USDTDAIPool"]
func.dependencies = [
  "SwapUtils",
  "SwapDeployer",
  "SwapFlashLoan",
  "DAIPoolTokens"
]
