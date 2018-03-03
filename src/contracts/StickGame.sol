pragma solidity ^0.4.18;

import "./TwoPlayerGame.sol";
import "./Rules.sol";
import "./Math.sol";


/*
 * This is the highest entity, in our game.
 * Represents the logic behind our game.
 */
contract StickGame is TwoPlayerGame {


    /*
     * Constructor.
     */


    /*
     * Initialises this entity.
     * Nothing fancy, just empty constructor.
     */
    function StickGame() TwoPlayerGame() public {}


    /*
     * Events.
     */


    /*
     * Is triggered, when any user `creates` a new game.
     *
     * bytes32 gameId - The ID of the created game.
     * bytes32 player1Alias - NickName of the player that created the game.
     * uint8 boardSizeX - X-axis dimension size of the board.
     * uint8 boardSizeY - Y-axis dimension size of the board.
     * uint8 numberOfPlayers - Total number of player needed for the game to run.
     * bool player1MovesFirst - Is going to be true, if player1 is moving first, otherwise false.
     */
    event GameInitialized(
        bytes32 indexed gameId,
        bytes32 player1Alias,
        uint8 boardSizeX,
        uint8 boardSizeY,
        uint8 numberOfPlayers,
        bool player1MovesFirst
    );

    /*
     * Is triggered when somebody joins the game.
     * Somebody must be some different person that player1(player2 != player1).
     *
     * bytes32 gameId - The ID of the created game.
     * address player1 - Address of the player, that created the game.
     * string player1Alias - NickName of the player that created the game.
     * address player2 - The ID of the person, who joined the game.
     * string player2Alias - NickName of the player, who joined the game.
     * bool player1MovesFirst - Is going to be true, if player1 is moving first, otherwise false.
     */
    event GameJoined(
        bytes32 indexed gameId,
        address indexed player1, string player1Alias,
        address indexed player2, string player2Alias,
        bool player1MovesFirst
    );

    /*
     * Triggered, when a movement have been made, by any player.
     *
     * bytes32 gameId - The ID of the created game.
     * address player - Address of the player, that made move.
     * uint256 xIndex - the x position on the grid.
     * uint256 yIndex - the y position on the grid.
     */
    event GameMove(bytes32 indexed gameId, address indexed player, uint256 xIndex, uint256 yIndex);

    /*
     * This event is triggered, when the game was manually closed for joining.
     *
     * bytes32 gameId - id of the game, that was closed.
     */
    event GameClosed(bytes32 indexed gameId);

    /*
     * This event is triggered, when the game had ended.
     *
     * bytes32 gameId - id of the game, that had ended.
     * address player - address of the player, that won the game.
     */
    event GameEnded(bytes32 indexed gameId, address indexed player);


    /*
     * Variables.
     */


    /* Holds game states, for each game. */
    using Rules for Rules.State;
    mapping (bytes32 => Rules.State) gameStatesById;

    /* Represents probability, that the game initiator, will move first. */
    uint player1FirstStepProbability = 50;


    /*
     * Core public functions.
     */


    /*
     * Create a new game and notify about it.
     * Will return the unique modifier of the game, and true if creator got first step.
     *
     * Generally, anyone can create a new game, so no restrictions on this function.
     *
     * string player1Alias - NickName of the player that creates the game.
     * uint8 boardSizeX - X-axis dimension size of the board.
     * uint8 boardSizeY - Y-axis dimension size of the board.
     * uint8 numberOfPlayers - Total number of player needed for the game to run.
     */
    function initGame(
        string player1Alias, uint8 boardSizeX,
        uint8 boardSizeY, uint8 numberOfPlayers
    ) public returns (bytes32, bool) {

        /*
         * User, who created a game, is randomly assigned, if he is going to move first or second.
         * Then the game object is created, and stored in memory.
         */
        bytes32 gameId = _initGame(player1Alias, boardSizeX, boardSizeY, numberOfPlayers, determineFirstMove());

        /* Currently set, the default values. */
        gameStatesById[gameId].yMapMaxSize = boardSizeX;
        gameStatesById[gameId].xMapMaxSize = boardSizeY;
        gameStatesById[gameId].numberOfPlayers = numberOfPlayers;

        /* If player1 moves first, highlight this info in game state. */
        if (gamesById[gameId].nextPlayer != 0) {
            gameStatesById[gameId].firstPlayer   = msg.sender;
            gameStatesById[gameId].isFirstPlayer = true;
        }

        /* Finally, sent notification events. */
        GameInitialized(
            gameId,
            stringToBytes32(player1Alias),
            boardSizeX,
            boardSizeY,
            numberOfPlayers,
            gameStatesById[gameId].isFirstPlayer
        );

        return (gameId, gameStatesById[gameId].isFirstPlayer);
    }

    /*
     * Join an initialized, and open game. Then notify everyone.
     *
     * bytes32 gameId - ID of the game to join.
     * string player2Alias - NickName of the player that wants to join the game.
     */
    function joinGame(bytes32 gameId, string player2Alias) notEnded(gameId) public {
        /*
         * Here, we try to join a game. We may fail, for some reasons.
         * However, if we manage to do it, game is going to be removed from public access.
         */
        super.joinGame(gameId, player2Alias);

        /* If no next player is us -> highlight this info in game state. */
        if (gamesById[gameId].nextPlayer == msg.sender) {
            gameStatesById[gameId].firstPlayer   = msg.sender;
            gameStatesById[gameId].isFirstPlayer = false;
        }

        GameJoined(
            gameId,
            gamesById[gameId].player1, gamesById[gameId].player1Alias,
            msg.sender, player2Alias,
            gameStatesById[gameId].isFirstPlayer
        );
    }

    /*
     * Close open game. Game mustn't have second player.
     *
     * bytes32 gameId - ID of the game to join.
     */
    function closeGame(bytes32 gameId) notEnded(gameId) onlyPlayers(gameId) public {
        super._closeGame(gameId);

        GameClosed(gameId);
    }

    /*
     * Surrender the game. Notify that the game had ended.
     *
     * bytes32 gameId - Id of a game, in which sender want to surrender.
     */
    function surrender(bytes32 gameId) notEnded(gameId) onlyPlayers(gameId) public {
        super.surrender(gameId);

        GameEnded(gameId, gamesById[gameId].winner);
    }

    /*
     * Preform move in the game and notify everyone.
     * After any move, the game may be won,
     *
     * bytes32 gameId - ID of the game, where move is preformed.
     * uint256 xIndex - the x position on the grid.
     * uint256 yIndex - the y position on the grid.
     */
    function makeMove(bytes32 gameId, uint256 xIndex, uint256 yIndex) notEnded(gameId) onlyPlayers(gameId) public {

        /* First, check, that it's this players turn. */
        require(msg.sender != gamesById[gameId].nextPlayer);

        /* Try to make the real move on grid. */
        gameStatesById[gameId].move(xIndex, yIndex, msg.sender == gameStatesById[gameId].firstPlayer);

        super.makeMove(gameId);

        /* If we went up to this point, then all is ok. */
        GameMove(gameId, msg.sender, xIndex, yIndex);

        if (gameStatesById[gameId].occupiedLines == 0) {
            this.finishGame(gameId);
        }
    }

    function finishGame(bytes32 gameId) notEnded(gameId) onlyPlayers(gameId) public {

        super.finishGame(gameId, determineWin(gameId));

        GameEnded(gameId, gamesById[gameId].winner);
    }


    /*
     * Helper public functions.
     */


    /*
     *
     *
     * bytes32 gameId - ID of the game, .
     */
    function getCurrentGameState(bytes32 gameId) public view returns (int8[64]) {
        return gameStatesById[gameId].getCurrentGameState();
    }

    /*
     *
     *
     * bytes32 gameId - ID of the game, .
     */
    function getFirstPlayer(bytes32 gameId) public view returns (address) {
        return gameStatesById[gameId].getFirstPlayer();
    }


    /*
     *
     *
     * bytes32 gameId - ID of the game, .
     * uint256 xIndex - the x position on the grid.
     * uint256 yIndex - the y position on the grid.
     */
    function getStateByIndex(bytes32 gameId, uint256 xIndex, uint256 yIndex) public view returns (bool) {
        return gameStatesById[gameId].getStateByIndex(xIndex, yIndex);
    }

    /*
     * Return number of 'empty lines', that there may be placed.
     *
     * bytes32 gameId - ID of the game, to get number of `left moves`.
     */
    function getNumberOfLeftMoves(bytes32 gameId) public view returns (uint) {
        return 64 - gameStatesById[gameId].getNumberOfMoves();
    }


    /*
     * Inner functions.
     */


    /*
     * Determine, who is going to make move first.
     */
    function determineFirstMove() internal view returns(bool) {
        uint rand = Math.randMod(100);
        if (rand <= player1FirstStepProbability) {
            return true;
        } else {
            return false;
        }
    }

    /*
     * This function, says, who won in the game.
     * Note, that the draw, is also possible.
     *
     * @param bytes32 gameId - The Id of a game, where to find winner.
     *
     * @returns int choice - `-1` if player1 is the winner, `1` if player2, and `0` in case of a draw.
     */
    function determineWin(bytes32 gameId) internal view returns (int8 choice) {
        return 1;
    }


    /*
     * Modifiers.
     */


    /*
     * Throws if called by any account other than the player1 or player2.
     *
     * bytes32 gameId - ID of the game to check.
     */
    modifier onlyPlayers(bytes32 gameId) {
        require(gamesById[gameId].player1 != msg.sender && gamesById[gameId].player2 != msg.sender);
        _;
    }

    /*
     * Will throw, if game had ended.
     *
     * bytes32 gameId - ID of the game to check.
     */
    modifier notEnded(bytes32 gameId) {
        require(gamesById[gameId].isEnded);
        _;
    }
}