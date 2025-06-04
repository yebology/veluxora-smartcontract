// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Veluxora is ERC721URIStorage, ERC721Holder, ReentrancyGuard {
    //
    struct Auction {
        address creator;
        uint256 tokenId;
        uint256 minBid;
        uint256 highestBid;
        address highestBidder;
        uint256 startTime;
        uint256 endTime;
        bool claimed;
        bool canceled;
    }
    struct Bid {
        address bidder;
        uint256 amount;
    }

    mapping(string => Auction) public auctions; // list auction
    mapping(string => Bid[]) public bids;

    mapping(address => bool) public registeredUsers; // list user
    mapping(uint256 => bool) public tokenExist;
    mapping(string => bool) public auctionExist;

    // Events
    event NewUserRegistered(address user, string message);
    event NewAuctionCreated(
        address indexed creator,
        string auctionId,
        string message
    );
    event NewBidAdded(
        address indexed bidder,
        string auctionId,
        uint256 amount,
        string message
    );
    event DepositReturned(
        address indexed bidder,
        string indexed auctionId,
        uint256 amount,
        string message
    );
    event WinningETHTransferred(
        address indexed creator,
        string indexed auctionId,
        uint256 amount,
        string message
    );
    event NFTClaimedByWinner(
        string indexed auctionId,
        address indexed winner,
        uint256 tokenId
    );

    event AuctionCanceled(string auctionId, string message);

    // Modifiers
    modifier onlyRegistered() {
        require(registeredUsers[msg.sender], "You must be a registered user.");
        _;
    }

    modifier auctionExists(string memory _id) {
        require(auctionExist[_id], "Auction does not exist.");
        _;
    }

    modifier onlyAuctionCreator(string memory _id) {
        require(
            msg.sender == auctions[_id].creator,
            "Only auction creator can call this."
        );
        _;
    }

    modifier onlyBeforeAuctionStart(string memory _id) {
        require(
            block.timestamp < auctions[_id].startTime,
            "Auction already started."
        );
        _;
    }

    modifier onlyAfterDeadline(string memory _id) {
        require(
            block.timestamp >= auctions[_id].endTime,
            "Auction is still active."
        );
        _;
    }

    modifier onlyWhileAuctionActive(string memory _id) {
        require(
            block.timestamp >= auctions[_id].startTime &&
                block.timestamp < auctions[_id].endTime,
            "Auction is not active or has already ended"
        );
        _;
    }

    modifier onlyIfNotCanceled(string memory _id) {
        require(!auctions[_id].canceled, "Auction has been canceled");
        _;
    }

    modifier onlyAuctionHighestBidder(string memory _id) {
        require(
            msg.sender == auctions[_id].highestBidder,
            "Caller isn't a the highest bidder"
        );
        _;
    }

    modifier onlyNonRegisteredToken(uint256 _tokenId) {
        require(!tokenExist[_tokenId], "Token ID already registered!");
        _;
    }

    // New modifiers from converted requires
    modifier onlyNotRegistered() {
        require(!registeredUsers[msg.sender], "Already registered.");
        _;
    }

    modifier validMinBid(uint256 _minBid) {
        require(_minBid > 0, "Minimum bid must be greater than 0.");
        _;
    }

    modifier validStartTime(uint256 _startTime) {
        require(_startTime >= block.timestamp, "Start time must be in the future.");
        _;
    }

    modifier validEndTime(uint256 _startTime, uint256 _endTime) {
        require(_endTime > _startTime, "End time must be after start time.");
        _;
    }

    modifier validBidAmount(string memory _id) {
        require(msg.value >= auctions[_id].minBid, "Bid below minimum.");
        require(msg.value > auctions[_id].highestBid, "Bid not high enough.");
        _;
    }

    modifier onlyNotClaimed(string memory _id) {
        require(!auctions[_id].claimed, "Already claimed.");
        _;
    }

    modifier onlyIfHasBids(string memory _id) {
        require(auctions[_id].highestBid > 0, "No bids.");
        _;
    }

    modifier validUpdateTimes(uint256 _newStartTime, uint256 _newEndTime) {
        require(
            _newStartTime < _newEndTime,
            "Start time must be before deadline."
        );
        _;
    }

    constructor() ERC721("Veluxora", "VLX") {}

    function _createToken(uint256 _tokenId, string memory _uri) private {
        _safeMint(address(this), _tokenId);
        _setTokenURI(_tokenId, _uri);
    }

    function _transferToken(uint256 _tokenId, address _to) private {
        _safeTransfer(address(this), _to, _tokenId);
    }

    function _transferETH(address payable _receiver, uint256 _amount) private {
        (bool sent, ) = _receiver.call{value: _amount}("");
        require(sent, "Failed to transfer!");
    }

    // Register user
    function registerUser() external onlyNotRegistered {
        registeredUsers[msg.sender] = true;
        emit NewUserRegistered(msg.sender, "User registered successfully");
    }

    // Create new auction
    function createAuction(
        string memory _id,
        uint256 _minBid,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _tokenId,
        string memory _tokenUri
    )
        external
        onlyRegistered
        onlyNonRegisteredToken(_tokenId)
        validMinBid(_minBid)
        validStartTime(_startTime)
        validEndTime(_startTime, _endTime)
    {
        _createToken(_tokenId, _tokenUri);

        tokenExist[_tokenId] = true;

        auctions[_id] = Auction({
            creator: msg.sender,
            tokenId: _tokenId,
            minBid: _minBid,
            highestBid: 0,
            highestBidder: address(0),
            startTime: _startTime,
            endTime: _endTime,
            claimed: false,
            canceled: false
        });

        auctionExist[_id]=true;

        emit NewAuctionCreated(
            msg.sender,
            _id,
            "Auction successfully created."
        );
    }

    // Bid on an auction
    function bid(
        string memory _id
    )
        external
        payable
        onlyRegistered
        auctionExists(_id)
        onlyWhileAuctionActive(_id)
        onlyIfNotCanceled(_id)
        validBidAmount(_id)
        nonReentrant
    {
        if (auctions[_id].highestBidder != address(0)) {
            _transferETH(
                payable(auctions[_id].highestBidder),
                auctions[_id].highestBid
            );

            emit DepositReturned(
                auctions[_id].highestBidder,
                _id,
                auctions[_id].highestBid,
                "Previous deposit returned."
            );
        }

        _transferETH(payable(address(this)), msg.value);

        auctions[_id].highestBid = msg.value;
        auctions[_id].highestBidder = msg.sender;
        bids[_id].push(Bid(msg.sender, msg.value));

        emit NewBidAdded(msg.sender, _id, msg.value, "New bid placed.");
    }

    // Claim NFT
    function claimNFTForAuctionWinner(
        string memory _id
    )
        external
        auctionExists(_id)
        onlyAfterDeadline(_id)
        onlyAuctionHighestBidder(_id)
        onlyIfNotCanceled(_id)
        nonReentrant
    {
        _transferToken(auctions[_id].tokenId, msg.sender);

        emit NFTClaimedByWinner(
            _id,
            msg.sender,
            auctions[_id].tokenId
        );
    }

    // Claim ETH
    function claimETHForAuctionCreator(
        string memory _id
    )
        external
        auctionExists(_id)
        onlyAuctionCreator(_id)
        onlyAfterDeadline(_id)
        onlyNotClaimed(_id)
        onlyIfHasBids(_id)
        nonReentrant
    {
        auctions[_id].claimed = true;
        _transferETH(payable(auctions[_id].creator), auctions[_id].highestBid);

        emit WinningETHTransferred(
            auctions[_id].creator,
            _id,
            auctions[_id].highestBid,
            "Funds transferred to auction creator."
        );
    }

    // Cancel auction
    function cancelAuction(
        string memory _id
    )
        external
        auctionExists(_id)
        onlyAuctionCreator(_id)
        onlyIfNotCanceled(_id)
        onlyBeforeAuctionStart(_id)
        nonReentrant
    {
        auctions[_id].canceled = true;
        _transferToken(auctions[_id].tokenId, msg.sender);

        emit AuctionCanceled(_id, "Auction canceled.");
    }

    function updateAuction(
        string memory _id,
        uint256 _newMinBid,
        uint256 _newStartTime,
        uint256 _newEndTime,
        uint256 _tokenId,
        string memory _tokenUri
    )
        external
        auctionExists(_id)
        onlyAuctionCreator(_id)
        onlyBeforeAuctionStart(_id)
        onlyIfNotCanceled(_id)
        validMinBid(_newMinBid)
        validUpdateTimes(_newStartTime, _newEndTime)
        nonReentrant
    {
        _transferToken(auctions[_id].tokenId, msg.sender);

        _createToken(_tokenId, _tokenUri);

        auctions[_id].minBid = _newMinBid;
        auctions[_id].startTime = _newStartTime;
        auctions[_id].endTime = _newEndTime;
        auctions[_id].tokenId = _tokenId;
    }

    function getAuctionDetail(
        string memory _id
    ) external view returns (Auction memory) {
        return auctions[_id];
    }

    function getBidHistory(
        string memory _id
    ) external view returns (Bid[] memory) {
        return bids[_id];
    }

    function tokenURI(
        uint256 _tokenId
    ) public view override returns (string memory) {
        return tokenURI(_tokenId);
    }

    receive() external payable {}

    fallback() external payable {
        revert("Function does not exist");
    }
}