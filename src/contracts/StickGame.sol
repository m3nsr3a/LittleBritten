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
     * address player1Address - Address of the player, that created the game.
     * bytes32 player1Alias - NickName of the player that created the game.
     * uint8 boardSizeX - X-axis dimension size of the board.
     * uint8 boardSizeY - Y-axis dimension size of the board.
     * uint8 numberOfPlayers - Total number of player needed for the game to run.
     * bool player1MovesFirst - Is going to be true, if player1 is moving first, otherwise false.
     */
    event GameInitialized(
        bytes32 indexed gameId,
        address indexed player1Address,
        bytes32 player1Alias,
        uint8 boardSizeX,
        uint8 boardSizeY,
        uint8 numberOfPlayers,
        bool player1MovesFirst
    );

    /*
     * Is triggered when somebody joins the game.
     *  Somebody must be some different person that player1(player2 != player1). //ToDo: fix it.
     *
     * bytes32 gameId - The ID of the created game.
     * address player2 - The ID of the person, who joined the game.
     * bytes32 player2Alias - NickName of the player, who joined the game.
     */
    event GameJoined(
        bytes32 indexed gameId,
        address indexed player2,
        bytes32 player2Alias
    );

    /*
     * Triggered, when a movement have been made, by any player.
     *
     * bytes32 gameId - ID of the game, where move is preformed.
     * address player - Address of the player, that made move.
     * bytes32 playerAlias - NickName of the player, who made move.
     * uint8 xIndex1 - the x coordinate of first vertex on the game grid.
     * uint8 yIndex1 - the y coordinate of first vertex on the game grid.
     * uint8 xIndex2 - the x coordinate of second vertex on the game grid.
     * uint8 yIndex2 - the y coordinate of second vertex on the game grid.
     * bool continueMovement - true, if the player had scored on this move.
     */
    event GameMove(
        bytes32 indexed gameId,
        address indexed player,
        bytes32 playerAlias,
        uint8 xIndex1, uint8 yIndex1,
        uint8 xIndex2, uint8 yIndex2,
        bool continueMovement
    );

    /*
     * This event is triggered, when the game was manually closed for joining.
     *
     * bytes32 gameId - id of the game, that was closed.
     * address playerAddress - Address of the player, that closed the game.
     */
    event GameClosed(bytes32 indexed gameId, address indexed playerAddress);

    /*
     * This event is triggered, when the game had ended.
     *
     * bytes32 gameId - id of the game, that had ended.
     * address player - Address of a player, that won the game.
     * bytes32 player - Nick-name of a player, that won the game.
     * bool isATie - if true, two previous fields are ignored, and, it means that the game
     *  ended with a tie.
     */
    event GameEnded(bytes32 indexed gameId, address winnerAddress, bytes32 winnerName, bool isATie);


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
     *
     * NOTE: STATE-CHANGING FUNCTION DON'T RETURN THEIR VALUES.
     *  THEY RETURN THE TRANSACTION HASH, OF WHICH THEY WERE INCLUDED INTO LEDGER CHAIN.
     */
    function initGame(
        string player1Alias, uint8 boardSizeX,
        uint8 boardSizeY, uint8 numberOfPlayers
    ) public {

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
        } else {
            /* Explicitly state it. */
            gameStatesById[gameId].isFirstPlayer = false;
        }

        /* Finally, sent notification events. */
        GameInitialized(
            gameId,
            msg.sender,
            stringToBytes32(player1Alias),
            boardSizeX,
            boardSizeY,
            numberOfPlayers,
            gameStatesById[gameId].isFirstPlayer
        );
    }

    /*
     * Close open game. GameLogic mustn't have second player.
     *
     * bytes32 gameId - ID of the game to join.
     */
    function closeGame(bytes32 gameId) notEnded(gameId) onlyPlayers(gameId) notClosed(gameId) public {
        _closeGame(gameId);

        GameClosed(gameId, msg.sender);
    }

    /*
     * Join an initialized, open game. Then notify everyone.
     *
     * bytes32 gameId - ID of the game to join.
     * string player2Alias - NickName of the player that wants to join the game.
     */
    function joinGame(bytes32 gameId, string player2Alias) notEnded(gameId) notClosed(gameId) public {
        /*
         * Here, we try to join a game. We may fail, for some reasons.
         * However, if we manage to do it, game is going to be removed from public access.
         */
        _joinGame(gameId, player2Alias);

        /* If next player is us -> highlight this info in game state. */
        if (gamesById[gameId].nextPlayer == msg.sender) {
            gameStatesById[gameId].firstPlayer   = msg.sender;
        }

        GameClosed(
            gameId,
            msg.sender
        );

        GameJoined(
            gameId,
            msg.sender,
            stringToBytes32(player2Alias)
        );
    }

    /*
     * Surrender the game. Notify that the game had ended.
     *
     * bytes32 gameId - Id of a game, in which sender want to surrender.
     */
    function surrender(bytes32 gameId) notEnded(gameId) onlyPlayers(gameId) public {
        _surrender(gameId);

        GameEnded(gameId, gamesById[gameId].winner, stringToBytes32(gamesById[gameId].winnerName), false);
    }

    /*
     * Preform move in the game and notify everyone.
     *  After some number of moves, the game may come to it's logical end ->
     *  no more places to place a line. In such case -> we find winner and emit
     *  `GameEnded` event.
     *
     * bytes32 gameId - ID of the game, where move is preformed.
     * uint8 xIndex1 - the x coordinate of first vertex on the game grid.
     * uint8 yIndex1 - the y coordinate of first vertex on the game grid.
     * uint8 xIndex2 - the x coordinate of second vertex on the game grid.
     * uint8 yIndex2 - the y coordinate of second vertex on the game grid.
     */
    function makeMove(
        bytes32 gameId,
        uint8 xIndex1, uint8 yIndex1,
        uint8 xIndex2, uint8 yIndex2
    ) notEnded(gameId) onlyPlayers(gameId) isClosed(gameId) public {

        /* First, check, that it's this players turn. */
        require(msg.sender == gamesById[gameId].nextPlayer);

        /* Confirm, that we may preform such move, according to game logic & rules. */
//        gameStatesById[gameId].checkMove(
//            xIndex1, yIndex1,
//            xIndex2, yIndex2
//        );

        /* Make the real move. */
//        uint8 playerScore = gameStatesById[gameId].makeMove(
//            xIndex1, yIndex1,
//            xIndex2, yIndex2,
//            true
//        );

        require(gameStatesById[gameId].fast_fields[xIndex1][yIndex1][xIndex2][yIndex2] == 0);

        if (gameStatesById[gameId].firstPlayer == msg.sender) {
            gameStatesById[gameId].fast_fields[xIndex1][yIndex1][xIndex2][yIndex2] = 1;
        } else {
            gameStatesById[gameId].fast_fields[xIndex1][yIndex1][xIndex2][yIndex2] = 2;
        }

        uint8 score = 0;
        // top square
         if (
             gameStatesById[gameId].fast_fields[xIndex1][yIndex1 - 1][xIndex2][yIndex2 - 1] != 0 &&
             gameStatesById[gameId].fast_fields[xIndex1][yIndex1 - 1][xIndex1][yIndex1] != 0 &&
             gameStatesById[gameId].fast_fields[xIndex2][yIndex2 - 1][xIndex2][yIndex2] != 0
         ) {
             score += 1;
         }
        // bottom square
         if (
             gameStatesById[gameId].fast_fields[xIndex1][yIndex1 + 1][xIndex2][yIndex2 + 1] != 0 &&
             gameStatesById[gameId].fast_fields[xIndex1][yIndex1][xIndex1][yIndex1 + 1] != 0 &&
             gameStatesById[gameId].fast_fields[xIndex2][yIndex2][xIndex2][yIndex2 + 1] != 0
         ) {
             score += 1;
         }
        // left square
        if (
            gameStatesById[gameId].fast_fields[xIndex1 - 1][yIndex1][xIndex2 - 1][yIndex2] != 0 &&
            gameStatesById[gameId].fast_fields[xIndex1 - 1][yIndex1][xIndex1][yIndex1] != 0 &&
            gameStatesById[gameId].fast_fields[xIndex2 - 1][yIndex2][xIndex2][yIndex2] != 0
        ) {
            score += 1;
        }
        // right square
        if (
            gameStatesById[gameId].fast_fields[xIndex1 + 1][yIndex1][xIndex2 + 1][yIndex2] != 0 &&
            gameStatesById[gameId].fast_fields[xIndex1][yIndex1][xIndex1 + 1][yIndex1] != 0 &&
            gameStatesById[gameId].fast_fields[xIndex2][yIndex2][xIndex2 + 1][yIndex2] != 0
        ) {
            score += 1;
        }

        /* Decrease number of available fields. */
        gameStatesById[gameId].occupiedLines--;

        /* Updating players score */
        if (gamesById[gameId].player1 == msg.sender) {
            gameStatesById[gameId].player1Score += score;
        } else {
            gameStatesById[gameId].player2Score += score;
        }


        /* Make the move, in a sense of moving term swapping. */
        _makeMove(gameId, score > 0);

        GameMove(
            gameId,
            msg.sender,
            stringToBytes32(
                msg.sender == gamesById[gameId].player1?
                    gamesById[gameId].player1Alias
                    : gamesById[gameId].player2Alias
            ),
            xIndex1,
            yIndex1,
            xIndex2,
            yIndex2,
            score > 0
        );

        /* Finally, check that the game haven't ended yet. */
        if (getNumberOfLeftMoves(gameId) == 0) {

            _finishGame(gameId, gameStatesById[gameId].determineWinner());

            GameEnded(gameId, gamesById[gameId].winner, stringToBytes32(gamesById[gameId].winnerName), gamesById[gameId].winner == 0? true: false);
        }
    }


    /*
     * Helper public functions.
     */


    /*
     * Returns all info about one game by it's id.
     *
     * bytes32 gameId - ID of the game, to get data from.
     */
    function getGameInfo(bytes32 gameId) public view returns (bytes32, bytes32, uint8, uint8, uint8, bool) {
        Game memory game = gamesById[gameId];
        return (
            stringToBytes32(game.player1Alias),
            stringToBytes32(game.player2Alias),
            game.sizeX,
            game.sizeY,
            game.numberOfPlayers,
            gameStatesById[gameId].isFirstPlayer
        );
    }


    /*
     * This helper function returns, the name and address, of
     *  of the player, who will move first;
     *
     * bytes32 gameId - ID of the game, to get first player info.
     */
    function getFirstPlayerInfo(bytes32 gameId) public view returns (address, bytes32) {
        Game memory game = gamesById[gameId];

        if (gameStatesById[gameId].firstPlayer == game.player1) {
            return (game.player1, stringToBytes32(game.player1Alias));
        } else {
            return (game.player2, stringToBytes32(game.player2Alias));
        }
    }

    /*
     * This helper function returns, the name and address, of
     *  of the player, who will move second;
     *
     * bytes32 gameId - ID of the game, to get second player info.
     */
    function getSecondPlayerInfo(bytes32 gameId) public view returns (address, bytes32) {
        Game memory game = gamesById[gameId];

        if (gameStatesById[gameId].firstPlayer == game.player1) {
            return (game.player2, stringToBytes32(game.player2Alias));
        } else {
            return (game.player1, stringToBytes32(game.player1Alias));
        }
    }


    /*
     * Will return true, if there is line by specified coordinates.
     *
     * bytes32 gameId - ID of the game, where we check the state.
     * uint8 xIndex1 - the x coordinate of first vertex on the game grid.
     * uint8 yIndex1 - the y coordinate of first vertex on the game grid.
     * uint8 xIndex2 - the x coordinate of second vertex on the game grid.
     * uint8 yIndex2 - the y coordinate of second vertex on the game grid.
     */
    function getStateByIndex(
        bytes32 gameId,
        uint8 xIndex1, uint8 yIndex1,
        uint8 xIndex2, uint8 yIndex2
    ) public view returns (bool) {
        return gameStatesById[gameId].getStateByIndex(xIndex1, yIndex1, xIndex2, yIndex2);
    }

    /*
     * Return number of `empty lines`(moves), that may be placed.
     *
     * bytes32 gameId - ID of the game, to get number of left moves.
     */
    function getNumberOfLeftMoves(bytes32 gameId) public view returns (uint) {
        return 144 - gameStatesById[gameId].getNumberOfMovesMade();
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
     * Modifiers.
     */


    /*
     * Throws if called by any account other than the player1 or player2.
     *
     * bytes32 gameId - ID of the game to check.
     */
    modifier onlyPlayers(bytes32 gameId) {
        require(gamesById[gameId].player1 == msg.sender || gamesById[gameId].player2 == msg.sender);
        _;
    }

    /*
     * Will throw, if game had ended.
     *
     * bytes32 gameId - ID of the game to check.
     */
    modifier notEnded(bytes32 gameId) {
        require(!gamesById[gameId].isEnded);
        _;
    }

    /*
     * Will throw, if game is closed for new connections;
     *
     * bytes32 gameId - ID of the game to check.
     */
    modifier notClosed(bytes32 gameId) {
        require(!gamesById[gameId].isClosed);
        _;
    }

    /*
     * Is opposite to the previous one.
     *  Will throw, if game is not closed for new connections;
     *
     * bytes32 gameId - ID of the game to check.
     */
    modifier isClosed(bytes32 gameId) {
        require(gamesById[gameId].isClosed);
        _;
    }
}