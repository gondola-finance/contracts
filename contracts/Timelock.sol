pragma solidity 0.6.12;
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TimeLock {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    IERC20 token;

    struct LockBoxStruct {
        address beneficiary;
        uint balance;
        uint releaseTime;
    }

    LockBoxStruct[] public lockBoxStructs; // This could be a mapping by address, but these numbered lockBoxes support possibility of multiple tranches per address

    event LogLockBoxDeposit(address sender, uint amount, uint releaseTime);   
    event LogLockBoxTransfer(address sender, address to, uint amount, uint releaseTime);   
    event LogLockBoxWithdrawal(address receiver, uint amount);

    constructor(address tokenContract) public {
        token = IERC20(tokenContract);
    }

    function deposit(address beneficiary, uint amount, uint releaseTime) public {
        require(token.transferFrom(msg.sender, address(this), amount));
        LockBoxStruct memory l;
        l.beneficiary = beneficiary;
        l.balance = amount;
        l.releaseTime = releaseTime;
        lockBoxStructs.push(l);
        emit LogLockBoxDeposit(msg.sender, amount, releaseTime);

    }

    function withdraw(uint lockBoxNumber) public {
        LockBoxStruct storage l = lockBoxStructs[lockBoxNumber];
        require(l.beneficiary == msg.sender);
        require(l.releaseTime <= block.timestamp);
        uint amount = l.balance;
        l.balance = 0;
        emit LogLockBoxWithdrawal(msg.sender, amount);
        require(token.transfer(msg.sender, amount));
    }

    function transferLockedFunds(uint lockBoxNumber, address beneficiary, uint amount, uint releaseTime) public {
        LockBoxStruct storage l = lockBoxStructs[lockBoxNumber];
        require(l.beneficiary == msg.sender);
        require(releaseTime >= l.releaseTime);
        uint256 balance =  l.balance;
        l.balance = balance.sub(amount);

        LockBoxStruct memory newL;
        newL.beneficiary = beneficiary;
        newL.balance = amount;
        newL.releaseTime = releaseTime;
        lockBoxStructs.push(newL);

        emit LogLockBoxTransfer(msg.sender, beneficiary,amount, releaseTime);
    }
}