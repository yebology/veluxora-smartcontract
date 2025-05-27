const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Veluxora Auction Smart Contract", function () {
  let Veluxora, veluxora, owner, user1, user2;
  const uri1 = "ipfs://car1-metadata";
  const uri2 = "ipfs://car2-metadata";

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();
    Veluxora = await ethers.getContractFactory("Veluxora");
    veluxora = await Veluxora.deploy();
  });

  //REGISTRATION TESTS

  it("should allow user registration", async () => {
    await expect(veluxora.connect(user1).registerUser())
      .to.emit(veluxora, "NewUserRegistered")
      .withArgs(user1.address, "User registered successfully");
    expect(await veluxora.registeredUsers(user1.address)).to.be.true;
  });

  it("should prevent duplicate registration", async () => {
    await veluxora.connect(user1).registerUser();
    await expect(
      veluxora.connect(user1).registerUser()
    ).to.be.revertedWith("Already registered.");
  });


  // AUCTION TESTS

  it("should allow auction creation after registration", async () => {
    const id = "auction1";
    const minBid = 1;
    const now = Math.floor(Date.now() / 1000);
    const startTime = now + 10;
    const endTime = now + 3600;
    const bpkbTokenId = 1;
    const stnkTokenId = 2;
    const bpkbUri = "ipfs://bpkb1";
    const stnkUri = "ipfs://stnk1";

    await veluxora.connect(user1).registerUser();

    await expect(
      veluxora.connect(user1).createAuction(
        id,
        minBid,
        startTime,
        endTime,
        bpkbTokenId,
        stnkTokenId,
        bpkbUri,
        stnkUri
      )
    ).to.emit(veluxora, "NewAuctionCreated")
      .withArgs(user1.address, id, "Auction successfully created.");

    const auction = await veluxora.getAuctionDetail(id);
    expect(auction.creator).to.equal(user1.address);
    expect(auction.minBid).to.equal(minBid);
    expect(auction.bpkbId).to.equal(bpkbTokenId);
    expect(auction.stnkId).to.equal(stnkTokenId);
  });

  it("should not allow auction creation by unregistered user", async () => {
    const id = "auction1";
    const minBid = 1;
    const now = Math.floor(Date.now() / 1000);
    const startTime = now + 10;
    const endTime = now + 3600;
    const bpkbTokenId = 1;
    const stnkTokenId = 2;
    const bpkbUri = "ipfs://bpkb1";
    const stnkUri = "ipfs://stnk1";

    // user2 is not registered
    await expect(
      veluxora.connect(user2).createAuction(
        id,
        minBid,
        startTime,
        endTime,
        bpkbTokenId,
        stnkTokenId,
        bpkbUri,
        stnkUri
      )
    ).to.be.revertedWith("You must be a registered user.");
  });

  it("should not allow auction creation with past start time", async () => {
    const id = "auction1";
    const minBid = 1;
    const now = Math.floor(Date.now() / 1000);
    const startTime = now - 200; // Past start time
    const endTime = now + 100;
    const bpkbTokenId = 1;
    const stnkTokenId = 2;
    const bpkbUri = "ipfs://bpkb1";
    const stnkUri = "ipfs://stnk1";

    await veluxora.connect(user1).registerUser();

    await expect(
      veluxora.connect(user1).createAuction(
        id,
        minBid,
        startTime,
        endTime,
        bpkbTokenId,
        stnkTokenId,
        bpkbUri,
        stnkUri
      )
    ).to.be.revertedWith("Start time must be in the future.");
  });

  it("should not allow auction creation with end time before start time", async () => {
    const id = "auction1";
    const minBid = 1;
    const now = Math.floor(Date.now() / 1000);
    const startTime = now + 200;
    const endTime = now + 100; //endtime first
    const bpkbTokenId = 1;
    const stnkTokenId = 2;
    const bpkbUri = "ipfs://bpkb1";
    const stnkUri = "ipfs://stnk1";

    await veluxora.connect(user1).registerUser();

    await expect(
      veluxora.connect(user1).createAuction(
        id,
        minBid,
        startTime,
        endTime,
        bpkbTokenId,
        stnkTokenId,
        bpkbUri,
        stnkUri
      )
    ).to.be.revertedWith("End time must be after start time.");
  });

  it("should support multiple auctions per user with different token IDs", async () => {
    await veluxora.connect(user1).registerUser();
    const minBid = 1;

    // Get the current block timestamp from the blockchain
    const currentBlock = await ethers.provider.getBlock('latest');
    const currentTime = currentBlock.timestamp;

    // Set start time to be well in the future to avoid timing issues
    const startTime = currentTime + 60; // 1 minute from now
    const endTime = currentTime + 3660; // 1 hour and 1 minute from now

    const id1 = "auction1";
    const id2 = "auction2";
    const bpkbTokenId1 = 1;
    const stnkTokenId1 = 2;
    const bpkbTokenId2 = 3;
    const stnkTokenId2 = 4;
    const bpkbUri1 = "ipfs://bpkb1";
    const stnkUri1 = "ipfs://stnk1";
    const bpkbUri2 = "ipfs://bpkb2";
    const stnkUri2 = "ipfs://stnk2";

    await veluxora.connect(user1).createAuction(
        id1,
        minBid,
        startTime,
        endTime,
        bpkbTokenId1,
        stnkTokenId1,
        bpkbUri1,
        stnkUri1
      )
    await veluxora.connect(user1).createAuction(
        id2,
        minBid,
        startTime,
        endTime,
        bpkbTokenId2,
        stnkTokenId2,
        bpkbUri2,
        stnkUri2
      )

    const auction1 = await veluxora.getAuctionDetail("auction1");
    const auction2 = await veluxora.getAuctionDetail("auction2");

    expect(auction1.creator).to.equal(user1.address);
    expect(auction2.creator).to.equal(user1.address);
    expect(auction1.bpkbId).to.equal(1);
    expect(auction2.bpkbId).to.equal(3);
  });

  


});
