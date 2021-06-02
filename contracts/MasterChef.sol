// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./GondolaToken.sol";

interface IMigratorChef {
    // Perform LP token migration from legacy UniswapV2 to GondolaSwap.
    // Take the current LP token address and return the new LP token address.
    // Migrator should have full access to the caller's LP token.
    // Return the new LP token address.
    //
    // XXX Migrator must have allowance access to UniswapV2 LP tokens.
    // GondolaSwap must mint EXACTLY the same amount of GondolaSwap LP tokens or
    // else something bad will happen. Traditional UniswapV2 does not
    // do that so be careful!
    function migrate(IERC20 token) external returns (IERC20);
}

// MasterChef is the master of Gondola. He can make Gondola and he is a fair guy.
//
// Note that it's ownable and the owner wields tremendous power. The ownership
// will be transferred to a governance smart contract once GONDOLA is sufficiently
// distributed and the community can show to govern itself.
//
// Have fun reading it. Hopefully it's bug-free. God bless.
contract MasterChef is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    // Info of each user.
    struct UserInfo {
        uint256 amount; // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
        //
        // We do some fancy math here. Basically, any point in time, the amount of GONDOLAs
        // entitled to a user but is pending to be distributed is:
        //
        //   pending reward = (user.amount * pool.accGondolaPerShare) - user.rewardDebt
        //
        // Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
        //   1. The pool's `accGondolaPerShare` (and `lastRewardBlock`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }
    // Info of each pool.
    struct PoolInfo {
        IERC20 lpToken; // Address of LP token contract.
        uint256 allocPoint; // How many allocation points assigned to this pool. GONDOLAs to distribute per block.
        uint256 lastRewardAt; // Last timestamp that GONDOLAs distribution occurs.
        uint256 accGondolaPerShare; // Accumulated GONDOLAs per share, times 1e12. See below.
    }
    // The GONDOLA TOKEN!
    GondolaToken public gondola;
    // timestamp when bonus GONDOLA period ends.
    uint256 public endAt;
    // GONDOLA tokens created per second.
    uint256 public gondolaPerSec;
    // Bonus muliplier for early gondola makers.
    uint256 public constant BONUS_MULTIPLIER = 10;
    // The migrator contract. It has a lot of power. Can only be set through governance (owner).
    IMigratorChef public migrator;
    // Info of each pool.
    PoolInfo[] public poolInfo;
    // Info of each user that stakes LP tokens.
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    // Total allocation poitns. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint = 0;
    // The timestamp when GONDOLA mining starts.
    uint256 public startAt;
    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(
        address indexed user,
        uint256 indexed pid,
        uint256 amount
    );

    constructor(GondolaToken _gondola) public {
        gondola = _gondola;
    }

    function setRewards(
        uint256 _startAt,
        uint256 _endAt,
        uint256 _gondolaPerSec
    ) public onlyOwner {
        massUpdatePools();
        gondolaPerSec = _gondolaPerSec;
        endAt = _endAt;
        startAt = _startAt;
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    // Add a new lp to the pool. Can only be called by the owner.
    // XXX DO NOT add the same LP token more than once. Rewards will be messed up if you do.
    function add(
        uint256 _allocPoint,
        IERC20 _lpToken,
        bool _withUpdate
    ) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        uint256 lastRewardAt =
            block.timestamp > startAt ? block.timestamp : startAt;
        totalAllocPoint = totalAllocPoint.add(_allocPoint);
        poolInfo.push(
            PoolInfo({
                lpToken: _lpToken,
                allocPoint: _allocPoint,
                lastRewardAt: lastRewardAt,
                accGondolaPerShare: 0
            })
        );
    }

    // Update the given pool's GONDOLA allocation point. Can only be called by the owner.
    function set(
        uint256 _pid,
        uint256 _allocPoint,
        bool _withUpdate
    ) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(
            _allocPoint
        );
        poolInfo[_pid].allocPoint = _allocPoint;
    }

    // Return reward multiplier over the given _from to _to timestamp.
    function getMultiplier(uint256 _from, uint256 _to)
        public
        view
        returns (uint256)
    {
        if (_from < startAt) {
            _from = startAt;
        }
        if (_to > endAt) {
            _to = endAt;
        }

        if (_to < _from) {
            return 0;
        }

        return _to.sub(_from);
    }

    // View function to see pending GONDOLAs on frontend.
    function pendingGondola(uint256 _pid, address _user)
        external
        view
        returns (uint256)
    {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accGondolaPerShare = pool.accGondolaPerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (block.timestamp > pool.lastRewardAt && lpSupply != 0) {
            uint256 multiplier =
                getMultiplier(pool.lastRewardAt, block.timestamp);
            uint256 gondolaReward =
                multiplier.mul(gondolaPerSec).mul(pool.allocPoint).div(
                    totalAllocPoint
                );
            accGondolaPerShare = accGondolaPerShare.add(
                gondolaReward.mul(1e12).div(lpSupply)
            );
        }
        uint256 amount =
            user.amount.mul(accGondolaPerShare).div(1e12).sub(user.rewardDebt);
        return amount;
    }

    // Update reward vairables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.timestamp <= pool.lastRewardAt) {
            return;
        }
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (lpSupply == 0) {
            pool.lastRewardAt = block.timestamp;
            return;
        }
        uint256 multiplier = getMultiplier(pool.lastRewardAt, block.timestamp);
        uint256 gondolaReward =
            multiplier.mul(gondolaPerSec).mul(pool.allocPoint).div(
                totalAllocPoint
            );
        gondola.distribute(address(this), gondolaReward);
        pool.accGondolaPerShare = pool.accGondolaPerShare.add(
            gondolaReward.mul(1e12).div(lpSupply)
        );
        pool.lastRewardAt = block.timestamp;
    }

    // Deposit LP tokens to MasterChef for GONDOLA allocation.
    function deposit(uint256 _pid, uint256 _amount) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        updatePool(_pid);
        if (user.amount > 0) {
            uint256 pending =
                user.amount.mul(pool.accGondolaPerShare).div(1e12).sub(
                    user.rewardDebt
                );
            safeGondolaTransfer(msg.sender, pending);
        }
        pool.lpToken.safeTransferFrom(
            address(msg.sender),
            address(this),
            _amount
        );
        user.amount = user.amount.add(_amount);
        user.rewardDebt = user.amount.mul(pool.accGondolaPerShare).div(1e12);
        emit Deposit(msg.sender, _pid, _amount);
    }

    // Withdraw LP tokens from MasterChef.
    function withdraw(uint256 _pid, uint256 _amount) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "withdraw: not good");
        updatePool(_pid);
        uint256 pending =
            user.amount.mul(pool.accGondolaPerShare).div(1e12).sub(
                user.rewardDebt
            );

        safeGondolaTransfer(msg.sender, pending);
        user.amount = user.amount.sub(_amount);
        user.rewardDebt = user.amount.mul(pool.accGondolaPerShare).div(1e12);
        pool.lpToken.safeTransfer(address(msg.sender), _amount);
        emit Withdraw(msg.sender, _pid, _amount);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        pool.lpToken.safeTransfer(address(msg.sender), user.amount);
        emit EmergencyWithdraw(msg.sender, _pid, user.amount);
        user.amount = 0;
        user.rewardDebt = 0;
    }

    // Safe gondola transfer function, just in case if rounding error causes pool to not have enough GONDOLAs.
    function safeGondolaTransfer(address _to, uint256 _amount) internal {
        uint256 gondolaBal = gondola.balanceOf(address(this));
        if (_amount > gondolaBal) {
            gondola.transfer(_to, gondolaBal);
        } else {
            gondola.transfer(_to, _amount);
        }
    }
}
