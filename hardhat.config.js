// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

module.exports = {
  solidity: "0.8.28",
  networks: {
    holesky: {
      url: `https://ethereum-holesky.publicnode.com`,
      accounts: [process.env.PRIVATE_KEY],
      // chainId: 17000
    },
  },
  etherscan: {
    apiKey: {
      holesky: `${process.env.ETHERSCAN_API_KEY}`,
    },
  },
};
