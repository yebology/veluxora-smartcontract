// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Veluxora is ERC721URIStorage, ReentrancyGuard {
    // 
    
    constructor() ERC721("Veluxora", "VLX") {}

    function _createToken(uint256 _tokenId, string memory _uri) private {
        _safeMint(address(this), _tokenId);
        _setTokenURI(_tokenId, _uri);
    }

    function _transferToken(uint256 _tokenId, address _to) private {
        _safeTransfer(address(this), _to, _tokenId);
    }

    //
}
// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;

// contract Veluxora {
//     struct Auction {
//         address payable creator;
//         string carDetails; // ini nanti diganti nft
//         uint256 minBid;
//         uint256 highestBid;
//         address payable highestBidder;
//         uint256 startTime;
//         uint256 deadline;
//         bool ended;
//         bool claimed;
//     }

//     mapping(uint256 => Auction) public auctions; //list auction
//     mapping(address => bool) public registeredUsers; //list user
//     mapping(uint256 => mapping(address => uint256)) public userBids; //list jumlah bid yang ada (sekalian buat tahan dana)
//     uint256 public auctionCount;

//     // Events
//     event NewUserRegistered(address user, string message);
//     event NewAuctionCreated(
//         address indexed creator,
//         uint256 auctionId,
//         string message
//     );
//     event NewBidAdded(
//         address indexed bidder,
//         uint256 auctionId,
//         uint256 amount,
//         string message
//     );
//     event DepositReturned(
//         address indexed bidder,
//         uint256 indexed auctionId,
//         uint256 amount,
//         string message
//     );
//     event WinnerAnnounced(
//         address indexed winner,
//         uint256 auctionId,
//         uint256 amount,
//         string message
//     );
//     event WinningETHTransferred(
//         address indexed creator,
//         uint256 indexed auctionId,
//         uint256 amount,
//         string message
//     );
//     event AuctionCanceled(uint256 auctionId, string message);

//     // Modifiers
//     modifier onlyRegistered() {
//         require(registeredUsers[msg.sender], "You must be a registered user.");
//         _;
//     }

//     modifier auctionExists(uint256 _id) {
//         require(_id < auctionCount, "Auction does not exist.");
//         _;
//     }

//     modifier onlyAuctionCreator(uint256 _id) {
//         require(
//             msg.sender == auctions[_id].creator,
//             "Only auction creator can call this."
//         );
//         _;
//     }

//     modifier onlyBeforeDeadline(uint256 _id) {
//         require(block.timestamp < auctions[_id].deadline, "Auction has ended.");
//         _;
//     }

//     modifier onlyAfterDeadline(uint256 _id) {
//         require(
//             block.timestamp >= auctions[_id].deadline,
//             "Auction is still active."
//         );
//         _;
//     }

//     modifier onlyAfterStart(uint256 _id) {
//         require(
//             block.timestamp >= auctions[_id].startTime,
//             "Auction has not started yet."
//         );
//         _;
//     }

//     // Register user
//     function registerUser() external {
//         require(!registeredUsers[msg.sender], "Already registered.");
//         registeredUsers[msg.sender] = true;
//         emit NewUserRegistered(msg.sender, "User registered successfully");
//     }

//     // Create new auction
//     function createAuction(
//         string memory _carDetails,
//         uint256 _minBid,
//         uint256 _startDelayInMinutes,
//         uint256 _durationInMinutes
//     ) external onlyRegistered {
//         require(_minBid > 0, "Minimum bid must be greater than 0.");
//         uint256 auctionId = auctionCount++;
//         uint256 start = block.timestamp + (_startDelayInMinutes * 1 minutes);
//         auctions[auctionId] = Auction({
//             creator: payable(msg.sender),
//             carDetails: _carDetails,
//             minBid: _minBid,
//             highestBid: 0,
//             highestBidder: payable(address(0)),
//             startTime: start,
//             deadline: start + (_durationInMinutes * 1 minutes),
//             ended: false,
//             claimed: false
//         });
//         emit NewAuctionCreated(
//             msg.sender,
//             auctionId,
//             "Auction successfully created."
//         );
//     }

