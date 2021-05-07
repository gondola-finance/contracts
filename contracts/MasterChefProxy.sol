// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IMasterChef {
    function add(
        uint256 _allocPoint,
        IERC20 _lpToken,
        bool _withUpdate
    ) external;

    function set(
        uint256 _pid,
        uint256 _allocPoint,
        bool _withUpdate
    ) external;

    function setRewards(
        uint256 _startAt,
        uint256 _endAt,
        uint256 _gondolaPerSec
    ) external;

    function transferOwnership(address newOwner) external;
}

contract MasterChefProxy is Ownable {
    using SafeMath for uint256;

    IMasterChef public masterChef;
    uint256 public DELAY = 14 * 24 * 3600;
    uint256 public transferStartedAt;
    address public transferTo;

    constructor(IMasterChef _masterChef) public {
        masterChef = _masterChef;
    }

    function add(
        uint256 _allocPoint,
        IERC20 _lpToken,
        bool _withUpdate
    ) public onlyOwner {
        masterChef.add(_allocPoint, _lpToken, _withUpdate);
    }

    function set(
        uint256 _pid,
        uint256 _allocPoint,
        bool _withUpdate
    ) public onlyOwner {
        masterChef.set(_pid, _allocPoint, _withUpdate);
    }

    function setRewards(
        uint256 _startAt,
        uint256 _endAt,
        uint256 _gondolaPerSec
    ) public onlyOwner {
        masterChef.setRewards(_startAt, _endAt, _gondolaPerSec);
    }

    function initMasterChefTransfer(address to) public onlyOwner {
        transferStartedAt = block.timestamp;
        transferTo = to;
    }

    function executeTransfer() public {
        require(
            owner() == _msgSender() || transferTo == _msgSender(),
            "Ownable: caller is not the owner or future owner"
        );
        require(block.timestamp > transferStartedAt.add(DELAY), "Too early");
        masterChef.transferOwnership(transferTo);
    }
}
