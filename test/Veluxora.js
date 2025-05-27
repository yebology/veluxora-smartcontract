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
    const minBid = ethers.parseEther("1");
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
    const minBid = ethers.parseEther("1");
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
    const minBid = ethers.parseEther("1");
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
    const minBid = ethers.parseEther("1");
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
    const minBid = ethers.parseEther("1");

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

  it("should isolate state between different auctions", async () => {
    await veluxora.connect(user1).registerUser();
    await veluxora.connect(user2).registerUser();
    const minBid = ethers.parseEther("1");

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

    // Move time forward to auction start
    await ethers.provider.send("evm_increaseTime", [70]);
    await ethers.provider.send("evm_mine");

    // User2 places a bid in auction1
    await veluxora.connect(user2).bid(id1, { value: ethers.parseEther("2") });

    // Fetch updated auction1 detail
    const auction1 = await veluxora.getAuctionDetail(id1);
    const auction2 = await veluxora.getAuctionDetail(id2);

    // Assertion to make sure auction2 is unaffected
    expect(auction1.highestBid).to.equal(ethers.parseEther("2"));
    expect(auction1.highestBidder).to.equal(user2.address);
    expect(auction2.highestBid).to.equal(0);
  });

  // BIDDING TESTS

  it("should allow users to bid and return ETH on being outbid", async () => {
    await veluxora.connect(user1).registerUser("hashed-ktp-user1");
    await veluxora.connect(user2).registerUser("hashed-ktp-user2");

    const deadline = Math.floor(Date.now() / 1000) + 3600;
    await veluxora.connect(user1).createAuction(uri1, uri2, ethers.utils.parseEther("1"), deadline);

    // Bid from user2
    await expect(veluxora.connect(user2).bid(0, { value: ethers.utils.parseEther("1.5") }))
      .to.emit(veluxora, "NewBidAdded");

    // Bid from owner with higher value
    await expect(veluxora.connect(owner).registerUser("hashed-ktp-owner"))
      .to.emit(veluxora, "NewUserRegistered");

    await expect(veluxora.connect(owner).bid(0, { value: ethers.utils.parseEther("2") }))
      .to.emit(veluxora, "DepositReturned")
      .and.to.emit(veluxora, "NewBidAdded");
  });

  it("should prevent creator from bidding in own auction", async () => {
    await veluxora.connect(user1).registerUser("hash-1");
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    await veluxora.connect(user1).createAuction(uri1, uri2, ethers.utils.parseEther("1"), deadline);

    await expect(
      veluxora.connect(user1).bid(0, { value: ethers.utils.parseEther("2") })
    ).to.be.revertedWith("Auction creator cannot bid.");
  });

  it("should not allow bidding after deadline", async () => {
    await veluxora.connect(user1).registerUser("hashed-ktp-user1");
    const pastDeadline = Math.floor(Date.now() / 1000) - 100;

    await veluxora.connect(user1).createAuction(uri1, uri2, ethers.utils.parseEther("1"), pastDeadline);

    await expect(
      veluxora.connect(user2).bid(0, { value: ethers.utils.parseEther("1.5") })
    ).to.be.revertedWith("Auction has ended.");
  });

  it("should reject bid below minimum bid", async () => {
    await veluxora.connect(user1).registerUser("hash-1");
    await veluxora.connect(user2).registerUser("hash-2");
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    await veluxora.connect(user1).createAuction(uri1, uri2, ethers.utils.parseEther("2"), deadline);

    await expect(
      veluxora.connect(user2).bid(0, { value: ethers.utils.parseEther("1.5") })
    ).to.be.revertedWith("Bid must be higher than minBid and current highest");
  });

  // CLAIMING TESTS

  it("should finalize auction and transfer NFT + funds", async () => {
    await veluxora.connect(user1).registerUser("hashed-ktp-user1");
    await veluxora.connect(user2).registerUser("hashed-ktp-user2");

    const deadline = Math.floor(Date.now() / 1000) + 3;
    await veluxora.connect(user1).createAuction(uri1, uri2, ethers.utils.parseEther("1"), deadline);
    await veluxora.connect(user2).bid(0, { value: ethers.utils.parseEther("1.5") });

    await new Promise(resolve => setTimeout(resolve, 4000)); // Wait until deadline passed

    await expect(veluxora.connect(user2).claimAuction(0))
      .to.emit(veluxora, "WinnerAnnounced")
      .and.to.emit(veluxora, "WinningETHTransferred");

    const auction = await veluxora.auctions(0);
    expect(auction.claimed).to.be.true;
    expect(await veluxora.ownerOf(auction.bpkbId)).to.equal(user2.address);
  });

  it("should prevent claim by non-highest bidder", async () => {
    await veluxora.connect(user1).registerUser("hash-1");
    await veluxora.connect(user2).registerUser("hash-2");
    const deadline = Math.floor(Date.now() / 1000) + 2;

    await veluxora.connect(user1).createAuction(uri1, uri2, ethers.utils.parseEther("1"), deadline);
    await veluxora.connect(user2).bid(0, { value: ethers.utils.parseEther("2") });

    await new Promise(resolve => setTimeout(resolve, 3000));

    await expect(
      veluxora.connect(user1).claimAuction(0)
    ).to.be.revertedWith("Only highest bidder can claim.");
  });

  it("should prevent double claiming", async () => {
    await veluxora.connect(user1).registerUser("hash-1");
    await veluxora.connect(user2).registerUser("hash-2");
    const deadline = Math.floor(Date.now() / 1000) + 2;

    await veluxora.connect(user1).createAuction(uri1, uri2, ethers.utils.parseEther("1"), deadline);
    await veluxora.connect(user2).bid(0, { value: ethers.utils.parseEther("2") });

    await new Promise(resolve => setTimeout(resolve, 3000));
    await veluxora.connect(user2).claimAuction(0);

    await expect(
      veluxora.connect(user2).claimAuction(0)
    ).to.be.revertedWith("Auction already claimed");
  });




});
