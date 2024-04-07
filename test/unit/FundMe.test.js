const { assert, expect } = require("chai")
const { network, deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", function () {
          let fundMe
          let mockV3Aggregator
          let deployer
          const sendValue = ethers.utils.parseEther("1")
          beforeEach(async () => {
              // const accounts = await ethers.getSigners()
              // deployer = accounts[0]
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              fundMe = await ethers.getContract("FundMe", deployer)
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )
          })

          describe("constructor", function () {
              it("sets the aggregator addresses correctly", async () => {
                  const response = await fundMe.getPriceFeed()
                  assert.equal(response, mockV3Aggregator.address)
              })
          })

          describe("fund", function () {
              // https://ethereum-waffle.readthedocs.io/en/latest/matchers.html
              // could also do assert.fail
              it("Fails if you don't send enough ETH", async () => {
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "You need to spend more ETH!"
                  )
              })
              // we could be even more precise here by making sure exactly $50 works
              // but this is good enough for now
              it("Updates the amount funded data structure", async () => {
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.getAddressToAmountFunded(
                      deployer
                  )
                  assert.equal(response.toString(), sendValue.toString())
              })
              it("Adds funder to array of funders", async () => {
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.getFunder(0)
                  assert.equal(response, deployer)
              })
          })
          describe("cheaperWithdraw", function () {
              beforeEach(async () => {
                  await fundMe.fund({ value: sendValue })
              })
              it("cheaperWithdraws ETH from a single funder", async () => {
                  // Arrange
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  // Act
                  const transactionResponse = await fundMe.cheaperWithdraw()
                  const transactionReceipt = await transactionResponse.wait()
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  //   const { gasUsed, effectiveGasPrice } = transactionReceipt
                  //   const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  // Assert
                  // Maybe clean up to understand the testing
                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )
              })
              // this test is overloaded. Ideally we'd split it into multiple tests
              // but for simplicity we left it as one
              it("is allows us to cheaperWithdraw with multiple funders", async function () {
                  // Arrange
                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < 6; i++) {
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      )
                      await fundMeConnectedContract.fund({ value: sendValue })
                  }
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)
                  // Act
                  const transactionResponse = await fundMe.cheaperWithdraw()
                  const transactionReceipt = await transactionResponse.wait()

                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const cheaperWithdrawGasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  // Assert
                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance
                          .add(cheaperWithdrawGasCost)
                          .toString()
                  )

                  await expect(fundMe.getFunder(0)).to.be.reverted //?

                  for (let i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })
              it("Only the deploy to cheaperWithdraw", async function () {
                  const accounts = await ethers.getSigners()
                  const funderConnectToContract = await fundMe.connect(
                      accounts[1]
                  )
                  await expect(
                      funderConnectToContract.cheaperWithdraw()
                  ).to.be.revertedWith("FundMe__NotOwner")
              })

              //   it("is allows us to cheaperWithdraw with multiple funders", async () => {
              //       // Arrange
              //       const accounts = await ethers.getSigners()
              //       for (i = 1; i < 6; i++) {
              //           const fundMeConnectedContract = await fundMe.connect(
              //               accounts[i]
              //           )
              //           await fundMeConnectedContract.fund({ value: sendValue })
              //       }
              //       const startingFundMeBalance =
              //           await fundMe.provider.getBalance(fundMe.address)
              //       const startingDeployerBalance =
              //           await fundMe.provider.getBalance(deployer)

              //       // Act
              //       const transactionResponse = await fundMe.cheapercheaperWithdraw()
              //       // Let's comapre gas costs :)
              //       // const transactionResponse = await fundMe.cheaperWithdraw()
              //       const transactionReceipt = await transactionResponse.wait()
              //       const { gasUsed, effectiveGasPrice } = transactionReceipt
              //       const cheaperWithdrawGasCost = gasUsed.mul(effectiveGasPrice)
              //       console.log(`GasCost: ${cheaperWithdrawGasCost}`)
              //       console.log(`GasUsed: ${gasUsed}`)
              //       console.log(`GasPrice: ${effectiveGasPrice}`)
              //       const endingFundMeBalance = await fundMe.provider.getBalance(
              //           fundMe.address
              //       )
              //       const endingDeployerBalance =
              //           await fundMe.provider.getBalance(deployer)
              //       // Assert
              //       assert.equal(
              //           startingFundMeBalance
              //               .add(startingDeployerBalance)
              //               .toString(),
              //           endingDeployerBalance.add(cheaperWithdrawGasCost).toString()
              //       )
              //       // Make a getter for storage variables
              //       aw ndMe.getFunder(0)).to.be.reverted

              //       for (i = 1; i < 6; i++) {
              //           assert.equal(
              //               await fundMe.getAddressToAmountFunded(
              //                   accounts[i].address
              //               ),
              //               0
              //           )
              //       }
              //   })
              //   it("Only allows the owner to cheaperWithdraw", async function () {
              //       const accounts = await ethers.getSigners()
              //       const fundMeConnectedContract = await fundMe.connect(
              //           accounts[1]
              //       )
              //       await expect(
              //           fundMeConnectedContract.cheaperWithdraw()
              //       ).to.be.revertedWith("FundMe__NotOwner")
              //   })
          })
      })
