/**
 * GameLogic object, that is a `thin` wrapper for the renderer class.
 *
 * Since our game logic, is located on smart contracts, this class is only in charge
 *  of handling events, that are connected to drawing operations.
 *
 * What it does, is provides thin wrapper for the renderer class, and manages state of
 *  the game. Also it holds configuration for the current game.
 */
class GameLogic {

    /**
     * The default constructor for the GameLogic object.
     *
     * options.width - Number of squares in the horizontal direction.
     * options.height - Number of squares in the vertical direction.
     * options.numPlayers - Number of players in the game.
     * options.svgId - Unique name of the HTML element, that will hold the graphics.
     * options.application - The reference to Application object.
     */
    constructor(options) {

        /* Represents players in the game. */
        this._players = [];

        /* Index that points to the current player in players. */
        this._curPlayer = 0;

        /* Index that points to `us` as a player in the player array. */
        this._us = 0;
        this._other = 1;

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

        this._curPlayer = options.firstPlayerIndex;

        /* Show current player. */
        this.notifyPlayer();
    }

    /**
     * Figure out who won the game and display the winner.
     *
     * This function, is called exclusively, on the Ethereum ledger callback `GameEnd`.
     */
    announceWinner(winnerName, isATie) {

        /*
         * It's either somebody surrendered, or the game really ended.
         *
         * Since on frontend we also keep track of players game status,
         *  we definitely can say, who really won the game
         */
        if (!this.announceWinnerIsPossible) {
            console.log("Somebody is surrendering.");
            if (winnerName.toString() === this.ourPlayer.name.toString()) {
                GameLogic.displayWinnerOnSurrender(this.ourPlayer, false);
            } else {
                GameLogic.displayWinnerOnSurrender(this.otherPlayer, true);
            }

        } else {
            console.log("This time, game came to it's logical conclusion.");

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

            console.log('Below are winner names. Check that they are the same.');
            console.log(winnerName);
            console.log(highScoreTies);
            console.log(highScorePlayer);
            console.log("Check if it' a tie");
            console.log(isATie);
            if (highScoreTies.length > 0) {
                GameLogic.displayWinner({player: highScoreTies, isATie: true});
            } else {
                GameLogic.displayWinner({player: highScorePlayer, isATie: false});
            }
        }
    }

    /**
     * Triggered, when the game is over, when user returns to start screen.
     */
    stop() {
        /* First, clear up the player array. */
        this._players.length = 0;

        /* Then zero-out some game-specific parameters. */
        this._curPlayer = 0;
        this._occupiedSquares = 0;

        /* Finally, clear all the graphic elements, and return them to inital state. */
        this.renderer.dispose();
        GameLogic.restoreOriginalGameDOM();
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
            GameLogic.showAlert('Warning!', "You can't claim already claimed line!");
            return;
        }

        if (this.curPlayerId !== this.ourIndex) {
            GameLogic.showAlert('Warning!', "It's not your turn, to make move!");
            return;
        }

        if (this.isWaitingForConformation) {
            GameLogic.showAlert('Warning!', "Can't make new move, because waiting for conformation!");
            return;
        }

        /*
         * If, we are here, we try to claim the line.
         * So, we call the function on the contract.
         */

