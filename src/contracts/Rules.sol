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

        /* Hold the information about the game. */
        mapping(uint8 => mapping(uint8 => Field)) fast_fields;

        /* Players' score info. */
        uint8 player1Score;
        uint8 player2Score;
    }

    /*
     * Useful enum, for initial field filling.
     */
    enum Direction {
        UP,         //  [1, 0, 0, 0]
        RIGHT,      //  [0, 1, 0, 0]
        DOWN,       //  [0, 0, 1, 0]
        LEFT        //  [0, 0, 0, 1]
    }


    /* Core library functions. */


    /**
     * Validates if a move is technically (not legally) possible,
     * i.e. if piece is capable to move this way
     *
     * @param State self - Reference to current state object.
     * @param uint8 xIndex1 - The x coordinate of first vertex on the game grid.
     * @param uint8 yIndex1 - The y coordinate of first vertex on the game grid.
     * @param uint8 xIndex2 - The x coordinate of second vertex on the game grid.
     * @param uint8 yIndex2 - The y coordinate of second vertex on the game grid.
     */
    function checkMove(
        State storage self,
        uint8 xIndex1, uint8 yIndex1,
        uint8 xIndex2, uint8 yIndex2
    ) internal view {


        bool currentPlayerColor;

        if (isFirstPlayer) {
            currentPlayerColor = Players(Player.RED);
        } else {
            currentPlayerColor = Players(Player.GREEN);
        }

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


    /*
     *
     *
     * @param State self - Reference to current state object.
     * @param uint8 xIndex1 - The x coordinate of first vertex on the game grid.
     * @param uint8 yIndex1 - The y coordinate of first vertex on the game grid.
     * @param uint8 xIndex2 - The x coordinate of second vertex on the game grid.
     * @param uint8 yIndex2 - The y coordinate of second vertex on the game grid.
     */
    function makeMove(
        State storage self,
        uint8 xIndex1, uint8 yIndex1,
        uint8 xIndex2, uint8 yIndex2,
        bool currentPlayerColor
    ) internal {

        self.fast_fields[xIndex][yIndex].flag = true;
        self.fast_fields[xIndex][yIndex].isRed = currentPlayerColor;

        /* We store fields, in the row-like fashion. */
        self.state[yIndex * self.xMapMaxSize + xIndex] = -1;

        /* Decrease number of available fields. */
        self.occupiedLines--;
    }

    /*
     * Return total number of moves made, i.e. how many lines was placed.
     *
     * @param State self - Reference to current state object.
     *
     * @returns uint8 numberOfOccupiedLines - Number of placed lines.
     */
    function getNumberOfMovesMade(State storage self) internal view returns (uint8 numberOfOccupiedLines) {
        return self.occupiedLines;
    }

    /*
     * By given two vertices coordinates, return true if there is line between them.
     *
     * @param State self - Reference to current state object.
     * @param uint8 xIndex1 - The x coordinate of first vertex on the game grid.
     * @param uint8 yIndex1 - The y coordinate of first vertex on the game grid.
     * @param uint8 xIndex2 - The x coordinate of second vertex on the game grid.
     * @param uint8 yIndex2 - The y coordinate of second vertex on the game grid.
     *
     * @returns bool fag - Will be true, if there is line between two given vertices, otherwise false.
     */
    function getStateByIndex(
        State storage self,
        uint8 xIndex1, uint8 yIndex1,
        uint8 xIndex2, uint8 yIndex2
    ) internal view returns (bool flag) {

    }


    /*
     * This function, says, who won in the game.
     *  Note, that the draw, is also possible.
     *
     * @param bytes32 gameId - The Id of a game, where to find winner.
     *
     * @returns int choice - `-1` if player1 is the winner, `1` if player2, and `0` in case of a draw.
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

    /*
     * Helper function, to get base Field
     *
     * @param Direction d -
     *
     * @returns uint8[4]
     */
    function Directions(Direction d) internal pure returns (uint8[4]) {

        if (d == Direction.UP) {
            return [1, 0, 0, 0];
        } else if (d == Direction.RIGHT) {
            return [0, 1, 0, 0];
        } else if (d == Direction.DOWN) {
            return [0, 0, 1, 0];
        } else if (d == Direction.LEFT) {
            return [0, 0, 0, 1];
        }
    }
}
