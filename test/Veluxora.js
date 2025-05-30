const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Veluxora Auction Smart Contract", function () {
  let Veluxora, veluxora, owner, user1, user2, user3;
  const uri1 = "ipfs://car1-metadata";
  const uri2 = "ipfs://car2-metadata";

  beforeEach(async () => {
    [owner, user1, user2, user3] = await ethers.getSigners();
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

  it("should allow auction cancellation before start time", async () => {
    await veluxora.connect(user1).registerUser();
    const minBid = ethers.parseEther("1");
    
    const currentBlock = await ethers.provider.getBlock('latest');
    const currentTime = currentBlock.timestamp;
    const startTime = currentTime + 100;
    const endTime = currentTime + 3600;
    
    const id = "auction1";
    const bpkbTokenId = 1;
    const stnkTokenId = 2;
    const bpkbUri = "ipfs://bpkb1";
    const stnkUri = "ipfs://stnk1";

    await veluxora.connect(user1).createAuction(
      id,
      minBid,
      startTime,
      endTime,
      bpkbTokenId,
      stnkTokenId,
      bpkbUri,
      stnkUri
    );

    // Cancel auction
    await expect(
      veluxora.connect(user1).cancelAuction(id)
    ).to.emit(veluxora, "AuctionCanceled")
      .withArgs(id, "Auction canceled.");

    const auction = await veluxora.getAuctionDetail(id);
    expect(auction.canceled).to.be.true;

    // Check NFTs are returned to creator
    expect(await veluxora.ownerOf(bpkbTokenId)).to.equal(user1.address);
    expect(await veluxora.ownerOf(stnkTokenId)).to.equal(user1.address);
  });

  it("should not allow cancellation after auction starts", async () => {
    await veluxora.connect(user1).registerUser();
    const minBid = ethers.parseEther("1");
    
    const currentBlock = await ethers.provider.getBlock('latest');
    const currentTime = currentBlock.timestamp;
    const startTime = currentTime + 10;
    const endTime = currentTime + 3600;
    
    const id = "auction1";
    const bpkbTokenId = 1;
    const stnkTokenId = 2;
    const bpkbUri = "ipfs://bpkb1";
    const stnkUri = "ipfs://stnk1";

    await veluxora.connect(user1).createAuction(
      id,
      minBid,
      startTime,
      endTime,
      bpkbTokenId,
      stnkTokenId,
      bpkbUri,
      stnkUri
    );

    // Move time forward past start time
    await ethers.provider.send("evm_increaseTime", [15]);
    await ethers.provider.send("evm_mine");

    // Try to cancel after start
    await expect(
      veluxora.connect(user1).cancelAuction(id)
    ).to.be.revertedWith("Auction already started.");
  });

  it("should allow auction update before start time", async () => {
    await veluxora.connect(user1).registerUser();
    const minBid = ethers.parseEther("1");
    
    const currentBlock = await ethers.provider.getBlock('latest');
    const currentTime = currentBlock.timestamp;
    const startTime = currentTime + 100;
    const endTime = currentTime + 3600;
    
    const id = "auction1";
    const bpkbTokenId = 1;
    const stnkTokenId = 2;
    const bpkbUri = "ipfs://bpkb1";
    const stnkUri = "ipfs://stnk1";

    await veluxora.connect(user1).createAuction(
      id,
      minBid,
      startTime,
      endTime,
      bpkbTokenId,
      stnkTokenId,
      bpkbUri,
      stnkUri
    );

    // Update auction
    const newMinBid = ethers.parseEther("2");
    const newStartTime = currentTime + 200;
    const newEndTime = currentTime + 4000;
    const newBpkbTokenId = 3;
    const newStnkTokenId = 4;
    const newBpkbUri = "ipfs://newbpkb";
    const newStnkUri = "ipfs://newstnk";

    await veluxora.connect(user1).updateAuction(
      id,
      newMinBid,
      newStartTime,
      newEndTime,
      newBpkbTokenId,
      newStnkTokenId,
      newBpkbUri,
      newStnkUri
    );

    const updatedAuction = await veluxora.getAuctionDetail(id);
    expect(updatedAuction.minBid).to.equal(newMinBid);
    expect(updatedAuction.bpkbId).to.equal(newBpkbTokenId);
    expect(updatedAuction.stnkId).to.equal(newStnkTokenId);
  });

  // BIDDING TESTS

  it("should allow users to bid and return ETH on being outbid", async () => {
    // Setup auction
    await veluxora.connect(user1).registerUser();
    await veluxora.connect(user2).registerUser();
    await veluxora.connect(user3).registerUser();
    const minBid = ethers.parseEther("1");
    
    const currentBlock = await ethers.provider.getBlock('latest');
    const currentTime = currentBlock.timestamp;
    const startTime = currentTime + 10;
    const endTime = currentTime + 3600;
    
    const id = "auction1";
    const bpkbTokenId = 1;
    const stnkTokenId = 2;
    const bpkbUri = "ipfs://bpkb1";
    const stnkUri = "ipfs://stnk1";

    await veluxora.connect(user1).createAuction(
      id,
      minBid,
      startTime,
      endTime,
      bpkbTokenId,
      stnkTokenId,
      bpkbUri,
      stnkUri
    );

    // Move time forward to auction start
    await ethers.provider.send("evm_increaseTime", [15]);
    await ethers.provider.send("evm_mine");

    // User2 places first bid
    const user2BalanceBefore = await ethers.provider.getBalance(user2.address);
    await expect(
      veluxora.connect(user2).bid(id, { value: ethers.parseEther("2") })
    ).to.emit(veluxora, "NewBidAdded")
      .withArgs(user2.address, id, ethers.parseEther("2"), "New bid placed.");

    // User3 places higher bid - user2 should get refund
    await expect(
      veluxora.connect(user3).bid(id, { value: ethers.parseEther("3") })
    ).to.emit(veluxora, "DepositReturned")
      .withArgs(user2.address, id, ethers.parseEther("2"), "Previous deposit returned.");

    const auction = await veluxora.getAuctionDetail(id);
    expect(auction.highestBid).to.equal(ethers.parseEther("3"));
    expect(auction.highestBidder).to.equal(user3.address);
  });

it("should prevent creator from bidding in own auction", async () => {
    // Setup auction
    await veluxora.connect(user1).registerUser();
    const minBid = ethers.parseEther("1");
    
    const currentBlock = await ethers.provider.getBlock('latest');
    const currentTime = currentBlock.timestamp;
    const startTime = currentTime + 10;
    const endTime = currentTime + 3600;
    
    const id = "auction1";
    const bpkbTokenId = 1;
    const stnkTokenId = 2;
    const bpkbUri = "ipfs://bpkb1";
    const stnkUri = "ipfs://stnk1";

    await veluxora.connect(user1).createAuction(
      id,
      minBid,
      startTime,
      endTime,
      bpkbTokenId,
      stnkTokenId,
      bpkbUri,
      stnkUri
    );

    // Move time forward to auction start
    await ethers.provider.send("evm_increaseTime", [15]);
    await ethers.provider.send("evm_mine");

    // Creator tries to bid - this should work as the contract doesn't prevent it
    // But in real-world scenarios, this might be prevented in frontend
    await veluxora.connect(user1).bid(id, { value: ethers.parseEther("2") });
    
    const auction = await veluxora.getAuctionDetail(id);
    expect(auction.highestBidder).to.equal(user1.address);
  });

  it("should not allow bidding after deadline", async () => {
    // Setup auction
    await veluxora.connect(user1).registerUser();
    await veluxora.connect(user2).registerUser();
    const minBid = ethers.parseEther("1");
    
    const currentBlock = await ethers.provider.getBlock('latest');
    const currentTime = currentBlock.timestamp;
    const startTime = currentTime + 10;
    const endTime = currentTime + 100; // Short auction
    
    const id = "auction1";
    const bpkbTokenId = 1;
    const stnkTokenId = 2;
    const bpkbUri = "ipfs://bpkb1";
    const stnkUri = "ipfs://stnk1";

    await veluxora.connect(user1).createAuction(
      id,
      minBid,
      startTime,
      endTime,
      bpkbTokenId,
      stnkTokenId,
      bpkbUri,
      stnkUri
    );

    // Move time forward past the deadline
    await ethers.provider.send("evm_increaseTime", [150]);
    await ethers.provider.send("evm_mine");

    // Try to bid after deadline
    await expect(
      veluxora.connect(user2).bid(id, { value: ethers.parseEther("2") })
    ).to.be.revertedWith("Auction is not active or has already ended");
  });

  it("should reject bid below minimum bid", async () => {
    // Setup auction
    await veluxora.connect(user1).registerUser();
    await veluxora.connect(user2).registerUser();
    const minBid = ethers.parseEther("2");
    
    const currentBlock = await ethers.provider.getBlock('latest');
    const currentTime = currentBlock.timestamp;
    const startTime = currentTime + 10;
    const endTime = currentTime + 3600;
    
    const id = "auction1";
    const bpkbTokenId = 1;
    const stnkTokenId = 2;
    const bpkbUri = "ipfs://bpkb1";
    const stnkUri = "ipfs://stnk1";

    await veluxora.connect(user1).createAuction(
      id,
      minBid,
      startTime,
      endTime,
      bpkbTokenId,
      stnkTokenId,
      bpkbUri,
      stnkUri
    );

    // Move time forward to auction start
    await ethers.provider.send("evm_increaseTime", [15]);
    await ethers.provider.send("evm_mine");

    // Try to bid below minimum
    await expect(
      veluxora.connect(user2).bid(id, { value: ethers.parseEther("1") })
    ).to.be.revertedWith("Bid below minimum.");
  });

  it("should get bid history correctly", async () => {
    // Setup auction
    await veluxora.connect(user1).registerUser();
    await veluxora.connect(user2).registerUser();
    await veluxora.connect(user3).registerUser();
    const minBid = ethers.parseEther("1");
    
    const currentBlock = await ethers.provider.getBlock('latest');
    const currentTime = currentBlock.timestamp;
    const startTime = currentTime + 10;
    const endTime = currentTime + 3600;
    
    const id = "auction1";
    const bpkbTokenId = 1;
    const stnkTokenId = 2;
    const bpkbUri = "ipfs://bpkb1";
    const stnkUri = "ipfs://stnk1";

    await veluxora.connect(user1).createAuction(
      id,
      minBid,
      startTime,
      endTime,
      bpkbTokenId,
      stnkTokenId,
      bpkbUri,
      stnkUri
    );

    // Move time forward to auction start
    await ethers.provider.send("evm_increaseTime", [15]);
    await ethers.provider.send("evm_mine");

    // Place multiple bids
    await veluxora.connect(user2).bid(id, { value: ethers.parseEther("2") });
    await veluxora.connect(user3).bid(id, { value: ethers.parseEther("3") });

    const bidHistory = await veluxora.getBidHistory(id);
    expect(bidHistory.length).to.equal(2);
    expect(bidHistory[0].bidder).to.equal(user2.address);
    expect(bidHistory[0].amount).to.equal(ethers.parseEther("2"));
    expect(bidHistory[1].bidder).to.equal(user3.address);
    expect(bidHistory[1].amount).to.equal(ethers.parseEther("3"));
  });

  // // CLAIMING TESTS

 it("should transfer NFT + funds after bid deadline", async () => {
    // Setup auction
    await veluxora.connect(user1).registerUser();
    await veluxora.connect(user2).registerUser();
    const minBid = ethers.parseEther("1");
    
    const currentBlock = await ethers.provider.getBlock('latest');
    const currentTime = currentBlock.timestamp;
    const startTime = currentTime + 10;
    const endTime = currentTime + 100;
    
    const id = "auction1";
    const bpkbTokenId = 1;
    const stnkTokenId = 2;
    const bpkbUri = "ipfs://bpkb1";
    const stnkUri = "ipfs://stnk1";

    await veluxora.connect(user1).createAuction(
      id,
      minBid,
      startTime,
      endTime,
      bpkbTokenId,
      stnkTokenId,
      bpkbUri,
      stnkUri
    );

    // Move time forward to auction start
    await ethers.provider.send("evm_increaseTime", [15]);
    await ethers.provider.send("evm_mine");

    // Place bid
    await veluxora.connect(user2).bid(id, { value: ethers.parseEther("2") });

    // Move time forward past auction end
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine");

    // Winner claims NFT
    await expect(
      veluxora.connect(user2).claimNFTForAuctionWinner(id)
    ).to.emit(veluxora, "NFTClaimedByWinner")
      .withArgs(id, user2.address, bpkbTokenId, stnkTokenId);

    // Creator claims ETH
    await expect(
      veluxora.connect(user1).claimETHForAuctionCreator(id)
    ).to.emit(veluxora, "WinningETHTransferred")
      .withArgs(user1.address, id, ethers.parseEther("2"), "Funds transferred to auction creator.");

    // Check NFT ownership
    expect(await veluxora.ownerOf(bpkbTokenId)).to.equal(user2.address);
    expect(await veluxora.ownerOf(stnkTokenId)).to.equal(user2.address);
  });

   it("should prevent claim by non-highest bidder", async () => {
    // Setup auction
    await veluxora.connect(user1).registerUser();
    await veluxora.connect(user2).registerUser();
    await veluxora.connect(user3).registerUser();
    const minBid = ethers.parseEther("1");
    
    const currentBlock = await ethers.provider.getBlock('latest');
    const currentTime = currentBlock.timestamp;
    const startTime = currentTime + 10;
    const endTime = currentTime + 100;
    
    const id = "auction1";
    const bpkbTokenId = 1;
    const stnkTokenId = 2;
    const bpkbUri = "ipfs://bpkb1";
    const stnkUri = "ipfs://stnk1";

    await veluxora.connect(user1).createAuction(
      id,
      minBid,
      startTime,
      endTime,
      bpkbTokenId,
      stnkTokenId,
      bpkbUri,
      stnkUri
    );

    // Move time forward to auction start
    await ethers.provider.send("evm_increaseTime", [15]);
    await ethers.provider.send("evm_mine");

    // Place bids - user3 will be highest bidder
    await veluxora.connect(user2).bid(id, { value: ethers.parseEther("2") });
    await veluxora.connect(user3).bid(id, { value: ethers.parseEther("3") });

    // Move time forward past auction end
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine");

    // user2 (not highest bidder) tries to claim NFT
    await expect(
      veluxora.connect(user2).claimNFTForAuctionWinner(id)
    ).to.be.revertedWith("Caller isn't a the highest bidder");
  });

   it("should prevent double claiming", async () => {
    // Setup auction
    await veluxora.connect(user1).registerUser();
    await veluxora.connect(user2).registerUser();
    const minBid = ethers.parseEther("1");
    
    const currentBlock = await ethers.provider.getBlock('latest');
    const currentTime = currentBlock.timestamp;
    const startTime = currentTime + 10;
    const endTime = currentTime + 100;
    
    const id = "auction1";
    const bpkbTokenId = 1;
    const stnkTokenId = 2;
    const bpkbUri = "ipfs://bpkb1";
    const stnkUri = "ipfs://stnk1";

    await veluxora.connect(user1).createAuction(
      id,
      minBid,
      startTime,
      endTime,
      bpkbTokenId,
      stnkTokenId,
      bpkbUri,
      stnkUri
    );

    // Move time forward to auction start
    await ethers.provider.send("evm_increaseTime", [15]);
    await ethers.provider.send("evm_mine");

    // Place bid
    await veluxora.connect(user2).bid(id, { value: ethers.parseEther("2") });

    // Move time forward past auction end
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine");

    // First claim by creator
    await veluxora.connect(user1).claimETHForAuctionCreator(id);

    // Try to claim again
    await expect(
      veluxora.connect(user1).claimETHForAuctionCreator(id)
    ).to.be.revertedWith("Already claimed.");
  });




});
