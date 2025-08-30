const { expect } = require("chai");
const {
  networkConfig,
  developmentChains,
} = require("../helper-hardhat-config");
const { network, ethers } = require("hardhat");
require("dotenv").config();

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle", function () {
      let raffle, raffleEntranceFee, deployer;
      beforeEach(async function () {
        const raffleAddress = process.env.RaffleContractAddress;
        const accounts = await ethers.getSigners();
        deployer = accounts[0];
        raffle = await ethers.getContractAt("Raffle", raffleAddress, deployer);
        raffleEntranceFee = await raffle.getEntranceFee();
      });
      describe("fulfillRandomWords", function () {
        it("works with live chainlink keepers and chainlink vrf, we get a random word", async function () {
          console.log("setting up test...");
          const startingTimeStamp = await raffle.getLastTimeStamp();
          console.log("setting up listener...");
          await new Promise(async (resolve, reject) => {
            setTimeout(resolve, 5000);
            raffle.on("WinnerPicked", async () => {
              console.log("WinnerPicked event fired!");
              try {
                const recentWinner = await raffle.getRecentWinner();
                const raffleState = await raffle.getRaffleState();
                const winnerEndingBalance = await ethers.provider.getBalance(
                  deployer.address
                );
                const endingTimeStamp = await raffle.getLastTimeStamp();
                await expect(raffle.getPlayer(0)).to.be.reverted;
                expect(raffleState.toString()).to.equal("0");
                expect(recentWinner.toString()).to.equal(deployer.address);
                expect(winnerEndingBalance.toString()).to.equal(
                  (winnerStartingBalance + raffleEntranceFee).toString()
                );
                expect(endingTimeStamp).to.be.greaterThan(startingTimeStamp);
              } catch (e) {
                reject(e);
              }
            });
            // Then entering the raffle
            const tx = await raffle.enterRaffle({ value: raffleEntranceFee });
            await tx.wait(1);
            console.log("Ok, time to wait...");
            const winnerStartingBalance = await ethers.provider.getBalance(
              deployer.address
            );
          });
        });
      });
    });
