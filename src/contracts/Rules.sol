pragma solidity ^0.4.17;

contract Rules {


    /*
     * Constructor.
     */


    /*
     * Initialise this entity.
     */
    function Rules() {
        setDirections(Directions.UP, 0, 1);
        setDirections(Directions.UP_RIGHT, 1, 1);
        setDirections(Directions.RIGHT, 1, 0);
        setDirections(Directions.DOWN_RIGHT, 1, -1);
        setDirections(Directions.DOWN, 0, -1);
        setDirections(Directions.DOWN_LEFT, -1, -1);
        setDirections(Directions.LEFT, -1, 0);
        setDirections(Directions.UP_LEFT, -1, 1);

        xMapMaxSize = 8;
        yMapMaxSize = 8;
    }



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
        mapping(int => mapping(int => Field)) fast_fields;
        int8[64] state;
        uint8 occupiedFields;
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


    /*
     *
     *
     * Actually, what I wanted here is `mapping(Direction => int) public balances`, however it still doesn't work.
     */
    mapping (bytes32 => int[2]) directions;

    function getDirection(Direction direction) view internal returns(uint) {
        return directions[sha3(direction)];
    }

    function setDirection(Direction direction, int xValue, int yValue) internal returns(int[2]){
        return directions[sha3(direction)] = [xValue, yValue];
    }

    enum Player {
        RED,        // true
        GREEN       // false
    }

    function Players(Player p) constant internal returns (bool) {
        if (p == Player.RED) {
            return true;
        }
        return false;
    }

    /* validates a move and executes it */
    function move(State storage self, uint256 xIndex, uint256 yIndex, bool isFirstPlayer) public {

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
        checkLegality(self, fromIndex, toIndex, fromFigure, toFigure, currentPlayerColor);

    }

    /**
     * Validates if a move is technically (not legally) possible,
     * i.e. if piece is capable to move this way
     */
    function checkMove(State storage self, uint256 xIndex, uint256 yIndex) internal {

        /* First, check that move is within the field. */
        if (
            xIndex > self.xMapMaxSize ||
            xIndex < 0                ||
            yIndex > self.yMapMaxSize ||
            yIndex < 0
        ) {
            throw;
        }

        /* This should never happen... */
        if (self.yMapMaxSize * self.xMapMaxSize < self.occupiedFields) {
            throw;
        }

        /* Then check, that we don't step on already marked field. */
        if (self.fields[xIndex][yIndex].flag == true) {
            throw;
        }
    }


    function checkMove(State storage self, uint256 xIndex, uint256 yIndex, bool currentPlayerColor) internal {


        self.fields[xIndex][yIndex].flag = true;
        self.fields[xIndex][yIndex].isRed = currentPlayerColor;

//        Check if we have nothing left to move.

    }
}
