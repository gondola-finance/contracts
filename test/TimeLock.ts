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

describe("Timelock", async () => {
  let signers: Array<Signer>
  let owner: Signer
  let gondolaToken: Contract
  let timelock: Contract

  beforeEach(async () => {
    signers = await ethers.getSigners()
    owner = signers[0]

    const GondolaToken = await ethers.getContractFactory("GondolaToken")
    gondolaToken = await GondolaToken.deploy(
      BigNumber.from(1000000).mul(BigNumber.from(10).pow(18)),
    )

    const TimeLock = await ethers.getContractFactory("TimeLock")
    timelock = await TimeLock.deploy(gondolaToken.address)
  })

  it("can't unlock token before due date", async () => {
    const amount = BigNumber.from(100).mul(BigNumber.from(10).pow(18))
    await gondolaToken.distribute(await owner.getAddress(), amount)
    await gondolaToken.approve(timelock.address, amount)
    const time = await currentTime()
    await timelock.deposit(await owner.getAddress(), amount, time + 100)

    await expect(timelock.withdraw(0)).to.be.reverted
    await ethers.provider.send("evm_increaseTime", [100])
    await ethers.provider.send("evm_mine", [])
    await timelock.withdraw(0)
  })

  it("can't transfer lock funds with a lower unlock date", async () => {
    const amount = BigNumber.from(100).mul(BigNumber.from(10).pow(18))
    await gondolaToken.distribute(await owner.getAddress(), amount)
    await gondolaToken.approve(timelock.address, amount)
    const time = await currentTime()
    await timelock.deposit(await owner.getAddress(), amount, time + 100)
    await expect(
      timelock.transferLockedFunds(
        0,
        await owner.getAddress(),
        amount,
        time + 1,
      ),
    ).to.be.reverted
  })

  it("can transfer lock funds and withdraw after lock date", async () => {
    const amount = BigNumber.from(100).mul(BigNumber.from(10).pow(18))
    await gondolaToken.distribute(await owner.getAddress(), amount)
    await gondolaToken.approve(timelock.address, amount)
    const time = await currentTime()
    await timelock.deposit(await owner.getAddress(), amount, time + 100)
    await timelock.transferLockedFunds(
      0,
      await signers[1].getAddress(),
      amount,
      time + 100,
    )

    await ethers.provider.send("evm_increaseTime", [100])
    await ethers.provider.send("evm_mine", [])
    await timelock.withdraw(0)
    await timelock.connect(signers[1]).withdraw(1)
  })
})
