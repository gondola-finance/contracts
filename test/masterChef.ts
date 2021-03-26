import { Contract, Signer } from "ethers"
import { ethers } from "hardhat"
import { solidity } from "ethereum-waffle"
import { BigNumber } from "ethers"
import chai from "chai"
import { expect } from "chai"

const should = chai.should()

chai.use(solidity)

const currentTime = async () => {
  const block = await ethers.provider.getBlockNumber()
  const { timestamp } = await ethers.provider.getBlock(block)
  return timestamp
}

describe("GondolaToken", async () => {
  let signers: Array<Signer>
  let owner: Signer

  it("distribute token", async () => {
    await currentTime()
    signers = await ethers.getSigners()
    owner = signers[0]

    const GondolaToken = await ethers.getContractFactory("GondolaToken")
    const gondolaToken = await GondolaToken.deploy(
      BigNumber.from(10000).mul(BigNumber.from(10).pow(18)),
    )

    gondolaToken.distribute(
      await owner.getAddress(),
      BigNumber.from(100).mul(BigNumber.from(10).pow(18)),
    )
    const balance = await gondolaToken.balanceOf(await owner.getAddress())

    expect(BigNumber.from(100).mul(BigNumber.from(10).pow(18))).eq(balance)
  })
})

describe("MasterChef", async () => {
  let signers: Array<Signer>
  let owner: Signer
  let gondolaToken: Contract
  let masterChef: Contract

  beforeEach(async () => {
    signers = await ethers.getSigners()
    owner = signers[0]

    const GondolaToken = await ethers.getContractFactory("GondolaToken")
    gondolaToken = await GondolaToken.deploy(
      BigNumber.from(1000000).mul(BigNumber.from(10).pow(18)),
    )

    const MasterChef = await ethers.getContractFactory("MasterChef")
    masterChef = await MasterChef.deploy(gondolaToken.address)
  })

  it("get pending gondola tokens", async () => {
    const amount = BigNumber.from(100).mul(BigNumber.from(10).pow(18))
    await gondolaToken.distribute(await owner.getAddress(), amount)
    await gondolaToken.transferOwnership(masterChef.address)
    await gondolaToken.approve(masterChef.address, amount)

    const now = await currentTime()
    await masterChef.setRewards(
      now + 100,
      now + 900,
      BigNumber.from(10).pow(18),
    )
    await masterChef.add(500, gondolaToken.address, false)
    await masterChef.deposit(0, amount)
    let pending = await masterChef.pendingGondola(0, await owner.getAddress())
    expect(pending).to.eq(0)

    await ethers.provider.send("evm_increaseTime", [590])
    await ethers.provider.send("evm_mine", []) // advance by 10 sec

    pending = await masterChef.pendingGondola(0, await owner.getAddress())

    pending.should.closeTo(
      BigNumber.from(500).mul(BigNumber.from(10).pow(18)),
      BigNumber.from(10).pow(19),
    )

    await ethers.provider.send("evm_increaseTime", [600])
    await ethers.provider.send("evm_mine", [])
    pending = await masterChef.pendingGondola(0, await owner.getAddress())
    expect(pending).to.eq(BigNumber.from(800).mul(BigNumber.from(10).pow(18)))
  })

  it("updatePool and withdraw tokens", async () => {
    const amount = BigNumber.from(100).mul(BigNumber.from(10).pow(18))
    await gondolaToken.distribute(await owner.getAddress(), amount)
    await gondolaToken.transferOwnership(masterChef.address)
    await gondolaToken.approve(masterChef.address, amount)

    const now = await currentTime()
    await masterChef.setRewards(
      now + 100,
      now + 900,
      BigNumber.from(10).pow(18),
    )
    await masterChef.add(500, gondolaToken.address, false)
    await masterChef.deposit(0, amount)
    let pending = await masterChef.pendingGondola(0, await owner.getAddress())
    expect(pending == 0)

    await ethers.provider.send("evm_increaseTime", [590])
    await ethers.provider.send("evm_mine", []) // advance by 10 sec

    pending = await masterChef.pendingGondola(0, await owner.getAddress())

    pending.should.be.closeTo(
      BigNumber.from(500).mul(BigNumber.from(10).pow(18)),
      BigNumber.from(10).pow(19),
    )

    await masterChef.connect(owner).withdraw(0, 0)
    const afterBalance = await gondolaToken.balanceOf(await owner.getAddress())

    console.log("afterBalance: " + afterBalance)

    afterBalance.should.be.closeTo(
      BigNumber.from(500).mul(BigNumber.from(10).pow(18)),
      BigNumber.from(10).pow(19),
    )
  })
})
