pragma solidity ^0.4.18;

/*
 *
 */
library Rules {


    /*
     * Constructor.
     */


    /*
     * Initialise this entity.
     */
//    function Rules() public {
//        setDirection(Direction.UP, 0, 1);
//        setDirection(Direction.UP_RIGHT, 1, 1);
//        setDirection(Direction.RIGHT, 1, 0);
//        setDirection(Direction.DOWN_RIGHT, 1, -1);
//        setDirection(Direction.DOWN, 0, -1);
//        setDirection(Direction.DOWN_LEFT, -1, -1);
//        setDirection(Direction.LEFT, -1, 0);
//        setDirection(Direction.UP_LEFT, -1, 1);
//    }


    /*
     * Variables.
     */


    struct Field {
        bool isRed;
        bool flag;
    }


    struct State {
        uint8 xMapMaxSize;
        uint8 yMapMaxSize;
        mapping(uint256 => mapping(uint256 => Field)) fast_fields;
        int8[64] state;
        uint8 occupiedLines;
        address firstPlayer;
        bool isFirstPlayer;
    }

    enum Direction {
        UP,         //  [0, 1]
        UP_RIGHT,   //  [1, 1]
        RIGHT,      //  [1, 0]
        DOWN_RIGHT, //  [1, -1]
        DOWN,       //  [0, -1]
        DOWN_LEFT,  //  [-1, -1]
        LEFT,       //  [-1, 0]
        UP_LEFT     //  [-1. 1]
    }


    enum Player {
        RED,        // true
        GREEN       // false
    }


    /*
     *
     *
     * Actually, what I wanted here is `mapping(Direction => int) public balances`, however it still doesn't work.
     */
//    mapping (bytes32 => int8[2]) directions;
//
//
//
//    function getDirection(Direction direction) view internal returns (int8[2]) {
//        return directions[keccak256(direction)];
//    }
//
//    function setDirection(Direction direction, int8 xValue, int8 yValue) internal returns (int8[2]) {
//        return directions[keccak256(direction)] = [xValue, yValue];
//    }


    function Players(Player p) constant internal returns (bool) {
        if (p == Player.RED) {
            return true;
        }
        return false;
    }

    /* validates a move and executes it */
    function move(State storage self, uint256 xIndex, uint256 yIndex, bool isFirstPlayer) internal {

        bool currentPlayerColor;
        if (isFirstPlayer) {
            currentPlayerColor = Players(Player.RED);
        } else {
            currentPlayerColor = Players(Player.GREEN);
        }

        /*
         * Validate that this move is possible, and doesn't violate any rules.
         */
        checkMove(self, xIndex, yIndex);

        /* Preform the move itself. */
        makeMove(self, xIndex, yIndex, currentPlayerColor);

        /* Check, that the game is not over yet. */
        checkLegality(self, xIndex, yIndex, currentPlayerColor);

    }

    /**
     * Validates if a move is technically (not legally) possible,
     * i.e. if piece is capable to move this way
     */
    function checkMove(State storage self, uint256 xIndex, uint256 yIndex) internal {

        /* First, check that move is within the field. */
        require(
            xIndex > self.xMapMaxSize ||
            xIndex < 0                ||
            yIndex > self.yMapMaxSize ||
            yIndex < 0
        );

        /* This should never happen... */
        require(self.yMapMaxSize * self.xMapMaxSize < self.occupiedLines);

        /* Then check, that we don't step on already marked field. */
        require(self.fast_fields[xIndex][yIndex].flag == true);
    }


    function makeMove(State storage self, uint256 xIndex, uint256 yIndex, bool currentPlayerColor) internal {

        self.fast_fields[xIndex][yIndex].flag = true;
        self.fast_fields[xIndex][yIndex].isRed = currentPlayerColor;

//        Check if we have nothing left to move.

    }

    function checkLegality(State storage self, uint256 xIndex, uint256 yIndex, bool currentPlayerColor) internal {

    }

    function getAvailableMoves(State storage self) internal returns (uint) {

    }

    function getNumberOfMoves(State storage self) internal returns (uint) {

    }

    function getFirstPlayer(State storage self) internal returns (address) {

    }

    function getCurrentGameState(State storage self) internal returns (int8[64]) {

    }

    function getStateByIndex(State storage self, uint256 xIndex, uint256 yIndex) internal returns (bool) {

    }
}
