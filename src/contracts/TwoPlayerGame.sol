pragma solidity ^0.4.19;


/*
 *
 */
contract TwoPlayerGame {


    /*
     * Constructor.
     */


    /*
     * Initialise this entity.
     */
    function TwoPlayerGame() {
        openGamesByIdHead = 'end';
    }


    /*
     * Events.
     */


    /*
     * This event is triggered, when the game was closed for joining.
     *
     * bytes32 gameId - id of the game, that was closed.
     * address player - address of the player, that closed the game.
     */
    event GameClosed(bytes32 indexed gameId, address indexed player);

    /*
     * This event is triggered, when the game had ended.
     *
     * bytes32 gameId - id of the game, that had ended.
     */
    event GameEnded(bytes32 indexed gameId);


    /*
     * Variables.
     */


    /* Represent one game. */
    struct Game {
        /* Addresses of players engaged in current game. */
        address player1;
        address player2;

        /* Real-name(NickNames) of players in the game. */
        string player1Alias;
        string player2Alias;

        /* The address of the player, who moves next. Initially is set to the first-player. */
        address nextPlayer;

        /* True, if the game have ended. */
        bool isEnded;

        /* If the game have ended, the game have a winner -> stores winner address. */
        address winner;
    }

    /* All games, that ever happened. */
    mapping (bytes32 => Game) public gamesById;

    /*
     * Currently open games, represented as linked list(LL).
     * Head, represents, the `head` of the list -> the most new object.
     *
     * Open as `open for joining` == `lack second player`.
     */
    mapping (bytes32 => bytes32) public openGamesById;
    bytes32 public openGamesByIdHead;


    /*
     * Core public functions.
     */


    /*
     * Close a game, if it may be closed -> notify about it.
     *
     * bytes32 gameId - the id of the closing game.
     */
    function closePlayerGame(bytes32 gameId) public {
        /* Get the Game object from global mapping. */
        var game = gamesById[gameId];

        /* game already started and not finished yet. */
        if (game.player2 != 0 && !game.isEnded) {
            throw;
        }

        /* Game can be closed only be involved players. */
        if (msg.sender != game.player1 && msg.sender != game.player2) {
            throw;
        }

        /* If game was open -> close it. */
        removeGameFromOpenGames(gameId);

        GameClosed(gameId, msg.sender);
    }

    /*
     * This function creates the game itself.
     *
     * string player1Alias - NickName of the player that creates the game.
     * bool isFirst - if true, this player will go first.
     */
    function initGame(string player1Alias, bool isFirst) public returns (bytes32) {

        /* Generate game id based on player's addresses and current block number. */
        bytes32 gameId = sha3(msg.sender, block.number);

        gamesById[gameId].isEnded = false;

        /* Set info about first player. */
        gamesById[gameId].player1 = msg.sender;
        gamesById[gameId].player1Alias = player1Alias;
        if (isFirst == true) {
            gamesById[gameId].nextPlayer = msg.sender;
        }

        /* Since the game became open -> add to openGamesById. */
        openGamesById[gameId] = openGamesByIdHead;
        openGamesByIdHead = gameId;

        return gameId;
    }

    /*
     * Join already existing game by id.
     *
     * bytes32 gameId - ID of the game to join.
     * string player2Alias - NickName of the player that wants to join the game.
     */
    function joinGame(bytes32 gameId, string player2Alias) public {

        /* First, check that game does't already have a second player. */
        if (gamesById[gameId].player2 != 0) {
            throw;
        }

        /* Then set the game details. */
        gamesById[gameId].player2 = msg.sender;
        gamesById[gameId].player2Alias = player2Alias;
        if (gamesById[gameId].nextPlayer == 0) {
            gamesById[gameId].nextPlayer = msg.sender;
        }

        /* Close game, since second player arrived -> remove from openGamesById. */
        removeGameFromOpenGames(gameId);
    }

    /*
     * Surrender the game. Notify that the game had ended.
     *
     * bytes32 gameId - Id of a game, in which sender want to surrender.
     */
    function surrender(bytes32 gameId) notEnded(gameId) public {
        /* If game have already ended -> trow. */
        if (gamesById[gameId].winner != 0) {
            throw;
        }

        /* Set up, the winner and loser. */
        if (gamesById[gameId].player1 == msg.sender) {
            /* player1 surrendered -> player2 won. */
            gamesById[gameId].winner = gamesById[gameId].player2;
        } else if(gamesById[gameId].player2 == msg.sender) {
            /* player2 surrendered -> player1 won. */
            games[gameId].winner = gamesById[gameId].player1;
        } else {
            /* Sender is'n related to this game. */
            throw;
        }

        /* Mark, that the game had ended. */
        gamesById[gameId].isEnded = true;

        GameEnded(gameId);
    }


    /*
     * Core inner functions.
     */


    /*
     * Inner function, that removes game from openGamesById LL.
     *
     * bytes32 gameId - ID of the game to remove from LL.
     */
    function removeGameFromOpenGames(byte32 gameId) internal {
        if (openGamesByIdHead == gameId) {
            /* If is head -> detach it, and zero-out. */
            openGamesByIdHead = openGamesById[openGamesByIdHead];
            openGamesById[gameId] = 0;
        } else {
            /* Otherwise unroll the LL, until needed, zero-out the element, relink the list. */
            for (var g = openGamesByIdHead; g != 'end' && openGamesById[g] != 'end'; g = openGamesById[g]) {
                if (openGamesById[g] == gameId) {
                    openGamesById[g] = openGamesById[gameId];
                    openGamesById[gameId] = 0;
                    break;
                }
            }
        }
    }


    /*
     * Helper functions.
     */


    /*
     * Using small hack, return list of all currently open games.
     */
    function getOpenGameIds() constant returns (bytes32[]) {

        /* Count total number of different open games. */
        var counter = 0;
        for (var ga = openGamesByIdHead; ga != 'end'; ga = openGamesById[ga]) {
            counter++;
        }

        /*
         * Create RAM array of gameIds.
         * Then unroll, the LL, storing information in the created array.
         */
        bytes32[] memory data = new bytes32[](counter);
        var currentGame = openGamesByIdHead;
        for (var i = 0; i < counter; i++) {
            data[i] = currentGame;
            currentGame = openGamesById[currentGame];
        }

        return data;
    }

    /*
     * Helper function, that checks if the game have ended.
     *
     * bytes32 gameId - ID of the game to check.
     */
    function isGameEnded(bytes32 gameId) public constant returns (bool) {
        return gamesById[gameId].isEnded;
    }


    /*
     * Modifiers.
     */


    /*
     * Will throw, if game had ended.
     *
     * bytes32 gameId - ID of the game to check.
     */
    modifier notEnded(bytes32 gameId) {
        if (gamesById[gameId].isEnded) {
            throw;
        }
        _;
    }
}