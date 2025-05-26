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
        await veluxora.deployed();
    });

//REGISTRATION TESTS

    it("should allow user registration", async () => {
        await expect(veluxora.connect(user1).registerUser("hashed-ktp-user1"))
            .to.emit(veluxora, "NewUserRegistered")
            .withArgs(user1.address, "Registration successful");
        expect(await veluxora.registeredUsers(user1.address)).to.be.true;
    });

    it("should prevent duplicate registration", async () => {
        await veluxora.connect(user1).registerUser("hash-1");
        await expect(
            veluxora.connect(user1).registerUser("hash-1")
        ).to.be.revertedWith("You are already registered.");
    });

    it("should prevent unregistered users from creating or bidding", async () => {
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        await expect(
            veluxora.connect(user1).createAuction(uri1, uri2, ethers.utils.parseEther("1"), deadline)
        ).to.be.revertedWith("You must be a registered user.");

        await expect(
            veluxora.connect(user1).bid(0, { value: ethers.utils.parseEther("1.5") })
        ).to.be.revertedWith("You must be a registered user.");
    });
    
// AUCTION TESTS

    it("should allow auction creation after registration", async () => {
        await veluxora.connect(user1).registerUser("hashed-ktp-user1");
        const now = Math.floor(Date.now() / 1000);
        const deadline = now + 3600;

        await expect(
            veluxora.connect(user1).createAuction(uri1, uri2, ethers.utils.parseEther("1"), deadline)
        ).to.emit(veluxora, "NewAuctionCreated");

        const auction = await veluxora.auctions(0);
        expect(auction.creator).to.equal(user1.address);
        expect(await veluxora.ownerOf(auction.bpkbId)).to.equal(veluxora.address);
    });

    it("should not allow auction creation by unregistered user", async () => {
        const future = Math.floor(Date.now() / 1000) + 1000;
        await expect(
            veluxora.connect(user2).createAuction(uri1, uri2, ethers.utils.parseEther("1"), future)
        ).to.be.revertedWith("You must be a registered user.");
    });

    it("should not allow auction creation with past deadline", async () => {
        await veluxora.connect(user1).registerUser("hash-1");
        const past = Math.floor(Date.now() / 1000) - 100;
        await expect(
            veluxora.connect(user1).createAuction(uri1, uri2, ethers.utils.parseEther("1"), past)
        ).to.be.revertedWith("Deadline must be in the future.");
    });

    it("should support multiple auctions per user", async () => {
        await veluxora.connect(user1).registerUser("hash-1");
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        await veluxora.connect(user1).createAuction(uri1, uri2, ethers.utils.parseEther("1"), deadline);
        await veluxora.connect(user1).createAuction(uri1, uri2, ethers.utils.parseEther("2"), deadline);

        const auction1 = await veluxora.auctions(0);
        const auction2 = await veluxora.auctions(1);
        expect(auction1.creator).to.equal(user1.address);
        expect(auction2.creator).to.equal(user1.address);
    });

    it("should isolate state between different auctions", async () => {
        await veluxora.connect(user1).registerUser("hash-1");
        await veluxora.connect(user2).registerUser("hash-2");
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        await veluxora.connect(user1).createAuction(uri1, uri2, ethers.utils.parseEther("1"), deadline);
        await veluxora.connect(user1).createAuction(uri1, uri2, ethers.utils.parseEther("1"), deadline);

        await veluxora.connect(user2).bid(0, { value: ethers.utils.parseEther("2") });

        const auction0 = await veluxora.auctions(0);
        const auction1 = await veluxora.auctions(1);
        expect(auction0.highestBid).to.equal(ethers.utils.parseEther("2"));
        expect(auction1.highestBid).to.equal(0);
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
