/**
 * Game --
 * Main entrypoint to the "Dots and Boxes" game. Provides public methods to
 * start a game and to complete a turn (the latter is ordinarily called by a
 * Line's onclick event handler.) Game handles scoring and interfaces with the
 * UI via user-defined callbacks.
 *
 * Constructor Input:
 *   - An object containing configuration information for the game. Some are
 *     required and some are optional. The following options can be set:
 *
 *     width (required) - number of squares in the horizontal direction
 *     height (required) - number of squares in the vertical direction
 *     numPlayers (required) - number of players in the game
 *     boardId (required) - HTML ID of the gameboard's SVG element
 *     getPlayerData (required) - user-defined callback that retrieves information
 *                                about each player
 *     displayCurrentPlayer (optional) - user-defined callback that displays the
 *                                       current player
 *     displayWinner (optional) - user-defined callback that displays the winner
 *                                when the game ends (if there is a winner)
 *     displayTie (optional) - user-defined callback that displays the results of
 *                             a tie
 */
class Game {

    constructor(options) {

        // Private: Represents players in the game.
        this._players = [];

        // Private: Index pointing to the current player in players.
        this._curPlayer = 0;

        // Once this adds up to the total number of squares, we declare a winner
        // (or maybe a tie?)
        this._totalScore = 0;

        // Private: The game board.
        this._renderer = null;

        // Private: Optional callback that displays information about the current player.
        this._displayCurrentPlayer = false;

        // Private: Optional callback that announces the winner.
        this._displayWinner = false;

         // Private: Optional callback that announces a tie.
        this._displayTie = false;

        this._options = options;

        /*************************************************************************/

        if (typeof(options.width) !== 'number' || options.width < 1) {
            throw "width must be at least 1";
        }

        if (typeof(options.height) !== 'number' || options.height < 1) {
            throw "height must be at least 1";
        }

        if (typeof(options.numPlayers) !== 'number' || options.numPlayers < 2) {
            throw "numPlayers must be set and must be an integer greater than or equal to 2";
        }

        if (typeof(options.boardId) !== 'string' || options.boardId.length < 1) {
            throw "the id of the gameboard's SVG tag must be specified";
        }

        this._renderer = new Renderer(this, options.boardId, options.width, options.height);
    }


    getPlayerData(playerNum) {

        let player = {};

        switch (playerNum) {

            case 1:
                player.name = 'Red';
                break;

            case 2:
                player.name = 'Blue';
                break;

            default:
                player.name = 'John Doe';
                break;
        }

        return player;
    }

    // Callback that displays the current player.
    displayCurrentPlayer(player) {

        let playerName = document.getElementById('player-name');

        playerName.setAttribute('style', 'color: ' + player.color + ';');
        playerName.textContent = player.name;

        document.getElementById('current-player-display').setAttribute('style', 'display: block;');
    }

    /**********************************************************/

    // Callback that announces the winner.
    displayWinner(player) {

        // hide current player label
        document.getElementById('current-player-display').setAttribute('style', 'display: none;');

        // set and display winner
        let winnerName = document.getElementById('winner-name');
        winnerName.setAttribute('style', 'color: ' + player.color + ';');
        winnerName.textContent = player.name;
        document.getElementById('winner-display').setAttribute('style', 'display: block;');
    }

    /**********************************************************/

    // Callback that announces a tie. The Game object supports
    // an arbitrary number of players, but this callback is
    // written specifically for two players.
    displayTie(players) {

        // hide current player label
        document.getElementById('current-player-display').setAttribute('style', 'display: none;');

        // set and display tie message
        document.getElementById('winner-display').innerHTML = 'Ah, shucks... Looks like it was a tie!';
        document.getElementById('winner-display').setAttribute('style', 'display: block;');
    }

