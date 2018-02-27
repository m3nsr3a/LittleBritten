pragma solidity ^0.4.18;

/*
 * Simple math library, with error checking.
 *
 * Holds couple of useful functions.
 */
library Math {


    /*
     * Variables.
     */


    uint private randNonce = 0;


    /*
     * Core functions.
     */


    /*
     * Multiplies two numbers.
     * If an overflow happens -> throws.
     *
     * uint256 a - One integer to multiply.
     * uint256 b - Other integer to multiply.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }
        uint256 c = a * b;
        assert(c / a == b);
        return c;
    }

    /*
     * Integer division of two numbers. Will truncate the quotient.
     *
     * uint256 a - Dividend.
     * uint256 b - Divisor.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {

        assert(b > 0);
        uint256 c = a / b;

        assert(a == b * c + a % b);
        return c;
    }

    /*
     * Subtracts two numbers.
     * If an overflow happens(i.e. if subtrahend is greater than minuend) -> throws.
     *
     * uint256 a - Minuend.
     * uint256 b - Subtrahend.
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        assert(b <= a);
        return a - b;
    }

    /*
     * Adds two numbers.
     * If an overflow happens -> throws.
     *
     * uint256 a - Addendum 1.
     * uint256 b - Addendum 2.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        assert(c >= a);
        return c;
    }

    /*
     * Returns the absolute value of an integer.
     *
     * int256 a - Some number.
     */
    function abs(int256 a) internal pure returns (uint256) {
        if (a >= 0) {
             return uint256(a);
        } else {
            return uint256(-1 * a);
        }
    }

    /*
     * Transforms given boolean value to int.
     *
     * bool a - Some boolean.
     */
    function boolToInt(bool a) internal pure returns (int) {
        if (a) {
            return 1;
        } else {
            return 0;
        }
    }

    /*
     * Transforms given int value to boolean, using such pattern:
     *  - If given integer is > 0 -> true.
     *  - Else false.
     *
     * int256 a - Some number.
     */
    function IntToBool(int256 a) internal pure returns (bool) {
        if (a > 0) {
            return true;
        } else {
            return false;
        }
    }

    /*
     * For given modulus, returns `random` number from range [0, modulus].
     *
     * uint256 _modulus - Module for number fitting.
     */
    function randMod(uint _modulus) internal returns(uint) {
        randNonce++;
        return uint(keccak256(now, msg.sender, randNonce)) % _modulus;
    }
}