// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GondolaToken is ERC20, Ownable {
    constructor(uint256 _totalSupply) public ERC20("Gondola", "GDL") {
        _mint(address(this), _totalSupply);
    }

    /// @notice Transfer `_amount` token to `_to`. Must only be called by the owner (MasterChef).
    function distribute(address _to, uint256 _amount) public onlyOwner {
        _transfer(address(this), _to, _amount);
    }
}
