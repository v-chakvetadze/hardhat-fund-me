import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { deployments, network } from "hardhat";
import { developmentChains, networkConfig } from "../helper-hardhat-config";

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
    } = hre;

    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    validateNetworkId(chainId);

    let ethUsdPriceFeedAddress;
    if (developmentChains.includes(network.name)) {
        const ethUsdAggregator = await get("MockV3Aggregator");
        ethUsdPriceFeedAddress = ethUsdAggregator.address;
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeed;
    }

    const fundMe = await deploy("FundMe", {
        from: deployer,
        log: true,
        args: [ethUsdPriceFeedAddress],
    });
};

export default func;
func.tags = ["all", "fundme"];
