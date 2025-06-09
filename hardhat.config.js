// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

module.exports = {
  solidity: "0.8.28",
  networks: {
    // holesky: {
    //   url: `https://ethereum-holesky.publicnode.com`,
    //   accounts: [process.env.PRIVATE_KEY],
    //   chainId: 17000
    // },
    optimism: {
      url: `https://sepolia.optimism.io`,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155420,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
    customChains: [
      {
        network: "optimism",
        chainId: 11155420,
        urls: {
          apiURL: "https://api-sepolia-optimistic.etherscan.io/api",
          browserURL: "https://sepolia-optimism.etherscan.io/",
        },
      },
    ],
  },
  // etherscan: {
  //   apiKey: {
  //     holesky: `${process.env.ETHERSCAN_API_KEY}`,
  //   },
  // },
};
