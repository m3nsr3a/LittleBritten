pragma solidity ^0.4.18;

/*
 * Default class needed from truffle-migrations.
 */
contract Migrations {

    /*
     * Constructor.
     */

    function Migrations() public {
        owner = msg.sender;
    }


    /*
     * Variables.
     */


    /*
     * Represents the owner of the contract.
     */
    address public owner;

    /*
     * UID of last completed transaction.
     */
    uint public last_completed_migration;


    /*
     * Core public functions.
     */


    /*
     * Setter with restriction for `last_completed_migration` variable.
     */
    function setCompleted(uint completed) public restricted {
        last_completed_migration = completed;
    }

    /*
     * Update ownership.
     */
    function upgrade(address new_address) public restricted {
        Migrations upgraded = Migrations(new_address);
        upgraded.setCompleted(last_completed_migration);
    }


    /*
     * Modifiers.
     */


    /*
     * Modifier, if used, allows only contract owner, to proceed further.
     */
    modifier restricted() {
        if (msg.sender == owner) _;
    }

}
