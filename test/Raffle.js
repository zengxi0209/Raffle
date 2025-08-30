const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const {
  networkConfig,
  developmentChains,
} = require("../helper-hardhat-config");
const { network, ethers } = require("hardhat");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle", function () {
      // let raffle,
      //   raffleContract,
      //   vrfCoordinatorV2_5Mock,
      //   raffleEntranceFee,
      //   interval,
      //   player; // , deployer

      // beforeEach(async () => {
      //   const accounts = await ethers.getSigners();
      //   player = accounts[1]; // Player account
      //   const vrfCoordinatorV2_5MockAddress =
      //     "0x5FbDB2315678afecb367f032d93F642f64180aa3";
      //   vrfCoordinatorV2_5Mock = await ethers.getContractAt(
      //     "VRFCoordinatorV2_5Mock",
      //     vrfCoordinatorV2_5MockAddress
      //   ); // Returns a new connection to the VRFCoordinatorV2Mock contract
      //   const raffleAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
      //   raffleContract = await ethers.getContractAt("Raffle", raffleAddress);
      //   raffle = raffleContract.connect(player); // Returns a new instance of the Raffle contract connected to player
      //   raffleEntranceFee = await raffle.getEntranceFee();
      //   interval = await raffle.getInterval();
      // });
      async function deployRaffleFixture() {
        // Contracts are deployed using the first signer/account by default
        const accounts = await ethers.getSigners();
        const player = accounts[1]; // Player account
        const chainId = hre.network.config.chainId;
        const BASE_FEE = ethers.parseEther("0.001"); //基础费
        const GAS_PRICE = 1e9; //gas单价
        const WEI_PER_UNIT_LINK = 4e15; //link-eth汇率
        const VRFCoordinatorV2_5Mock = await hre.ethers.getContractFactory(
          "VRFCoordinatorV2_5Mock"
        );
        const vrfCoordinatorV2_5Mock = await VRFCoordinatorV2_5Mock.deploy(
          BASE_FEE,
          GAS_PRICE,
          WEI_PER_UNIT_LINK
        );
        const vrfCoordinatorV2 = vrfCoordinatorV2_5Mock.target;
        const transactionResponse =
          await vrfCoordinatorV2_5Mock.createSubscription();
        const transactionReceipt = await transactionResponse.wait();
        const event = transactionReceipt.logs
          .map((log) => {
            try {
              return vrfCoordinatorV2_5Mock.interface.parseLog(log);
            } catch (e) {
              return null; // 忽略无法解析的日志
            }
          })
          .find((e) => e?.name === "SubscriptionCreated"); // 根据事件名过滤
        if (!event) {
          throw new Error("SubscriptionCreated event not found");
        }
        let subscriptionId = event.args.subId; // 获取 subId
        const FUND_AMOUNT = ethers.parseEther("50");
        await vrfCoordinatorV2_5Mock.fundSubscription(
          subscriptionId,
          FUND_AMOUNT
        );
        const arguments = [
          subscriptionId,
          networkConfig[chainId]["interval"],
          networkConfig[chainId]["gasLane"],
          networkConfig[chainId]["entranceFee"],
          networkConfig[chainId]["callbackGasLimit"],
          vrfCoordinatorV2,
        ];
        const Raffle = await hre.ethers.getContractFactory("Raffle");
        const raffleContract = await Raffle.deploy(...arguments);
        await vrfCoordinatorV2_5Mock.addConsumer(
          subscriptionId,
          raffleContract.target
        );
        const raffle = raffleContract.connect(player); // Returns a new instance of the Raffle contract connected to player
        raffleEntranceFee = await raffle.getEntranceFee();
        interval = await raffle.getInterval();

        return {
          player,
          vrfCoordinatorV2_5Mock,
          raffle,
          raffleEntranceFee,
          interval,
          raffleContract,
          accounts,
        };
      }
      describe("constructor", function () {
        it("initializes the raffle correctly", async function () {
          const { interval, raffleEntranceFee, raffle } = await loadFixture(
            deployRaffleFixture
          );
          const raffleState = await raffle.getRaffleState();
          const RequestConfirmations = await raffle.getRequestConfirmations();
          expect(raffleEntranceFee).to.equal(
            networkConfig[network.config.chainId]["entranceFee"]
          );
          expect(interval).to.equal(
            networkConfig[network.config.chainId]["interval"]
          );
          expect(raffleState.toString()).to.equal("0");
          expect(RequestConfirmations).to.equal(3);
        });
      });

      describe("enterRaffle", function () {
        it("revert when you don't pay enough", async function () {
          const { raffle } = await loadFixture(deployRaffleFixture);
          await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
            raffle,
            "Raffle__SendMoreToEnterRaffle"
          );
        });
        it("records player when they enter", async function () {
          const { player, raffle, raffleEntranceFee } = await loadFixture(
            deployRaffleFixture
          );
          await raffle.enterRaffle({ value: raffleEntranceFee });
          const contractPlayer = await raffle.getPlayer(0);
          expect(contractPlayer).to.equal(player.address);
        });

        it("emit event on enter", async function () {
          const { player, raffle, raffleEntranceFee } = await loadFixture(
            deployRaffleFixture
          );
          await expect(raffle.enterRaffle({ value: raffleEntranceFee }))
            .to.emit(raffle, "RaffleEntered")
            .withArgs(player.address);
        });

        it("revert if raffleState is not open", async function () {
          const { interval, raffleEntranceFee, raffle } = await loadFixture(
            deployRaffleFixture
          );
          await raffle.enterRaffle({ value: raffleEntranceFee });
          // await network.provider.send("evm_increaseTime", [
          //   Number(interval) + 1,
          // ]);
          // await network.provider.request({ method: "evm_mine", params: [] });
          await time.increase(Number(interval) + 1);
          await raffle.performUpkeep("0x");
          await expect(
            raffle.enterRaffle({ value: raffleEntranceFee })
          ).to.be.revertedWithCustomError(raffle, "Raffle__RaffleNotOpen");
        });
      });

      describe("checkUpkeep", function () {
        it("return false if time has not passed", async function () {
          const { interval, raffleEntranceFee, raffle } = await loadFixture(
            deployRaffleFixture
          );
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await time.increase(Number(interval) - 5); //-1会有边界问题
          const { upkeepNeeded } = await raffle.checkUpkeep("0x");
          expect(upkeepNeeded).to.be.false;
        });

        it("return false if raffleStates is not open", async function () {
          const { interval, raffleEntranceFee, raffle } = await loadFixture(
            deployRaffleFixture
          );
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await time.increase(Number(interval) + 1);
          await raffle.performUpkeep("0x");
          const raffleState = await raffle.getRaffleState();
          const { upkeepNeeded } = await raffle.checkUpkeep("0x");
          expect(raffleState.toString()).to.equal("1");
          expect(upkeepNeeded).to.be.false;
        });

        it("return false if not send enough eth", async function () {
          const { interval, raffleEntranceFee, raffle } = await loadFixture(
            deployRaffleFixture
          );
          await time.increase(Number(interval) + 1);
          const { upkeepNeeded } = await raffle.checkUpkeep("0x");
          expect(upkeepNeeded).to.be.false;
        });

        it("return false if no players", async function () {
          const { interval, raffleEntranceFee, raffle } = await loadFixture(
            deployRaffleFixture
          );
          await time.increase(Number(interval) + 1);
          const { upkeepNeeded } = await raffle.checkUpkeep("0x");
          expect(upkeepNeeded).to.be.false;
        });

        it("return true if time has passed and raffleState is open and enough eth and has players", async function () {
          const { interval, raffleEntranceFee, raffle } = await loadFixture(
            deployRaffleFixture
          );
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await time.increase(Number(interval) + 1);
          const { upkeepNeeded } = await raffle.checkUpkeep("0x");
          expect(upkeepNeeded).to.be.true;
        });
      });

      describe("performUpkeep", function () {
        it("can only run if checkupkeep is true", async function () {
          const { interval, raffleEntranceFee, raffle } = await loadFixture(
            deployRaffleFixture
          );
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await time.increase(Number(interval) + 1);
          const tx = await raffle.performUpkeep("0x");
          const receipt = await tx.wait();
          expect(receipt.status).to.equal(1);
        });

        it("updates the raffle state and emits a requestId", async function () {
          const { interval, raffleEntranceFee, raffle } = await loadFixture(
            deployRaffleFixture
          );
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await time.increase(Number(interval) + 1);
          const tx = await raffle.performUpkeep("0x");
          const receipt = await tx.wait();
          const raffleState = await raffle.getRaffleState();
          expect(raffleState.toString()).to.equal("1");
          // 解析事件
          const event = receipt.logs.find(
            (l) => l.fragment?.name === "RequestedRaffleWinner"
          );
          const requestId = event.args[0];
          expect(tx)
            .to.emit(raffle, "RequestedRaffleWinner")
            .withArgs(requestId);
        });

        it("revert if checkupkeep is false", async function () {
          const { interval, raffleEntranceFee, raffle } = await loadFixture(
            deployRaffleFixture
          );
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await time.increase(Number(interval) - 5);
          const balance = await ethers.provider.getBalance(raffle.target);
          const playersLength = await raffle.getNumberOfPlayers();
          const raffleState = await raffle.getRaffleState();
          await expect(raffle.performUpkeep("0x"))
            .to.be.revertedWithCustomError(raffle, "Raffle__UpkeepNotNeeded")
            .withArgs(balance, playersLength, raffleState.toString());
        });
      });

      describe("fulfillRandomness", function () {
        it("can only be called after performupkeep", async () => {
          const {
            interval,
            raffleEntranceFee,
            raffle,
            vrfCoordinatorV2_5Mock,
          } = await loadFixture(deployRaffleFixture);
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await time.increase(Number(interval) + 1);
          await expect(
            vrfCoordinatorV2_5Mock.fulfillRandomWords(0, raffle.target) // reverts if not fulfilled
          ).to.be.revertedWithCustomError(
            vrfCoordinatorV2_5Mock,
            "InvalidRequest"
          );
          await expect(
            vrfCoordinatorV2_5Mock.fulfillRandomWords(1, raffle.target) // reverts if not fulfilled
          ).to.be.revertedWithCustomError(
            vrfCoordinatorV2_5Mock,
            "InvalidRequest"
          );
        });

        it("picks a winner, resets, and sends money", async function () {
          const {
            interval,
            raffle,
            raffleEntranceFee,
            raffleContract,
            accounts,
            vrfCoordinatorV2_5Mock,
          } = await loadFixture(deployRaffleFixture);
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await time.increase(Number(interval) + 1);
          const additionalEntrances = 3; // to test
          const startingIndex = 2;
          let startingBalance;
          for (
            let i = startingIndex;
            i < startingIndex + additionalEntrances;
            i++
          ) {
            // i = 2; i < 5; i=i+1
            const playerRaffle = raffleContract.connect(accounts[i]); // Returns a new instance of the Raffle contract connected to player
            await playerRaffle.enterRaffle({ value: raffleEntranceFee });
          }
          const startingTimeStamp = await raffle.getLastTimeStamp();
          await new Promise(async (resolve, reject) => {
            // setTimeout(resolve, 5000)
            raffle.once("WinnerPicked", async () => {
              console.log("WinnerPicked event fired!");
              try {
                const recentWinner = await raffle.getRecentWinner();
                const raffleState = await raffle.getRaffleState();
                const winnerBalance = await ethers.provider.getBalance(
                  accounts[2].address
                );
                const endingTimeStamp = await raffle.getLastTimeStamp();
                await expect(raffle.getPlayer(0)).to.be.reverted;
                expect(recentWinner.toString()).to.equal(accounts[2].address);
                expect(raffleState.toString()).to.equal("0");
                expect(winnerBalance.toString()).to.equal(
                  (
                    startingBalance +
                    raffleEntranceFee * BigInt(additionalEntrances) +
                    raffleEntranceFee
                  ).toString()
                );
                expect(endingTimeStamp).to.be.greaterThan(startingTimeStamp);
                resolve();
              } catch (error) {
                reject(error);
              }
            });
            try {
              const tx = await raffle.performUpkeep("0x");
              const receipt = await tx.wait(1);
              //console.log("account 2 " + accounts[2])
              startingBalance = await ethers.provider.getBalance(
                accounts[2].address
              );
              const requestId = receipt.logs[1].args.requestId;
              // const event = receipt.logs.find(
              //   (l) => l.fragment?.name === "RequestedRaffleWinner"
              // );
              // const requestId = event.args[0];
              await vrfCoordinatorV2_5Mock.fulfillRandomWords(
                requestId,
                raffle.target
              );
            } catch (error) {
              reject(error);
            }
          });
        });
      });
    });
