/**
 * GameLogic object, that is a `thin` wrapper for the renderer class.
 *
 * Since our game logic, is located on smart contracts, this class is only in charge
 *  of handling events, that are connected to drawing operations.
 *
 * What it does, is provides thin wrapper for the renderer class, and manages state of
 *  the game. Also it holds configuration for the current game.
 */
class Game {

    /**
     * The default constructor for the GameLogic object.
     *
     * options.width - Number of squares in the horizontal direction.
     * options.height - Number of squares in the vertical direction.
     * options.numPlayers - Number of players in the game.
     * options.svgId - Unique name of the HTML element, that will hold the graphics.
     */
    constructor(options) {

        /* Represents players in the game. */
        this._players = [];

        /* Index that points to the current player in players. */
        this._curPlayer = 0;

        /* Index that points to `us` as a player in the player array. */
        this._us = 0;

        /* Number of squares, that are occupied. */
        this._occupiedSquares = 0;

        /* If on, that means we are waiting for some move conformation on the ledger. */
        this._isWaitingForConformation = false;

        /* Is true, when the game came to it's logical end. */
        this._anounceWinnerIsPossible = false;

        /* Object, that makes the actual drawing happens. */
        this._renderer = new Renderer(this, options.svgId, options.width, options.height);

        /* Parameters of the current game. */
        this._options = options;

        if (typeof(options.width) !== 'number' || options.width < 1) {
            throw "Width must be at least 1.";
        }

        if (typeof(options.height) !== 'number' || options.height < 1) {
            throw "Height must be at least 1.";
        }

        if (typeof(options.numPlayers) !== 'number' || options.numPlayers < 2) {
            throw "There must be at least 2 player in the game.";
        }

        if (typeof(options.svgId) !== 'string' || options.svgId.length < 1) {
            throw "The id of the HTML SVG element must be specified.";
        }

        if (typeof(options.application) !== 'object') {
            throw "The application object wasn't passed.";
        }

    }

    /**
     * Starts the game, for the configuration provided.
     */
    start(options) {

        if (typeof(options.playerInfo) !== 'object') {
            throw "The information about player is not provided.";
        }

        /* Create the players array, from the provided information. */
        this.buildPlayers(options.playerInfo);

        /* Draw the underlying graphics. */
        this.renderer.init();
        this.renderer.draw();

        /* Show current player. */
        this.notifyPlayer();
    }

    /**
     * Is called, then the player is pressing on the line.
     *
     * We check, that it's current user turn.
     *  - If it is, and such move is possible -> send the event to net, for it to recheck again.
     *  - It it's not, show alert.
     */
    completeTurn(lineObject) {

        if (lineObject.owner) {
            this.showAlert('Warning!', "You can't claim already claimed line!");
            return;
        }

        if (this.curPlayerId !== this.ourIndex) {
            this.showAlert('Warning!', "It's not your turn, to make move!");
            return;
        }

        if (this.isWaitingForConformation) {
            this.showAlert('Warning!', "Can't make new move, because waiting for conformation!");
            return;
        }

        /*
         * If, we are here, we try to claim the line.
         * So, we call the function on the contract.
         */

        this.possilbeClaim = lineObject;
        // ToDo: call to eth.

        /*
         * Since it takes time, we are going to wait.
         * We wont draw anything yet, just show, that we are waiting for something.
         */

        this._isWaitingForConformation = true;

        this.options.application.$gameScreen.hide();
        this.options.application.$waitScreen.show();
    }

    /**
     * This function is called, when we get event, MakeMove from the Ethereum ledger,
     *  that belongs to our gameId.
     *
     * So, we check:
     *  - If it was somebody else move -> draw it straightaway(since smart-contracts don't lie).
     *  - It it was our move -> continue, where we left.
     */
    drawLine(xCoordinate, yCoordinate, moveOwner) {

        /* Get the line, we are trying to draw by the coordinate. */
        let line = this.renderer.getLine(xCoordinate, yCoordinate);

        if (this.curPlayerObject.internalId === moveOwner) {

            this._completeTurn(line);

            /* And, since the other player made the move, we can make ours. */

            this.options.application.$waitScreen.hide();
            this.options.application.$gameScreen.show();

        } else {
            /*
             * That means, we are drawing our previous move.
             *
             * However, just check one more time, that it's indeed `that` move.
             */

            if (this.possilbeClaim === line) {


                this.possilbeClaim = null;
                this._isWaitingForConformation = false;

                this._completeTurn(line);

            } else {
                console.log('Looks like we got some drawing event from the past.');
                return;
            }
        }

        this.togglePlayer();

        // Let the current player know that it's their turn.
        this.notifyPlayer();

        /* Finally, we check, that the game is already complete. */
        if (this.occupiedSquares === this.options.width * this.options.height) {
            this._anounceWinnerIsPossible = true;
        }
    }

