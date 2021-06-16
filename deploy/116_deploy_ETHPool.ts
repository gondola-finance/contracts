import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { CHAIN_ID } from "../utils/network"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { execute, get, getOrNull, log, read, save } = deployments
  const { deployer } = await getNamedAccounts()

  // Manually check if the pool is already deployed
  let gondolaETHPool = await getOrNull("GondolaETHPool")
  if (gondolaETHPool) {
    log(`reusing "GondolaETHPool" at ${gondolaETHPool.address}`)
  } else {
    // Constructor arguments
    const TOKEN_ADDRESSES = [
      (await get("ETH")).address,
      (await get("ZETH")).address,
    ]
    const TOKEN_DECIMALS = [18, 18]
    const LP_TOKEN_NAME = "Gondola ETH/ZETH"
    const LP_TOKEN_SYMBOL = "gondolaETH"
    const INITIAL_A = 50
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
    const ethSwapAddress = newPoolEvent["args"]["swapAddress"]
    log(
      `deployed ETH pool clone (targeting "SwapFlashLoan") at ${ethSwapAddress}`,
    )
    await save("GondolaETHPool", {
      abi: (await get("SwapFlashLoan")).abi,
      address: ethSwapAddress,
    })
  }

  const lpTokenAddress = (await read("GondolaETHPool", "swapStorage")).lpToken
  log(`ETH pool LP Token at ${lpTokenAddress}`)

  await save("GondolaETHPoolLPToken", {
    abi: (await get("DAI")).abi, // Generic ERC20 ABI
    address: lpTokenAddress,
  })
}
export default func
func.tags = ["ETHPool"]
func.dependencies = [
  "SwapUtils",
  "SwapDeployer",
  "SwapFlashLoan",
  "ETHPoolTokens",
]
