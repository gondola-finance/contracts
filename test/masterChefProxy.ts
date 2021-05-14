import { Contract, Signer } from "ethers"
import { ethers } from "hardhat"
import { solidity } from "ethereum-waffle"
import { BigNumber } from "ethers"
import chai, { assert } from "chai"
import { expect } from "chai"

const should = chai.should()

chai.use(solidity)

const currentTime = async () => {
  const block = await ethers.provider.getBlockNumber()
  const { timestamp } = await ethers.provider.getBlock(block)
  return timestamp
}

describe("MasterChefProxy", async () => {
  let signers: Array<Signer>
  let owner: Signer
  let gondolaToken: Contract
  let masterChef: Contract
  let masterChefProxy: Contract

  beforeEach(async () => {
    signers = await ethers.getSigners()
    owner = signers[0]

    const GondolaToken = await ethers.getContractFactory("GondolaToken")
    gondolaToken = await GondolaToken.deploy(
      BigNumber.from(1000000).mul(BigNumber.from(10).pow(18)),
    )

    const MasterChef = await ethers.getContractFactory("MasterChef")
    masterChef = await MasterChef.deploy(gondolaToken.address)

    const MasterChefProxy = await ethers.getContractFactory("MasterChefProxy")
    masterChefProxy = await MasterChefProxy.deploy(masterChef.address)

    await gondolaToken.transferOwnership(masterChef.address)
    await masterChef.transferOwnership(masterChefProxy.address)
  })

  it("can't call masterChef directly", async () => {
    const now = await currentTime()

    await expect(
      masterChef.setRewards(now + 100, now + 900, BigNumber.from(10).pow(18)),
    ).to.be.revertedWith("Ownable: caller is not the owner")

    await expect(
      masterChef.add(500, gondolaToken.address, false),
    ).to.be.revertedWith("Ownable: caller is not the owner")

    await expect(
      masterChef.setMigrator(gondolaToken.address),
    ).to.be.revertedWith("Ownable: caller is not the owner")

    await expect(masterChef.set(1, 100, false)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    )
  })

  it("can setRewards masterchef using the proxy", async () => {
    const now = await currentTime()

    expect(await masterChefProxy.masterChef()).to.eq(masterChef.address)

    await masterChefProxy.initSetRewards(
      now + 100,
      now + 900,
      BigNumber.from(10).pow(18),
    )

    await expect(masterChefProxy.executeSetRewards(0)).to.be.revertedWith(
      "Too early",
    )

    await ethers.provider.send("evm_increaseTime", [2 * 24 * 3600 + 1])
    await masterChefProxy.executeSetRewards(0)

    expect(await masterChef.gondolaPerSec()).to.eq(BigNumber.from(10).pow(18))
    expect(await masterChef.startAt()).to.eq(BigNumber.from(now + 100))
    expect(await masterChef.endAt()).to.eq(BigNumber.from(now + 900))

    await expect(masterChefProxy.executeSetRewards(0)).to.be.revertedWith(
      "already executed",
    )
  })

  it("can add masterchef using the proxy", async () => {
    await masterChefProxy.initAdd(500, gondolaToken.address, false)

    await expect(masterChefProxy.executeAdd(0)).to.be.revertedWith("Too early")

    await ethers.provider.send("evm_increaseTime", [2 * 24 * 3600 + 1])
    await masterChefProxy.executeAdd(0)
    const { lpToken, allocPoint } = await masterChef.poolInfo(0)
    expect(lpToken == gondolaToken.address)
    expect(allocPoint).to.eq(500)
    await expect(masterChefProxy.executeAdd(0)).to.be.revertedWith("already executed")

  })

  it("can set masterchef using the proxy", async () => {
    await masterChefProxy.initAdd(500, gondolaToken.address, false)
    await ethers.provider.send("evm_increaseTime", [2 * 24 * 3600 + 1])
    await masterChefProxy.executeAdd(0)

    await masterChefProxy.initSet(0, 100, false)

    await expect(masterChefProxy.executeSet(0)).to.be.revertedWith("Too early")

    await ethers.provider.send("evm_increaseTime", [2 * 24 * 3600 + 1])
    await masterChefProxy.executeSet(0)

    const { lpToken, allocPoint } = await masterChef.poolInfo(0)
    expect(allocPoint).to.eq(100)
    await expect(masterChefProxy.executeSet(0)).to.be.revertedWith("already executed")

  })

  it("let transfer after two weeks", async () => {
    expect(await masterChef.owner()).to.eq(masterChefProxy.address)
    const newOwner = await owner.getAddress()
    await masterChefProxy.initMasterChefTransfer(newOwner)
    await expect(masterChefProxy.executeTransfer()).to.be.revertedWith(
      "Too early",
    )

    await ethers.provider.send("evm_increaseTime", [14 * 24 * 3600])
    await masterChefProxy.executeTransfer()
    expect(await masterChef.owner()).to.eq(newOwner)
  })
})