        this.possilbeClaim = lineObject;
        console.log('We are claiming this line.');
        console.log(this.possilbeClaim);
        this.options.application.makeSomeMove(
            lineObject.vertex1.x, lineObject.vertex1.y,
            lineObject.vertex2.x, lineObject.vertex2.y,
        );

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
    drawLine(vertex1, vertex2, moveOwner, hadScored) {
        console.log(vertex1);
        console.log(vertex2);
        console.log(moveOwner);
        console.log(this.curPlayerObject.name);
        /* Get the line, we are trying to draw by the coordinate. */
        let line = this.renderer.getLine(vertex1, vertex2);
        console.log(line);
        console.log(hadScored);
        if (!line.owner) {

            /*
             * At this point we can have 3 situations:
             *      1) We either tried to claim the line before and are waiting for drawing
             *          event to confirm our claim.
             *      2) We receive other player drawing event.
             *      3) We receive other player drawing event, when we haven got our drawing event yet.
             */

            if (this.possilbeClaim != null) {
                /* 1 and 3 goes here. */
                console.log(this.possilbeClaim);

                if (this.curPlayerObject.name === moveOwner) {
                    /*
                     * That means, we are drawing our previous move.
                     *
                     * However, just check one more time, that it's indeed `that` move.
                     */
                    if (this.possilbeClaim === line) {

                        /* If it's indeed that one, clear helper vars and complete the drawing. */
                        this.possilbeClaim = null;
                        this._isWaitingForConformation = false;

                        console.log("1'st case");

                    } else {
                        console.log('Looks like something strange had happened.');
                        console.log('Line came: ' + vertex1.toString() + '-' + vertex2.toString());
                        console.log('Line claimed: ' + this.possilbeClaim.toString());
                        return;
                    }
                } else {
                    /* That means it's number 3. */

                    console.log("3'rd case - bad situation.");
                }
            } else {
                /* 2 goes here -> just draw the line. */

                console.log("2'nd case.");
            }

            this._completeTurn(line, moveOwner, hadScored);

        } else {
            console.log('Looks like we got drawing event from the past, since this line is already owned.');
            console.log('Line ' + vertex1.toString() + '-' + vertex2.toString() + ' is already claimed');
        }
    }

    /**
     * Frontend logic, for counting `completed` squares.
     */
    _completeTurn(line, moveOwner, hadScored) {

        /*
         * Claims a line in the name of the specified player and checks
         * for box completion by said player.
         */

        if (this.players[this.curPlayerId].name === moveOwner) {
            line.claimOwnership(this.players[this.curPlayerId]);
        } else {
            console.log('Looks like 3rd case to me');
        }

        let score = this.checkBoxes(line);
        console.log('The current player score for this move is: ' + score);
        if (score > 0) {

            this._occupiedSquares += score;
            this.players[this.curPlayerId].score += score;
        } else {
            this.togglePlayer();
        }

        /*
         * The drawing is complete now for some player ->
         *      - Update the player status.
         *      - Update the GUIs.
         *      - Check, that the game had really ended.
         */

        this.notifyPlayer();

        this.options.application.$waitScreen.hide();
        this.options.application.$gameScreen.show();

        if (this.occupiedSquares === this.options.width * this.options.height) {
            this._anounceWinnerIsPossible = true;
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
            let topTop = this.renderer.getLine([lineX1, lineY1 - 1], [lineX2, lineY2 - 1]);
            let topLeft = this.renderer.getLine([lineX1, lineY1 - 1], [lineX1, lineY1]);
            let topRight = this.renderer.getLine([lineX2, lineY2 - 1], [lineX2, lineY2]);

            if (topTop && topTop.isOwned &&
                topLeft && topLeft.isOwned &&
                topRight && topRight.isOwned) {
                this.renderer.squares[topLeft.vertex1.y][topLeft.vertex1.x].claimOwnership(line.owner);
                score++;
            }

            // bottom square
            let bottomBottom = this.renderer.getLine([lineX1, lineY1 + 1], [lineX2, lineY2 + 1]);
            let bottomLeft = this.renderer.getLine([lineX1, lineY1], [lineX1, lineY1 + 1]);
            let bottomRight = this.renderer.getLine([lineX2, lineY2], [lineX2, lineY2 + 1]);

            if (bottomBottom && bottomBottom.isOwned &&
                bottomLeft && bottomLeft.isOwned &&
                bottomRight && bottomRight.isOwned) {
                this.renderer.squares[line.vertex1.y][line.vertex1.x].claimOwnership(line.owner);
                score++;
            }
        }

        // check squares to the left and right of the line
        else {

            // left square
            let leftLeft = this.renderer.getLine([lineX1 - 1, lineY1], [lineX2 - 1, lineY2]);
            let leftTop = this.renderer.getLine([lineX1 - 1, lineY1], [lineX1, lineY1]);
            let leftBottom = this.renderer.getLine([lineX2 - 1, lineY2], [lineX2, lineY2]);

            if (leftLeft && leftLeft.isOwned &&
                leftTop && leftTop.isOwned &&
                leftBottom && leftBottom.isOwned) {
                this.renderer.squares[leftTop.vertex1.y][leftTop.vertex1.x].claimOwnership(line.owner);
                score++;
            }

            // right square
            let rightRight = this.renderer.getLine([lineX1 + 1, lineY1], [lineX2 + 1, lineY2]);
            let rightTop = this.renderer.getLine([lineX1, lineY1], [lineX1 + 1, lineY1]);
            let rightBottom = this.renderer.getLine([lineX2, lineY2], [lineX2 + 1, lineY2]);

            if (rightRight && rightRight.isOwned &&
                rightTop && rightTop.isOwned &&
                rightBottom && rightBottom.isOwned) {
                this.renderer.squares[line.vertex1.y][line.vertex1.x].claimOwnership(line.owner);
                score++;
            }
        }

        return score;
    }


