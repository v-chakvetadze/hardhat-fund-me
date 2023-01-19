import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import {
    developmentChains,
    networkConfig,
    BLOCK_CONFIRMATIONS,
} from "../helper-hardhat-config";
import { verify } from "../utils/verify";

const validateNetworkId: (
    networkId: any
) => asserts networkId is keyof typeof networkConfig = (networkId) => {
    const isHardhatNetwork = networkId === 31337;
    const isKnownNetwork = !!networkId && networkId in networkConfig;

    const isValidNetwork = isHardhatNetwork || isKnownNetwork;
    if (!isValidNetwork) throw new Error(`Invalid chain id: ${networkId}`);
};

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {
        deployments: { deploy, log, get },
        getNamedAccounts,
        network,
    } = hre;

    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    const isDevChain = developmentChains.includes(network.name);

    validateNetworkId(chainId);

    let ethUsdPriceFeedAddress;
    if (isDevChain) {
        const ethUsdAggregator = await get("MockV3Aggregator");
        ethUsdPriceFeedAddress = ethUsdAggregator.address;
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeed;
    }

    const args = [ethUsdPriceFeedAddress];
    const fundMe = await deploy("FundMe", {
        from: deployer,
        log: true,
        args,
        waitConfirmations: !isDevChain ? BLOCK_CONFIRMATIONS : 1,
    });

    if (!isDevChain && process.env.ETHERSCAN_API_KEY) {
        await verify(fundMe.address, args);
    }
};

export default func;
func.tags = ["all", "fundme"];
