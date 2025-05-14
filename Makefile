include .env

compile:
	npx hardhat compile

test:
	npx hardhat test

coverage:
	npx hardhat coverage

deploy:
	npx hardhat ignition deploy ignition/modules/Veluxora.js --network ${BLOCKCHAIN_NETWORK} --verify