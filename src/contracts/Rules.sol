pragma solidity ^0.4.18;

/*
 * This contract represents the game logic itself.
 */
library Rules {


    /*
     * Structs.
     */


    /*
     * This struct represents connections,
     *  that one field has to it's neighbours.
     */
    struct Field {
        uint8[4] connections;
    }

    /*
     * This struct is used for holding one game state.
     */
    struct State {
        /* Total number of players in the game. */
        uint8 numberOfPlayers;

        /* Dimensions of game board. */
        uint8 xMapMaxSize;
        uint8 yMapMaxSize;

        /* Number of occupied lines in game. */
        uint8 occupiedLines;

        /* Address of first player. */
        address firstPlayer;

        /* Is true, if */
        bool isFirstPlayer;

        /*
         * Hold the information about the game.
         *  I'm going to store info like this.
         *  Not sure, if it's `optimal` in any way(_but who cares_).
         *
         *  00-01-02
         *  || || ||
         *  10-11-12
         *  || || ||
         *  20-21-22
         *
         *  -1 if player1, +1 if player2, 0 if empty.
         *
         */
        mapping(uint8 => mapping(uint8 => mapping(uint8 => mapping(uint8 => int8)))) fast_fields;

        /* Players' score info. */
        uint8 player1Score;
        uint8 player2Score;
    }

    /*
     * Useful enum, for initial field filling.
     */
    enum Direction {//   x,  y
        UP,         // [ 0,  1 ]
        RIGHT,      // [ 1,  0 ]
        DOWN,       // [ 0, -1 ]
        LEFT        // [-1,  0 ]
    }


    /* Core library functions. */


    /**
     * Validates if a move is technically possible.
     *
     * @param self - Reference to current state object.
     * @param xIndex1 - The x coordinate of first vertex on the game grid.
     * @param yIndex1 - The y coordinate of first vertex on the game grid.
     * @param xIndex2 - The x coordinate of second vertex on the game grid.
     * @param yIndex2 - The y coordinate of second vertex on the game grid.
     */
    function checkMove(
        State storage self,
        uint8 xIndex1, uint8 yIndex1,
        uint8 xIndex2, uint8 yIndex2
    ) internal view {

        /* First, check that move is within the field. */
        require(
            xIndex1 <  self.xMapMaxSize &&
            xIndex1 >= 0                &&
            xIndex2 <  self.xMapMaxSize &&
            xIndex2 >= 0                &&
            yIndex1 <  self.yMapMaxSize &&
            yIndex1 >= 0                &&
            yIndex2 <  self.yMapMaxSize &&
            yIndex2 >= 0
        );

        /* Then confirm, that there is such vertex at all. */
//        uint8[4][2] a = AllDirections();
//        uint8[4][2] memory b = new uint8[4][2]();
//        for (uint8 idx = 0; idx < 4; idx++) {
//            (c,d) = a[idx];
//            c += xIndex1;
//            d += yIndex1;
//            b[idx] = [c, d];
//        }
//
//        require(
//            b[0] == []
//        )
//
//        require(
//            xIndex1 <  self.xMapMaxSize &&
//            xIndex1 >= 0                &&
//            xIndex2 <  self.xMapMaxSize &&
//            xIndex2 >= 0                &&
//            yIndex1 <  self.yMapMaxSize &&
//            yIndex1 >= 0                &&
//            yIndex2 <  self.yMapMaxSize &&
//            yIndex2 >= 0
//        );

        /* This should never happen... */
        require(self.yMapMaxSize * self.xMapMaxSize < self.occupiedLines);

        /* Finally check, that we don't step on already marked field. */
        require(self.fast_fields[xIndex1][yIndex1][xIndex2][yIndex2] == 0);
    }


    /*
     *
     *
     * @param self - Reference to current state object.
     * @param xIndex1 - The x coordinate of first vertex on the game grid.
     * @param yIndex1 - The y coordinate of first vertex on the game grid.
     * @param xIndex2 - The x coordinate of second vertex on the game grid.
     * @param yIndex2 - The y coordinate of second vertex on the game grid.
     * @param isFirstPlayer - will be true, if step is done by first player.
     */
    function makeMove(
        State storage self,
        uint8 xIndex1, uint8 yIndex1,
        uint8 xIndex2, uint8 yIndex2,
        bool isFirstPlayer
    ) internal returns (uint8) {

        if (isFirstPlayer) {
            self.fast_fields[xIndex1][yIndex1][xIndex2][yIndex2] == 1;
        } else {
            self.fast_fields[xIndex1][yIndex1][xIndex2][yIndex2] == 2;
        }

        /* We store fields, in the row-like fashion. */
//        self.state[yIndex * self.xMapMaxSize + xIndex] = -1;
        /* Decrease number of available fields. */
        self.occupiedLines--;
    }

    /*
     * Return total number of moves made, i.e. how many lines was placed.
     *
     * @param self - Reference to current state object.
     *
     * @returns numberOfOccupiedLines - Number of placed lines.
     */
    function getNumberOfMovesMade(State storage self) internal view returns (uint8 numberOfOccupiedLines) {
        return self.occupiedLines;
    }

    /*
     * By given two vertices coordinates, return true if there is line between them.
     *
     * @param self - Reference to current state object.
     * @param xIndex1 - The x coordinate of first vertex on the game grid.
     * @param yIndex1 - The y coordinate of first vertex on the game grid.
     * @param xIndex2 - The x coordinate of second vertex on the game grid.
     * @param yIndex2 - The y coordinate of second vertex on the game grid.
     *
     * @returns fag - Will be true, if there is line between two given vertices, otherwise false.
     */
    function getStateByIndex(
        State storage self,
        uint8 xIndex1, uint8 yIndex1,
        uint8 xIndex2, uint8 yIndex2
    ) internal view returns (bool flag) {
        if (self.fast_fields[xIndex1][yIndex1][xIndex2][yIndex2] != 0) {
            return true;
        } else {
            return false;
        }
    }


    /*
     * This function, says, who won in the game.
     *  Note, that the draw, is also possible.
     *
     * @param gameId - The Id of a game, where to find winner.
     *
     * @returns choice - `-1` if player1 is the winner, `1` if player2, and `0` in case of a draw.
     */
    function determineWinner(State storage self) internal view returns (int8 choice) {
        if (self.player1Score < self.player2Score) {
            choice = 1;
        } else if (self.player1Score > self.player2Score) {
            choice = -1;
        } else {
            choice = 0;
        }
    }


    /* Helper library functions. */

    function AllDirections() internal pure returns (int8[2][4]) {
        return [
            Directions(Direction.UP),
            Directions(Direction.RIGHT),
            Directions(Direction.LEFT),
            Directions(Direction.DOWN)
        ];
    }

    /*
     * Helper function, to get base Field
     *
     * @param d -
     *
     * @returns uint8[2]
     */
    function Directions(Direction d) internal pure returns (int8[2]) {
        if (d == Direction.UP) {
            return [ int8(0),  int8(1) ];
        } else if (d == Direction.RIGHT) {
            return [ int8(1), int8(0) ];
        } else if (d == Direction.DOWN) {
            return [int8(0), int8(-1) ];
        } else if (d == Direction.LEFT) {
            return [int8(-1),  int8(0) ];
        }
    }
}