//     // Bid on an auction
//     function bid(uint256 _id)
//         external
//         payable
//         onlyRegistered
//         auctionExists(_id)
//         onlyBeforeDeadline(_id)
//         onlyAfterStart(_id)
//     {
//         Auction storage auc = auctions[_id];
//         require(msg.value >= auc.minBid, "Bid below minimum.");
//         require(msg.value > auc.highestBid, "Bid not high enough.");

//         if (auc.highestBidder != address(0)) { // Jika sudah ada penawar tertinggi sebelumnya (bukan lelang baru)
//             userBids[_id][auc.highestBidder] = 0; //Reset bid pengguna sebelumnya
//             auc.highestBidder.transfer(auc.highestBid); //Balikan uang
//             emit DepositReturned(
//                 auc.highestBidder,
//                 _id,
//                 auc.highestBid,
//                 "Previous deposit returned."
//             );
//         }

//         auc.highestBid = msg.value;
//         auc.highestBidder = payable(msg.sender);
//         userBids[_id][msg.sender] = msg.value;

//         emit NewBidAdded(msg.sender, _id, msg.value, "New bid placed.");
//     }

//     // Finalize auction
//     function finalizeAuction(uint256 _id)
//         external
//         auctionExists(_id)
//         onlyAfterDeadline(_id)
//     {
//         Auction storage auc = auctions[_id];
//         require(!auc.ended, "Auction already ended.");
//         auc.ended = true;

//         if (auc.highestBidder != address(0)) {
//             emit WinnerAnnounced(
//                 auc.highestBidder,
//                 _id,
//                 auc.highestBid,
//                 "Winner has been determined."
//             );
//         }
//     }

//     // Claim ETH
//     function claimWinningETH(uint256 _id)
//         external
//         auctionExists(_id)
//         onlyAuctionCreator(_id)
//         onlyAfterDeadline(_id)
//     {
//         Auction storage auc = auctions[_id];
//         require(auc.ended, "Auction not ended yet.");
//         require(!auc.claimed, "Already claimed.");
//         require(auc.highestBid > 0, "No bids.");

//         auc.claimed = true;
//         auc.creator.transfer(auc.highestBid);

//         emit WinningETHTransferred(
//             auc.creator,
//             _id,
//             auc.highestBid,
//             "Funds transferred to auction creator."
//         );
//     }

//     // Cancel auction
//     function cancelAuction(uint256 _id)
//         external
//         auctionExists(_id)
//         onlyAuctionCreator(_id)
//     {
//         Auction storage auc = auctions[_id];
//         require(!auc.ended, "Auction already ended.");
//         require(block.timestamp < auc.startTime, "Auction already started.");

//         auc.ended = true;
//         emit AuctionCanceled(_id, "Auction canceled.");
//     }

//     // View highest bid
//     function getHighestBid(uint256 _id)
//         external
//         view
//         auctionExists(_id)
//         returns (address bidder, uint256 amount)
//     {
//         Auction memory auc = auctions[_id];
//         return (auc.highestBidder, auc.highestBid);
//     }

//     function updateAuction(
//         uint256 _id,
//         uint256 _newMinBid,
//         uint256 _newStartTime,
//         uint256 _newDeadline,
//         string memory _newCarDetails
//     ) external auctionExists(_id) onlyAuctionCreator(_id) {
//         Auction storage auc = auctions[_id];
//         require(!auc.ended, "Auction already ended.");
//         require(block.timestamp < auc.deadline, "Auction deadline has passed.");
//         require(_newMinBid > 0, "Minimum bid must be greater than 0.");
//         require(
//             _newStartTime < _newDeadline,
//             "Start time must be before deadline."
//         );

//         auc.minBid = _newMinBid;
//         auc.startTime = _newStartTime;
//         auc.deadline = _newDeadline;
//         auc.carDetails = _newCarDetails;
//     }
// }
