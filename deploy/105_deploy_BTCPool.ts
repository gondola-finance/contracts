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
  let gondolaBTCPool = await getOrNull("GondolaBTCPool")
  if (gondolaBTCPool) {
    log(`reusing "GondolaBTCPool" at ${gondolaBTCPool.address}`)
  } else {
    // Constructor arguments
    const TOKEN_ADDRESSES = [
      (await get("WBTC")).address,
      (await get("ZBTC")).address,
    ]
    const TOKEN_DECIMALS = [8, 8]
    const LP_TOKEN_NAME = "Gondola WBTC/ZBTC"
    const LP_TOKEN_SYMBOL = "gondolaBTCPool"
    const INITIAL_A = 30
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
    const ethSwapAddress = newPoolEvent["args"]["swapAddress"]
    console.log(
      `deployed BTC pool clone (targeting "SwapFlashLoan") at ${ethSwapAddress}`,
    )
    await save("GondolaBTCPool", {
      abi: (await get("SwapFlashLoan")).abi,
      address: ethSwapAddress,
    })
  }

  const lpTokenAddress = (await read("GondolaBTCPool", "swapStorage")).lpToken
  log(`BTC pool LP Token at ${lpTokenAddress}`)

  await save("GondolaBTCPoolLPToken", {
    abi: (await get("USDT")).abi, // Generic ERC20 ABI
    address: lpTokenAddress,
  })
}
export default func
func.tags = ["BTCPool"]
func.dependencies = [
  "SwapUtils",
  "SwapDeployer",
  "SwapFlashLoan",
]