    /**
     * Change the player.
     */
    togglePlayer() {

        this._curPlayer++;
        this._curPlayer %= this.options.numPlayers;
    }


    /* Inner methods of the class. */

    /**
     * Figure out who won the game and display the winner.
     *
     * This function, is called exclusively, on the Ethereum ledger callback `GameEnd`.
     */
    announceWinner() {

        if (this.announceWinnerIsPossible) {
            console.log("This time, game came to it's logical conclusion");
        } else {
            console.log("Something strange happened with the game");
        }

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

        if (highScoreTies.length > 0) {
            this.displayWinner({player: highScoreTies, isATie: true});
        } else {
            this.displayWinner({player: highScorePlayer, isATie: false});
        }
    }

    /**
     * Frontend logic, for counting `completed` squares.
     */
    _completeTurn(line) {

        let score = this.claimLine(this.players[this.curPlayerId], line);

        if (score > 0) {

            this._occupiedSquares += score;
            this.players[this.curPlayerId].score += score;
        }
    }

    /**
     * Public: Claims a line in the name of the specified player and checks
     * for box completion by said player.
     */
    claimLine(player, line) {

        line.claimOwnership(player);
        return this.checkBoxes(line);
    }


    /**
     * Notifies the current player that it's their turn.
     */
    notifyPlayer() {
        this.displayCurrentPlayer(this.players[this.curPlayerId]);
    }

    /**
     * Creates the array of players for the game.
     */
    buildPlayers(playerInfo) {

        for (let i = 0; i < this.options.numPlayers; i++) {

            this.players[i] = playerInfo[i];
            this.players[i].index = i;
            this.players[i].score = 0;
            this.players[i].color = Game.getPlayerColor(this.options.numPlayers, i);

        }
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


    /* Static methods for this class. */


    /**
     * Shows the player, that is moving right now.
     *
     * player - Player object, that represents the person, who currently is making decision.
     */
    static displayCurrentPlayer(player) {

        let playerNameDOM = document.getElementById('player-name');

        playerNameDOM.setAttribute('style', 'color: ' + player.color + ';');
        playerNameDOM.textContent = player.name;

        document.getElementById('current-player-display').setAttribute('style', 'display: block;');
    }

    /**
     * Shows the winner of the game.
     *
     * player - Player object, that represents the winner.
     * isATie - is true, when there are no winners(In such case player object is discarded).
     */
    static displayWinner(player, isATie) {

        /* Hide the player naming label, since no more steps. */
        document.getElementById('current-player-display').setAttribute('style', 'display: none;');

        let winnerNameDOM = document.getElementById('winner-name');

        if (isATie) {
            winnerNameDOM.innerHTML = 'Looks like a tie. Play one more?';
        } else {
            winnerNameDOM.setAttribute('style', 'color: ' + player.color + ';');
            winnerNameDOM.textContent = player.name;
        }
        document.getElementById('winner-display').setAttribute('style', 'display: block;');
    }

    /**
     * This function generates "evenly spaced" colours.
     * From here: http://stackoverflow.com/questions/1484506/random-color-generator-in-javascript.
     *
     * numOfSteps and step - Additional parameters, that bing additional entropy to color creation.
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
     * Shows nice alert, with some custom text inside.
     */
    static showAlert(messageName, messageContents) {
        Alert.warning(messageName, messageContents, {displayDuration: 0});
    }


    /* Getter functions for this class. */

    get isWaitingForConformation() {
        return this._isWaitingForConformation;
    }

    get ourIndex() {
        return this._us;
    }

    get ourPlayer() {
        return this._players[this._us];
    }

    get players() {
        return this._players;
    }

    get options() {
        return this._options;
    }

    get curPlayerId() {
        return this._curPlayer;
    }

    get curPlayerObject() {
        return this._players[this._curPlayer];
    }

    get occupiedSquares() {
        return this._occupiedSquares;
    }

    get renderer() {
        return this._renderer;
    }

    get announceWinnerIsPossible() {
        return this._anounceWinnerIsPossible;
    }

}