    /**
     * Private: This function generates vibrant, "evenly spaced" colours (i.e.
     * no clustering). This is ideal for creating easily distinguishable vibrant
     * markers in Google Maps and other apps.
     * Adam Cole, 2011-Sept-14
     * HSV to RBG adapted from:
     * http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
     * And I (James Colannino) stole this from:
     * http://stackoverflow.com/questions/1484506/random-color-generator-in-javascript
     */
    static getPlayerColor(numOfSteps, step) {

        let r, g, b;
        let h = step / numOfSteps;
        let i = ~~(h * 6);
        let f = h * 6 - i;
        let q = 1 - f;

        switch(i % 6) {
            case 0: r = 1, g = f, b = 0; break;
            case 1: r = q, g = 1, b = 0; break;
            case 2: r = 0, g = 1, b = f; break;
            case 3: r = 0, g = q, b = 1; break;
            case 4: r = f, g = 0, b = 1; break;
            case 5: r = 1, g = 0, b = q; break;
        }

        return "#" + ("00" + (~ ~(r * 255)).toString(16)).slice(-2) +
            ("00" + (~ ~(g * 255)).toString(16)).slice(-2) + ("00" +
                (~ ~(b * 255)).toString(16)).slice(-2);
    }

    /**
     * Private: Retrieves information for each player in the game. Calls a
     * user-supplied method for retrieving the player's data.
     */
    getPlayers() {

        for (let i = 0; i < this.options.numPlayers; i++) {

            this.players[i] = this.options.getPlayerData(i + 1);
            this.players[i].index = i;
            this.players[i].score = 0;
            this.players[i].color = Game.getPlayerColor(this.options.numPlayers, i);

        }
    }

    /**
     * Private: notifies the current player that it's their turn.
     */
    notifyPlayer() {

        // If we were given a callback, use it to display information about the
        // current player
        if (this.displayCurrentPlayer) {
            this.displayCurrentPlayer(this.players[this.curPlayer]);
        }
    }

    /**
     * Private: Increments the current player.
     */
    togglePlayer() {

        this._curPlayer++;
        this._curPlayer %= this.options.numPlayers;
    }

    /**
     * Private: Figure out who won the game and announce the good news!
     */
    announceWinner() {

        let i;
        let highScoreTies = [];
        let highScorePlayer = this.players[0];

        // figure out the highest scoring player
        for (i = 0; i < this.players.length; i++) {

            if (this.players[i].score > highScorePlayer.score) {
                highScorePlayer = this.players[i];
            }
        }

        // figure out if there are any ties
        for (i = 0; i < this.players.length; i++) {
            if (this.players[i].score === highScorePlayer.score &&
                this.players[i].index !== highScorePlayer.index) {
                highScoreTies.push(this.players[i]);
            }
        }

        // Uh oh, there were ties!
        if (highScoreTies.length > 0 && this.displayTie) {
            this.displayTie(highScoreTies);
        }

        // Annnnd, we have a winner!
        else if (this.displayWinner) {
            this.displayWinner(highScorePlayer);
        }
    }

    /**
     * Public: Starts the game.
     */
    start(options) {

        // Required callback that provides the game with information about a player.
        if (typeof(options.getPlayerData) !== 'function') {
            throw "getPlayerData must be set and must be a function";
        }

        if (typeof(options.displayCurrentPlayer) !== 'undefined') {
            if ('function' === typeof(options.displayCurrentPlayer)) {
                this._displayCurrentPlayer = options.displayCurrentPlayer;
            } else {
                throw "displayCurrentPlayer must be a function";
            }
        }

        if (typeof(options.displayWinner) !== 'undefined') {
            if ('function' === typeof(options.displayWinner)) {
                this._displayWinner = options.displayWinner;
            } else {
                throw "displayWinner must be a function";
            }
        }

        if (typeof(options.displayTie) !== 'undefined') {
            if ('function' === typeof(options.displayTie)) {
                this._displayTie = options.displayTie;
            } else {
                throw "displayTie must be a function";
            }
        }

        console.log(this.options.numPlayers);

        this.getPlayers();
        this.board.init();
        this.board.draw();

        // Let the first player know that it's their turn.
        this.notifyPlayer();
    }

