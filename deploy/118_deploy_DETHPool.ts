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
  let gondolaDWETHPool = await getOrNull("GondolaDWETHPool")
  if (gondolaDWETHPool) {
    log(`reusing "GondolaDWETHPool" at ${gondolaDWETHPool.address}`)
  } else {
    // Constructor arguments
    const TOKEN_ADDRESSES = [
      (await get("ETH")).address,
      (await get("DWETH")).address,
    ]
    const TOKEN_DECIMALS = [18, 18]
    const LP_TOKEN_NAME = "Gondola DWETH/ETH"
    const LP_TOKEN_SYMBOL = "gondolaDWETH"
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
    const dwethSwapAddress = newPoolEvent["args"]["swapAddress"]
    log(
      `deployed DWETH pool clone (targeting "SwapFlashLoan") at ${dwethSwapAddress}`,
    )
    await save("GondolaDWETHPool", {
      abi: (await get("SwapFlashLoan")).abi,
      address: dwethSwapAddress,
    })


  }
  const lpTokenAddress = (await read("GondolaDWETHPool", "swapStorage")).lpToken
  log(`DWETH pool LP Token at ${lpTokenAddress}`)

  await save("GondolaDWETHPoolLPToken", {
    abi: (await get("DWETH")).abi, // Generic ERC20 ABI
    address: lpTokenAddress,
  })
}
export default func
func.tags = ["DETHPool"]
func.dependencies = [
  "SwapUtils",
  "SwapDeployer",
  "SwapFlashLoan",
  "DWETHPoolTokens",
]
