include .env

compile:
	npx hardhat compile

test:
	npx hardhat test

coverage:
	npx hardhat coverage

deploy:
	npx hardhat ignition deploy ignition/modules/Veluxora.js --network holesky

verify:
	npx hardhat verify --network holesky ${CONTRACT_ADDRESS}