    /**
     * Public: Called whenever the current player clicks on a line segment.
     * This completes that player's turn.
     */
    completeTurn(line) {

        let score = this.board.claimLine(this.players[this.curPlayer], line);

        if (score > 0) {

            this._totalScore += score;
            this.players[this.curPlayer].score += score;

            // Check to see if all the squares have been filled in
            if (this.totalScore === this.options.width * this.options.height) {
                this.announceWinner();
                return;
            }
        }

        // move on to the next player if a square wasn't completed
        else {
            this.togglePlayer(this.players[this.curPlayer]);
        }

        // Let the current player know that it's their turn.
        this.notifyPlayer();
    }


    /**
     * Private: Checks whether or not any boxes were completed. If so, they're
     * marked as completed by the specified player. Returns number of newly
     * completed squares.
     */
    checkBoxes(line) {

        let lineX1 = line.vertex1.x;
        let lineY1 = line.vertex1.y;
        let lineX2 = line.vertex2.x;
        let lineY2 = line.vertex2.y;

        let score = 0;

        // check squares on the top and bottom of the line
        if ('horizontal' === line.getType) {

            // top square
            let topTop = this.getLine([lineX1, lineY1 - 1], [lineX2, lineY2 - 1]);
            let topLeft = this.getLine([lineX1, lineY1 - 1], [lineX1, lineY1]);
            let topRight = this.getLine([lineX2, lineY2 - 1], [lineX2, lineY2]);

            if (topTop && topTop.isOwned &&
                topLeft && topLeft.isOwned &&
                topRight && topRight.isOwned) {
                this.squares[topLeft.vertex1.y][topLeft.vertex1.x].claimOwnership(line.owner);
                score++;
            }

            // bottom square
            let bottomBottom = this.getLine([lineX1, lineY1 + 1], [lineX2, lineY2 + 1]);
            let bottomLeft = this.getLine([lineX1, lineY1], [lineX1, lineY1 + 1]);
            let bottomRight = this.getLine([lineX2, lineY2], [lineX2, lineY2 + 1]);

            if (bottomBottom && bottomBottom.isOwned &&
                bottomLeft && bottomLeft.isOwned &&
                bottomRight && bottomRight.isOwned) {
                this.squares[line.vertex1.y][line.vertex1.x].claimOwnership(line.owner);
                score++;
            }
        }

        // check squares to the left and right of the line
        else {

            // left square
            let leftLeft = this.getLine([lineX1 - 1, lineY1], [lineX2 - 1, lineY2]);
            let leftTop = this.getLine([lineX1 - 1, lineY1], [lineX1, lineY1]);
            let leftBottom = this.getLine([lineX2 - 1, lineY2], [lineX2, lineY2]);

            if (leftLeft && leftLeft.isOwned &&
                leftTop && leftTop.isOwned &&
                leftBottom && leftBottom.isOwned) {
                this.squares[leftTop.vertex1.y][leftTop.vertex1.x].claimOwnership(line.owner);
                score++;
            }

            // right square
            let rightRight = this.getLine([lineX1 + 1, lineY1], [lineX2 + 1, lineY2]);
            let rightTop = this.getLine([lineX1, lineY1], [lineX1 + 1, lineY1]);
            let rightBottom = this.getLine([lineX2, lineY2], [lineX2 + 1, lineY2]);

            if (rightRight && rightRight.isOwned &&
                rightTop && rightTop.isOwned &&
                rightBottom && rightBottom.isOwned) {
                this.squares[line.vertex1.y][line.vertex1.x].claimOwnership(line.owner);
                score++;
            }
        }

        return score;
    }

    /**
     * Public: Claims a line in the name of the specified player and checks
     * for box completion by said player.
     */
    claimLine(player, line) {

        line.claimOwnership(player);
        return this.checkBoxes(line);
    }


    get players() {
        return this._players;
    }

    get options() {
        return this._options;
    }

    get curPlayer() {
        return this._curPlayer;
    }

    get totalScore() {
        return this._totalScore;
    }

    get displayCurrentPlayer() {
        return this._displayCurrentPlayer;
    }

    get displayWinner() {
        return this._displayWinner;
    }

    get displayTie() {
        return this._displayTie;
    }

    get board() {
        return this._renderer;
    }

}

