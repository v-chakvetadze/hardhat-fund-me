import { assert, expect } from "chai";
import { BigNumber } from "ethers";
import { deployments, ethers, getNamedAccounts } from "hardhat";
import { FundMe, MockV3Aggregator } from "../../typechain-types";

describe("FundMe", () => {
    let fundMe: FundMe;
    let deployerAddress: string;
    let mockV3Aggregator: MockV3Aggregator;
    const sendValue = ethers.utils.parseEther("1");

    beforeEach(async () => {
        ({ deployer: deployerAddress } = await getNamedAccounts());
        await deployments.fixture(["all"]);
        fundMe = await ethers.getContract("FundMe", deployerAddress);
        mockV3Aggregator = await ethers.getContract(
            "MockV3Aggregator",
            deployerAddress
        );
    });

    describe("constructor", () => {
        it("sets the aggregator address correctly", async () => {
            const response = await fundMe.getPriceFeed();
            assert.equal(response, mockV3Aggregator.address);
        });
    });

    describe("fund", () => {
        it("Fails if you dont send enough ETH", async () => {
            await expect(fundMe.fund()).to.be.revertedWith(
                "You need to spend more ETH!"
            );
        });
        it("Updated the amount funded data structure", async () => {
            await fundMe.fund({ value: sendValue });
            const response = await fundMe.getAddressToAmountFunded(
                deployerAddress
            );
            assert.equal(response.toString(), sendValue.toString());
        });
        it("adds funder to array of funders", async () => {
            await fundMe.fund({ value: sendValue });
            const funder = await fundMe.getFunder(0);
            assert.equal(funder, deployerAddress);
        });
    });

    describe("withdraw", async () => {
        beforeEach(async () => {
            await fundMe.fund({ value: sendValue });
        });

        it("Withdraw ETH from a single founder", async () => {
            const startContractBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const startDeployerBalance = await fundMe.provider.getBalance(
                deployerAddress
            );

            const transactionResponse = await fundMe.withdraw();
            const transactionReceipt = await transactionResponse.wait(1);
            const { gasUsed, effectiveGasPrice } = transactionReceipt;
            const gasCost = gasUsed.mul(effectiveGasPrice);

            const endContractBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const endDeployerBalance = await fundMe.provider.getBalance(
                deployerAddress
            );

            assert.equal(endContractBalance.toString(), "0");
            assert.equal(
                startContractBalance.add(startDeployerBalance).toString(),
                endDeployerBalance.add(gasCost).toString()
            );
        });

        it("Allows us to withdraw with multiple funders", async () => {
            const accounts = await ethers.getSigners();
            for (const acc of accounts) {
                const connectedContract = await fundMe.connect(acc);
                await connectedContract.fund({ value: sendValue });
            }

            const startContractBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const startDeployerBalance = await fundMe.provider.getBalance(
                deployerAddress
            );

            const transactionResponse = await fundMe.withdraw();
            const transactionReceipt = await transactionResponse.wait(1);

            const { gasUsed, effectiveGasPrice } = transactionReceipt;
            const gasCost = gasUsed.mul(effectiveGasPrice);

            const endContractBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const endDeployerBalance = await fundMe.provider.getBalance(
                deployerAddress
            );

            assert.equal(endContractBalance.toString(), "0");
            assert.equal(
                startContractBalance.add(startDeployerBalance).toString(),
                endDeployerBalance.add(gasCost).toString()
            );

            await expect(fundMe.getFunder(0)).to.be.reverted;

            for (const acc of accounts) {
                const currentAddressFunded = await fundMe.getAddressToAmountFunded(
                    acc.address
                );
                assert.equal(currentAddressFunded.toString(), "0");
            }
        });

        it("Only allows the owner to withdraw", async () => {
            const accounts = await ethers.getSigners();
            const attacker = accounts[1];
            const attackerConnectedContract = await fundMe.connect(attacker);
            await expect(
                attackerConnectedContract.withdraw()
            ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner");
        });
    });
});
