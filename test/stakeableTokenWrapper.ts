import { ethers } from "@nomiclabs/buidler"
import { Wallet, Signer } from "ethers"
import chai from "chai"
import { deployContract, solidity } from "ethereum-waffle"

import StakeableTokenWrapperArtifact from "../build/artifacts/StakeableTokenWrapper.json"
import { StakeableTokenWrapper } from "../build/typechain/StakeableTokenWrapper"

import LPTokenArtifact from "../build/artifacts/LPToken.json"
import { LpToken } from "../build/typechain/LpToken"
import { Ierc20 as IERC20 } from "../build/typechain/Ierc20"

chai.use(solidity)
const { expect } = chai

describe("StakeableTokenWrapper", () => {
  let signers: Array<Signer>

  let basicToken: LpToken
  let tokenWrapper: StakeableTokenWrapper

  async function deployWrapper(token: IERC20): Promise<StakeableTokenWrapper> {
    const contract = (await deployContract(
      signers[0] as Wallet,
      StakeableTokenWrapperArtifact,
      [token.address],
    )) as StakeableTokenWrapper
    return contract
  }

  async function approveAndStake(
    wallet: Wallet,
    amount: number,
  ): Promise<Array<StakeableTokenWrapper | LpToken>> {
    const wrapperAsStaker = tokenWrapper.connect(wallet)
    const tokenAsStaker = basicToken.connect(wallet)

    await tokenAsStaker.approve(wrapperAsStaker.address, amount)
    await wrapperAsStaker.stake(amount)

    return [wrapperAsStaker, tokenAsStaker]
  }

  beforeEach(async () => {
    signers = await ethers.getSigners()
    basicToken = (await deployContract(signers[0] as Wallet, LPTokenArtifact, [
      "Basic Token",
      "BASIC",
    ])) as LpToken

    await basicToken.mint(await signers[0].getAddress(), 10 ** 10)

    await basicToken.transfer(await signers[1].getAddress(), 1000)
    await basicToken.transfer(await signers[2].getAddress(), 10000)

    tokenWrapper = (await deployWrapper(basicToken)) as StakeableTokenWrapper
  })

  it("Emits an event on staking", async () => {
    const wrapperAsStaker1 = tokenWrapper.connect(signers[1] as Wallet)
    const tokenAsStaker1 = basicToken.connect(signers[1] as Wallet)

    await tokenAsStaker1.approve(wrapperAsStaker1.address, 1000)
    await expect(wrapperAsStaker1.stake(1000)).to.emit(tokenWrapper, "Staked")
  })

  it("Emits an event on withdrawing", async () => {
    const [wrapperContract] = await approveAndStake(signers[1] as Wallet, 1000)

    await expect(wrapperContract.withdraw(1000)).to.emit(
      tokenWrapper,
      "Withdrawn",
    )
  })

  it("Only allows staked funds to be withdrawn", async () => {
    const [wrapperContract] = await approveAndStake(signers[1] as Wallet, 1000)

    await expect(wrapperContract.withdraw(1001)).to.be.reverted
  })

  it("Returns correct staked balances", async () => {
    await approveAndStake(signers[1] as Wallet, 1000)
    await approveAndStake(signers[2] as Wallet, 10000)

    const balance1 = await tokenWrapper.balanceOf(await signers[1].getAddress())
    const balance2 = await tokenWrapper.balanceOf(await signers[2].getAddress())

    expect(balance1).to.eq(1000)
    expect(balance2).to.eq(10000)
  })

  it("Returns correct total supply", async () => {
    await approveAndStake(signers[1] as Wallet, 1000)
    expect(await tokenWrapper.totalSupply()).to.eq(1000)
  })
})