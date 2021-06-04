import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { execute, get, getOrNull, log, read, save } = deployments
  const { deployer } = await getNamedAccounts()

  // Manually check if the pool is already deployed
  let gondolaRenBTCPool = await getOrNull("GondolaRenBTCPool")
  if (gondolaRenBTCPool) {
    log(`reusing "GondolaRenBTCPool" at ${gondolaRenBTCPool.address}`)
  } else {
    // Constructor arguments
    const TOKEN_ADDRESSES = [
      (await get("WBTC")).address,
      (await get("RENBTC")).address,
    ]
    const TOKEN_DECIMALS = [8, 8]
    const LP_TOKEN_NAME = "Gondola RenBTC/WBTC"
    const LP_TOKEN_SYMBOL = "gondolaRenBtc"
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
    const btcSwapAddress = newPoolEvent["args"]["swapAddress"]
    log(
      `deployed BTC pool clone (targeting "SwapFlashLoan") at ${btcSwapAddress}`,
    )
    await save("GondolaRenBTCPool", {
      abi: (await get("SwapFlashLoan")).abi,
      address: btcSwapAddress,
    })
  }

  const lpTokenAddress = (await read("GondolaRenBTCPool", "swapStorage")).lpToken
  log(`BTC pool LP Token at ${lpTokenAddress}`)

  await save("GondolaRenBTCPoolLPToken", {
    abi: (await get("BTC")).abi, // Generic ERC20 ABI
    address: lpTokenAddress,
  })
}
export default func
func.tags = ["BTCPool"]
func.dependencies = [
  "SwapUtils",
  "SwapDeployer",
  "SwapFlashLoan",
  "BTCPoolTokens",
]
