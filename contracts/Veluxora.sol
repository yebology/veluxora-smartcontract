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