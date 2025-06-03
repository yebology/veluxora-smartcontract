const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const VeluxoraModule = buildModule("VeluxoraModule", (m) => {
  const veluxora = m.contract("Veluxora");
  return { veluxora };
});

module.exports = VeluxoraModule;
