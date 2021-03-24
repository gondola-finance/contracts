import { Contract, Signer } from "ethers"

import { ethers } from "hardhat"
import { BigNumber } from "ethers"
import chai = require("chai")
import { assert } from "chai"

const should = chai.should()

chai.use(require("chai-bignumber")())

describe("GondolaToken", async () => {
    let signers: Array<Signer>
    let owner: Signer

    it("distribute token", async () => {
        signers = await ethers.getSigners()
        owner = signers[0]

        const GondolaToken = await ethers.getContractFactory("GondolaToken");
        const gondolaToken = await GondolaToken.deploy(BigNumber.from(10000).mul(BigNumber.from(10).pow(18)));

        gondolaToken.distribute(await owner.getAddress(), BigNumber.from(100).mul(BigNumber.from(10).pow(18)))
        const balance = await gondolaToken.balanceOf(await owner.getAddress())

        assert(BigNumber.from(100).mul(BigNumber.from(10).pow(18)).eq(balance))
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

    const now = Math.ceil(new Date().getTime() / 1000)
    await masterChef.setRewards(
      now + 100,
      now + 900,
      BigNumber.from(10).pow(18),
    )
    await masterChef.add(500, gondolaToken.address, false)
    await masterChef.deposit(0, amount)
    let pending = await masterChef.pendingGondola(0, await owner.getAddress())
    assert(pending == 0)

    await ethers.provider.send("evm_increaseTime", [590])
    await ethers.provider.send("evm_mine", []) // advance by 10 sec

    pending = await masterChef.pendingGondola(0, await owner.getAddress())

    assert(pending == 500 * 10 ** 18)

    await ethers.provider.send("evm_increaseTime", [600])
    await ethers.provider.send("evm_mine", [])
    pending = await masterChef.pendingGondola(0, await owner.getAddress())
    assert(pending == 800 * 10 ** 18)
  })

  it("updatePool and withdraw tokens", async () => {
    const amount = BigNumber.from(100).mul(BigNumber.from(10).pow(18))
    await gondolaToken.distribute(await owner.getAddress(), amount)
    await gondolaToken.transferOwnership(masterChef.address)
    await gondolaToken.approve(masterChef.address, amount)

    const now = Math.ceil(new Date().getTime() / 1000)
    await masterChef.setRewards(
      now + 100,
      now + 900,
      BigNumber.from(10).pow(14),
    )
    await masterChef.add(500, gondolaToken.address, false)
    await masterChef.deposit(0, amount)

    console.log(
      "test:" + (await gondolaToken.balanceOf(await owner.getAddress())),
    )

    assert((await gondolaToken.balanceOf(await owner.getAddress())) == 0)

    const pending = await masterChef.pendingGondola(0, await owner.getAddress())
    assert(pending == 0)

    await ethers.provider.send("evm_increaseTime", [590])
    await ethers.provider.send("evm_mine", []) // advance by 10 sec

    await masterChef.updatePool(0)
    const beforeBalance = await gondolaToken.balanceOf(await owner.getAddress())
    console.log("beforeBalance: " + beforeBalance)

    await masterChef.withdraw(0, 0)
    const afterBalance = await gondolaToken.balanceOf(await owner.getAddress())

    afterBalance.should.be.bignumber.closeTo(
      BigNumber.from(500).mul(BigNumber.from(10).pow(14)),
      10 ** 15,
    )
  })
})
