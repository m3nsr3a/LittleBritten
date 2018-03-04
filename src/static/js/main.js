App = {

    /**
     * Js implementation of Python zip function, with the feature
     *  of passing custom `concatenator`.
     */
    zipListsWith: (f, xss) =>
        (xss.length ? xss[0] : [])
            .map(function (_, i) {
                return f(xss.map(function (xs) {
                    return xs[i];
                }));
            }),

    /**
     * Weird hack, that turns `noodle-callback` function,
     *  into promise.
     *
     * It's really simple implementation, so it doesn't
     *  work for functions with multiple parameters.
     */
    promisify:
            func =>
                    options =>
                        new Promise((resolve, reject) => {
                            func(options, function cb(err, val) {
                                return err ? reject(err) : resolve(val);
                            });
                        }),

    /* Represents the provider, that injected web3js instance. */
    web3Provider: null,

    /* List of attached contracts. */
    contracts: {},

    /* GameLogic logic object. Doesn't have any  */
    gameLogic: null,

    /**
     * The entry point of our application.
     */
    init: function () {

        /*
         * Currently we hard-code couple of parameters,
         * since there is no really support for them, yet.
         */
        App.gameWidth = 8;
        App.gameHigth = 8;
        App.numberOfPlayers = 2;

        /* First, init the game logic object. */

        App.gameLogic = new GameLogic({

            /* Currently we don't support dynamic grid, and more than 2 players, but anyways. */
            width: 8,
            height: 8,
            numPlayers: 2,
            svgId: 'game-board',
            application: App,

        });

        return App.initWeb3();
    },

    /**
     * This functions creates the connection eth-test ledger(either straight, or through MetaMask).
     */
    initWeb3: function () {

        /*
         * In case web3.js is injected by MetaMask, we have a bug, using TruffleContracts.
         *
         * More context here: https://github.com/trufflesuite/truffle-contract/issues/70
         *
         */
        App.isInjected = false;

        /* Is there an injected web3 instance, like one from MetaMask, we are going to use it. */
        if (typeof web3 !== 'undefined') {
            App.isInjected = true;

            App.web3Provider = web3.currentProvider;
        } else {
            // If no injected web3 instance is detected, fall back to Ganache.
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
        }
        // We use the latest version, so we need to write code like this.
        this.web3 = new Web3(App.web3Provider);

        return App.isInjected? App.initContractsWeb3(): App.initContractsTruffle();
    },

    /**
     * Get info(like ABI) from build contracts using Truffle, to simplify usage.
     */
    initContractsTruffle: function () {
        console.log('Using Truffle contract-wrapper.');
        /* We only need this one?, since it encapsulates all other methods. */
        $.getJSON('build/contracts/StickGame.json', function (data) {
            // Get the necessary contract artifact file and instantiate it with truffle-contract
            App.contracts.StickGame = TruffleContract(data);

            // Set the provider for our contract
            App.contracts.StickGame.setProvider(App.web3Provider);

            // Use our contract to retrieve and mark the adopted pets
            // return App.markAdopted();
        });

        return App.bindEvents();
    },

    /**
     * Get contract the hard way using Web3 js.
     */
    initContractsWeb3: function () {
        console.log('We are falling back to naked Web3.js');
        $.getJSON('build/contracts/StickGame.json', function (data) {

            let networks = data["networks"];
            let address = '';

            for (let key in networks) {
                if (networks.hasOwnProperty(key)) {
                    address = networks[key]['address'];
                    break;
                }
            }

            App.contractAddress = address;

            App.contracts.StickGame = TruffleContract(data);
            App.contracts.StickGame.setProvider(App.web3Provider);

            let contractArtifact = App.contracts.StickGame;
            App.contracts.StickGame = web3.eth.contract(contractArtifact.abi);
            App.contracts.StickGame = App.contracts.StickGame.at(App.contractAddress);

            /*
             * As soon as we get the contact, update the table
             *  of open games once, without waiting for timer.
             *
             * Same goes for contract info.
             */
            App.getOpenGames();
            $('#account-select').trigger('click');

            return App.bindGeneralPurposeEvents();

        });

        return App.bindEvents();
    },

    /**
     * Bind DOM related event's, to their callbacks.
     */
    bindEvents: function () {


        /* Represents input form. */
        App.$gameToJoinTable = $('#opponents-table');

        /* Start screen holder. */
        App.$startScreen = $('div[data-role="start"]');
        /* GameLogic screen holder. */
        App.$gameScreen = $('div[data-role="game"]');
        /* Wait screen holder. */
        App.$waitScreen = $('div[data-role="wait"]');
        /* WaitForGame screen holder. */
        App.$waitForGameScreen = $('div[data-role="wait-for-game"]');

        /* As of jQuery v1.8, such $(document).on( "ready", handler ) support has been deprecated. */
        App.$gameToJoinTable.on('click', App.joinSomeGame);

        $('#account-select').on('click', App.getMyAccounts);
        $('#create-game').on('click', App.createNewGame);
        $('#close-game').on('click', App.closeThisGame);
        $('#surrender-game').on('click', App.surrenderThisGame);
        $('#back-to-menu').on('click', App.cleanUpAndReturn);

        /*
         * We update the `Open Games` table each 5 seconds.
         */
        setInterval(App.getOpenGames, 5000)

    },

    /**
     * Bind general purpose events, that are not related to any specific game.
     */
    bindGeneralPurposeEvents: function () {

        let meta = App.contracts.StickGame;

        /*
         * When we get this event, everything we do, is we append
         *  to list of open games, the id data we received, in case it wasn't there already.
         */
        meta.GameInitialized()
            .watch(
                (err, logs) => {
                    if (!err) {
                        console.log('We got general game initialized event.');
                        /* If there is no such game handle already, append it to. */
                        if (App.$gameToJoinTable.find(`tr[data-value="${logs.args['gameId']}"]`).length === 0) {
                            App.$gameToJoinTable
                                .find('> tbody')
                                .append($('<tr>')
                                    .append(
                                        [
                                            logs.args['player1Alias'],
                                            logs.args['boardSizeX'],
                                            logs.args['boardSizeY'],
                                            logs.args['numberOfPlayers'],
                                            logs.args['player1MovesFirst'],
                                        ].map(
                                            (field) =>
                                                $('<td>')
                                                    .append(
                                                        typeof field === "string" ?
                                                            web3.toAscii(field)
                                                            : typeof field === "boolean" ?
                                                            field ?
                                                                "First move is ours."
                                                                : "Other player goes first."
                                                            : field.c[0]
                                                    )
                                        )
                                    )
                                    .attr('data-value', logs.args['gameId'])
                                );
                            console.log('Adding ' + logs.toString());
                        } else {
                            console.log('Not adding ' + logs.toString());
                        }
                    } else {
                        console.log("Some error occurred, while processing GameInitialized event.");
                        console.log(err.toString());
                    }
                }
            );

        meta.GameClosed()
            .watch(
                (err, logs) => {
                    if (!err) {
                        App.$gameToJoinTable.find(`tr[data-value="${logs.args['gameId']}"]`).remove();

                        console.log('Removing from table ' + logs.toString());
                    } else {
                        console.log("Some error occurred, while processing GameClosed event.");
                        console.log(err.toString());
                    }
                }
            );
    },

    /**
     * Bind game events, whose content is related to one game.
     *
     * isForeignGame - represents, if this game is the one we created, or if we join a game.
     */
    bindGameSpecificEvents: function (isForeignGame ) {
        /*
         * This events, are a little `different`, from previous ones.
         *  We don't need all of them, so we attach filters on top of them.
         */

        let meta = App.contracts.StickGame;

        /*
         * If we joined a game, we don't need this logic.
         *
         * Actually this is a quick fix, need to repair it later.
         */
        if (!isForeignGame) {
            let ourGameJoinFilter = meta.GameJoined(
                {gameId: App.currentGameId}, {address: App.contractAddress, fromBlock: 0, toBlock: 'latest'}
            );

            ourGameJoinFilter
                .watch(
                    (err, logs) => {
                        if (!err) {
                            /* First, extract the missing data, to start the game. */

                            App.enemyName = web3.toAscii(logs.args['player2Alias']);

                            /* Finally, set the game running, and present it onto the screen. */
                            App.gameLogic.start(App.buildGameInfo());

                            App.$waitForGameScreen.hide();
                            App.$gameScreen.show();
                            ourGameJoinFilter.stopWatching();

                        } else {
                            console.log("Some error occurred, while processing GameJoined event.");
                            console.log(err.toString());
                        }
                    }
                );
        }

        let ourGameEndedFilter = meta.GameEnded(
            {gameId: App.currentGameId}, {address: App.contractAddress, fromBlock: 0, toBlock: 'latest'}
        );
        let ourGameMoveFilter = meta.GameMove(
            {gameId: App.currentGameId}, {address: App.contractAddress, fromBlock: 0, toBlock: 'latest'}
        );

        ourGameEndedFilter
            .watch(
                (err, logs) => {
                    if (!err) {
                        /*
                         * If we are here, somebody either surrendered, or the game come to it's logical
                         *  end. In any case just process this fact.
                         */

                        App.gameLogic.announceWinner(web3.toAscii(logs.args['winnerName']));
                        ourGameEndedFilter.stopWatching();
                        /* After receiving `GameEnd` event, we also stop watching for movements events. */
                        ourGameMoveFilter.stopWatching();

                    } else {
                        console.log("Some error occurred, while processing GameEnded event.");
                        console.log(err.toString());
                    }
                }
            );

        ourGameMoveFilter
            .watch(
                (err, logs) => {
                    if (!err) {
                        /*
                         * Everything is simple. We only process the draw calls, that are given to us.
                         *  Since all logic is on Smart-Contract -> parse parameters and
                         *  make a draw call.
                         */



                    } else {
                        console.log("Some error occurred, while processing GameMove event.");
                        console.log(err.toString());
                    }
                }
            );
    },

    /**
     * Shows all accounts that belong to this user, on attached ledger.
     */
    getMyAccounts: function (event) {

        event.preventDefault();

        web3.eth.getAccounts(function (error, listOfAccounts) {

            if (error) {
                $(event.target).setContent("Some problem occurred while loading addresses.");
                console.log(error);
            }

            $(event.target)
                .find('option')
                .remove()
                .end()
                .append(
                    listOfAccounts.map(n => `<option value="${n}">${n}</option>`)
                );

            App.ourAddress = listOfAccounts[0];
        });
    },

    /**
     * Represents callback to event of getting currently open games.
     *  Will go to Ethereum ledger, and get all the list there.
     *
     * Note, that the outcome of this function is going to be affected by
     *  game event `GameClosed`.
     */
    getOpenGames: function () {

        let meta = App.contracts.StickGame;
        meta.getOpenGameIds.call(function (error, listOfOpenGames) {

            if (error) {
                $(event.target).setContent("Some problem occurred while loading addresses.");
                console.log(error);
            }

            console.log('Below is list of open games.');
            console.log(listOfOpenGames);

            let tableBodyDOM = App.$gameToJoinTable.find('> tbody');

            tableBodyDOM.find('> tr')
                .not(':first')
                .remove();

            tableBodyDOM.append(
                App.zipListsWith(
                    (list) => {
                        let a = list[0];
                        list.splice(list.indexOf(a), 1);
                        return $('<tr>')
                            .append(list.map((field) =>
                                $('<td>')
                                    .append(
                                        typeof field === "string" ?
                                            web3.toAscii(field)
                                            :typeof field === "boolean" ?
                                                field ?
                                                    "First move is ours."
                                                    :"Other player goes first."
                                                :field.c[0]
                                    )
                            ))
                            .attr('data-value', a);
                    },
                    listOfOpenGames
                ));

        });
    },

    /**
     * This function creates the game, and launches it on the screen.
     *
     * Player, won't be able to play tough, until somebody connects to his game.
     */
    createNewGame: function (event) {
        event.preventDefault();

        App.ourName = $('#nick-name').val();
        if (App.ourName.length === 0) {
            Alert.warning("Please type your nickname.");
            return;
        }

        let meta = App.contracts.StickGame;


        /*
         * This looks like a terrible thing. If you call the contract method without .call here,
         *  you get only one value back.
         */
        meta.initGame(App.ourName, App.gameWidth, App.gameHigth, App.numberOfPlayers, (err, currentTransactionHash) => {

            if (err) {
                Alert.warning("Big error", 'Some internal problem occurred while processing game creating call.');
                console.log(err.message);
                return;
            }

            /*
             * So after sending the transaction, we begin to wait for event, that game was created.
             *  We create filter, that starts looking for `GameInitialized` event, which was fired,
             *  from our address, in transaction block >= that the one, where the initGame function
             *  was triggered.
             *
             * When we fin it, we remove the filter, and change screens.
             */

            web3.eth.getTransaction(currentTransactionHash, (err, answer) => {

                if (err) {
                    Alert.warning("Internal error", 'Some internal problem occurred while parsing transaction info.');
                    console.log(err.message);
                    return;
                }

                let filter = meta.GameInitialized(
                    {address: App.contractAddress, fromBlock: answer.blockNumber, toBlock: 'latest'}
                );

                filter.watch(
                    (err, log) => {
                        if (!err) {
                            if (log.args['player1Address'] === App.ourAddress) {
                                console.log('Here comes our latest game initialized event -> proceed to waiting screen');

                                App.weMoveFirst = log.args['player1MovesFirst'];
                                App.currentGameId = log.args['gameId'];

                                /* Update and show waiting screen, until somebody connects to our game. */
                                $('#actual-player-nick-name')
                                    .text('Player name: ' + App.ourName);
                                App.$waitForGameScreen
                                    .find('#actual-moving-statement')
                                    .text(App.weMoveFirst? 'First movements is ours, Yay.': "We didn't got firs step.");
                                App.$waitForGameScreen
                                    .find('#actual-game-size')
                                    .text('GameLogic size is: ' + App.gameHigth + ' x ' + App.gameWidth);
                                App.$waitForGameScreen
                                    .find('#actual-number-of-players')
                                    .text('GameLogic for ' + App.numberOfPlayers + 'people.');
                                App.$waitForGameScreen
                                    .find('#actual-game-id')
                                    .text('This game ID is: ' + App.currentGameId);
                                App.$waitForGameScreen // #ToDo This will require fix later.
                                    .find('#actual-number-of-connected-players')
                                    .text('Current number of connected players is: ' + 1);

                                App.$startScreen.hide();
                                App.$waitForGameScreen.show();
                                App.bindGameSpecificEvents(false);
                                filter.stopWatching();
                            }
                        } else {
                            Alert.warning("Internal error", 'Error while filtering for GameInitialised event.');
                            console.log(err.message);
                        }
                    }
                );
            });
        });

    },

    /**
     * If we are on the waiting for game screen, and decided to close our game(i.e. if nobody is coming),
     *  this function is triggered.
     *
     * It will remove game, from open games list(on the Ethereum ledger).
     *  However, we are going to return to main screen, only after we receive
     *  the closing event, that is connected to our game.
     */
    closeThisGame: function (event) {

        event.preventDefault();

        let meta = App.contracts.StickGame;

        meta.closeGame(App.currentGameId, function (err, currentTransactionHash) {
            if (err) {
                Alert.warning("Warning", "Some problem occurred while closing the game.");
                console.log(err.message);
            }

            /* First, we triggered the closing event -> now wait till it will really be closed. */
            web3.eth.getTransaction(currentTransactionHash, (err, answer) => {
                if (err) {
                    Alert.warning("Internal error", 'Some internal problem occurred while parsing transaction info.');
                    console.log(err.toString());
                    return;
                }

                let filter = meta.GameClosed(
                    {address: App.contractAddress, fromBlock: answer.blockNumber}
                );

                filter.watch(
                    (err, log) => {
                        if (!err) {
                            if (log.args['playerAddress'] === App.ourAddress) {
                                console.log('Here comes our latest game closed event -> proceed to game screen');

                                App.$waitForGameScreen.hide();
                                App.$startScreen.show();
                                filter.stopWatching();
                            }
                        } else {
                            Alert.warning("Internal error", 'Error while filtering for GameClosed event.');
                            console.log(err.message);
                        }
                    }
                )
            });
        });
    },

    /**
     * If we are on the game screen, and don't want to play anymore,
     *  one may press, the surrender button, and this callback will be triggered.
     *
     * This will trigger GameEnd event. However logic, that will handle the drawing
     *  lies in some other place(wow, such good code design, mmm).
     */
    surrenderThisGame: function (event) {

        event.preventDefault();

        let meta = App.contracts.StickGame;

        meta.surrender(App.currentGameId, function (err, ) {

            if (err) {
                Alert.warning("Warning", "Some problem occurred while we were trying to give up on the game.");
                console.log(err.message);
            }
        });
    },

    /**
     * This callback is triggered, when we decide to connect to some game.
     *  The request is issued to the ledger, and
     */
    joinSomeGame: function (event) {
        event.preventDefault();

        /*
         * First, get the data from the event.
         *  (WTF is that?)
         */
        let containingTrDOM = $(event.target).parent();
        const currentGameId = containingTrDOM.attr('data-value');
        if (typeof currentGameId === 'undefined') {
            return;
        }

        App.currentGameId = currentGameId;

        let children = containingTrDOM[0].children;
        App.enemyName = children[0].innerText;
        App.gameWidth = children[1].innerText;
        App.gameHigth = children[2].innerText;
        App.numberOfPlayers = children[3].innerText;

        /* Get the nick-name. */
        App.ourName = $('#nick-name').val();
        if (App.ourName.length === 0) {
            Alert.warning("Please type your nickname.");
            return;
        }

        let meta = App.contracts.StickGame;

        meta.joinGame(App.currentGameId, App.ourName, (err, currentTransactionHash) => {
            if (err) {
                Alert.warning("Big error", 'Some internal problem occurred while processing game joining call.');
                console.log(err.message);
                return;
            }

            web3.eth.getTransaction(currentTransactionHash, (err, answer) => {
                if (err) {
                    Alert.warning("Internal error", 'Some internal problem occurred while parsing transaction info.');
                    console.log(err.message);
                    return;
                }

                let filter = meta.GameJoined(
                    {player2: App.ourAddress},
                    {address: App.contractAddress, fromBlock: answer.blockNumber - 1, toBlock: 'latest'}
                );

                filter.watch(
                    (err, ) => {
                        if (!err) {
                            console.log('In event.');

                            /*
                             * If we are here, that means, we really had connected to the game.
                             *
                             * Since we in reality only work with two players, get all info about our game,
                             *  bind game specific callbacks and proceed to playing screen.
                             */

                            meta.getGameInfo.call(App.currentGameId, (error, gameInfo) => {

                                if (error) {
                                    Alert.warning("Warning", "Some problem occurred while acquiring game info.");
                                    console.log(error);
                                }

                                console.log(gameInfo);

                                /* bool for movement. and nick-name in bytes format. */
                                App.weMoveFirst = !gameInfo[5]; // Player1 moves first. Currently we are second player.
                                App.enemyName = web3.toAscii(gameInfo[0]);

                                App.gameLogic.start(App.buildGameInfo());
                                App.bindGameSpecificEvents(true);
                                App.$startScreen.hide();
                                App.$gameScreen.show();

                            });

                            filter.stopWatching();
                        } else {
                            Alert.warning("Internal error", 'Error while filtering for GameJoined event.');
                            console.log(err.message);
                        }
                    }
                );
            });
        });
    },

    /**
     * Called, when user decides to play one more game,
     *  after he is done with the previous one.
     */
    cleanUpAndReturn: function (event) {
        // App.$gameScreen.hide();
        // App.$startScreen.show();
    },

    /**
     * This is preliminary player building function,
     *  that assembles together all player info.
     */
    buildGameInfo: function () {
        return {
            playerInfo: [
                {name: App.ourName,},
                {name: App.enemyName,}
            ],
            gameId: App.currentGameId,
            firstPlayerIndex: App.weMoveFirst? 0: 1,
        };
    }
};