    /* Helper methods for the class. */


    /**
     * Change the player.
     */
    togglePlayer() {

        this._curPlayer++;
        this._curPlayer %= this.options.numPlayers;
    }

    /**
     * Notifies the current player that it's their turn.
     */
    notifyPlayer() {
        GameLogic.displayCurrentPlayer(this.players[this.curPlayerId]);
    }

    /**
     * Creates the array of players for the game.
     */
    buildPlayers(playerInfo) {

        for (let i = 0; i < this.options.numPlayers; i++) {

            this.players[i] = playerInfo[i];
            this.players[i].index = i;
            this.players[i].score = 0;
            this.players[i].color = GameLogic.getPlayerColor(this.options.numPlayers, i);

        }
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
     * Same as displayWinner, callback, however this function is called, when other player surrendered.
     *
     * player - Player object, that won the game.
     * weSurrendered - true, if the one who surrendered in the game is us.
     */
    static displayWinnerOnSurrender(player, weSurrendered) {
        /*
         * Hide the player naming label, surrender button, and game itself. */
        document.getElementById('current-player-display').setAttribute('style', 'display: none;');
        document.getElementById('surrender-game').setAttribute('style', 'display: none;');
        document.getElementById('game-board').setAttribute('style', 'display: none;');

        /* Then update the winner DOM and show the return to menu button. */
        let winnerNameDOM = document.getElementById('winner-name');
        let winnerTextDOM = document.getElementById('winner-text');

        if (weSurrendered) {
            winnerTextDOM.innerHTML = 'Why did you gave up? The win was so close.';
        } else {
            winnerTextDOM.innerHTML = 'Looks like other player had give up on this game.';
        }
        winnerNameDOM.textContent = player.name;
        winnerNameDOM.setAttribute('style', 'color: ' + player.color + ';');


        document.getElementById('winner-display').setAttribute('style', 'display: block;');
        document.getElementById('back-to-menu').setAttribute('style', 'display: block;');
    }

    /**
     * Shows the winner of the game.
     *
     * player - Player object, that represents the winner.
     * isATie - is true, when there are no winners(In such case player object is discarded).
     */
    static displayWinner(player, isATie) {

        /* Hide the player naming label, surrender button, and game itself. */
        document.getElementById('current-player-display').setAttribute('style', 'display: none;');
        document.getElementById('surrender-game').setAttribute('style', 'display: none;');
        document.getElementById('game-board').setAttribute('style', 'display: none;');

        let winnerNameDOM = document.getElementById('winner-name');
        let winnerTextDOM = document.getElementById('winner-text');

        if (isATie) {
            winnerTextDOM.innerHTML = 'Looks like a tie. Play one more?';
            winnerNameDOM.innerHTML = '';
        } else {
            winnerTextDOM.innerHTML = 'And we have a winner.';
            winnerNameDOM.setAttribute('style', 'color: ' + player.color + ';');
            winnerNameDOM.textContent = player.name;
        }

        document.getElementById('winner-display').setAttribute('style', 'display: block;');
        document.getElementById('back-to-menu').setAttribute('style', 'display: block;');
    }

    /**
     * Restores DOM, to state, where it was, before the game had started.
     *  Will be called, when we return from game to menu.
     */
    static restoreOriginalGameDOM() {
        document.getElementById('current-player-display').setAttribute('style', 'display: block;');
        document.getElementById('surrender-game').setAttribute('style', 'display: block;');
        document.getElementById('game-board').setAttribute('style', 'display: block;');

        document.getElementById('winner-display').setAttribute('style', 'display: none;');
        document.getElementById('back-to-menu').setAttribute('style', 'display: none;');

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

    get otherPlayer() {
        return this._players[this._other];
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

