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

    struct Add {
        uint256 allocPoint;
        IERC20 lpToken;
        bool withUpdate;
        bool executed;
        uint256 queuedAt;
    }

    struct Set {
        uint256 pid;
        uint256 allocPoint;
        bool withUpdate;
        bool executed;
        uint256 queuedAt;
    }

    struct SetRewards {
        uint256 startAt;
        uint256 endAt;
        uint256 gondolaPerSec;
        bool executed;
        uint256 queuedAt;
    }

    IMasterChef public masterChef;
    uint256 public TRANSFER_DELAY = 14 * 24 * 3600;
    uint256 public DELAY = 2 * 24 * 3600;
    uint256 public transferStartedAt;
    address public transferTo;
    Add[] public addQueue;
    Set[] public setQueue;
    SetRewards[] public rewardsQueue;

    constructor(IMasterChef _masterChef) public {
        masterChef = _masterChef;
    }

    function initAdd(
        uint256 _allocPoint,
        IERC20 _lpToken,
        bool _withUpdate
    ) public onlyOwner {
        addQueue.push(
            Add({
                allocPoint: _allocPoint,
                lpToken: _lpToken,
                withUpdate: _withUpdate,
                executed: false,
                queuedAt: block.timestamp
            })
        );
        //
    }

    function initSet(
        uint256 _pid,
        uint256 _allocPoint,
        bool _withUpdate
    ) public onlyOwner {
        setQueue.push(
            Set({
                pid: _pid,
                allocPoint: _allocPoint,
                withUpdate: _withUpdate,
                executed: false,
                queuedAt: block.timestamp
            })
        );
        //
    }

    function initSetRewards(
        uint256 _startAt,
        uint256 _endAt,
        uint256 _gondolaPerSec
    ) public onlyOwner {
        rewardsQueue.push(
            SetRewards({
                startAt: _startAt,
                endAt: _endAt,
                gondolaPerSec: _gondolaPerSec,
                executed: false,
                queuedAt: block.timestamp
            })
        );
    }

    function executeAdd(uint256 id) public onlyOwner {
        Add memory add = addQueue[id];
        require(add.executed == false, "already executed");
        require(block.timestamp > add.queuedAt.add(DELAY), "Too early");
        addQueue[id].executed = true;
        masterChef.add(add.allocPoint, add.lpToken, add.withUpdate);
    }

    function executeSet(uint256 id) public onlyOwner {
        Set memory set = setQueue[id];
        require(set.executed == false, "already executed");
        require(block.timestamp > set.queuedAt.add(DELAY), "Too early");
        setQueue[id].executed = true;
        masterChef.set(set.pid, set.allocPoint, set.withUpdate);
    }

    function executeSetRewards(uint256 id) public onlyOwner {
        SetRewards memory setR = rewardsQueue[id];
        require(setR.executed == false, "already executed");
        require(block.timestamp > setR.queuedAt.add(DELAY), "Too early");
        rewardsQueue[id].executed = true;
        masterChef.setRewards(setR.startAt, setR.endAt, setR.gondolaPerSec);
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
        require(
            block.timestamp > transferStartedAt.add(TRANSFER_DELAY),
            "Too early"
        );
        masterChef.transferOwnership(transferTo);
    }
}
