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

    /* Game logic object. Doesn't have any  */
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

        this.gameLogic = new Game({

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

            return App.bindGameEvents();

        });

        return App.bindEvents();
    },

    /**
     * Bind all event's, to their callbacks.
     */
    bindEvents: function () {


        /* Represents input form. */
        App.$gameToJoinTable = $('#opponents-table');


        /* Start screen holder. */
        App.$startScreen = $('div[data-role="start"]');
        /* Game screen holder. */
        App.$gameScreen = $('div[data-role="game"]');
        /* Wait screen holder. */
        App.$waitScreen = $('div[data-role="wait"]');
        /* WaitForGame screen holder. */
        App.$waitForGameScreen = $('div[data-role="wait-for-game"]');

        /* As of jQuery v1.8, such $(document).on( "ready", handler ) support has been deprecated. */
        $('#account-select').on('click', App.getMyAccounts);
        $('#create-game').on('click', App.createNewGame);
        $('#join').on('click', App.joinSomeGame);
        $('.closeGameButton').on('click', App.closeThisGame);

        /*
         * We update the `Open Games` table each 5 seconds.
         */
        setInterval(App.getOpenGames, 5000)

    },

    bindGameEvents: function () {

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

            /*
             * This events, are a little `different`, from previous ones.
             *  We don't need all of them, so we attach filters on top of them.
             */

            // meta.GameJoined()
            //     .watch(
            //         (error, logs) => {
            //             /* Finally, set the game running, and present it onto the screen. */
            //             let options = {};
            //             options.playerInfo = [];
            //
            //             let player_1 = {};
            //             player_1.name = '';
            //
            //             options.playerInfo.push(player_1);
            //
            //             this.gameLogic.start(options);
            //
            //         }
            //     );
            //
            // meta.GameEnded()
            //     .watch(
            //         (error, logs) => {
            //
            //         }
            //     );
            //
            // meta.GameMove()
            //     .watch(
            //         (error, logs) => {
            //
            //         }
            //     );
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
                                    .text('Game size is: ' + App.gameHigth + ' x ' + App.gameWidth);
                                App.$waitForGameScreen
                                    .find('#actual-number-of-players')
                                    .text('Game for ' + App.numberOfPlayers + 'people.');
                                App.$waitForGameScreen
                                    .find('#actual-game-id')
                                    .text('This game ID is: ' + App.currentGameId);
                                App.$waitForGameScreen // #ToDo This will require fix later.
                                    .find('#actual-number-of-connected-players')
                                    .text('Current number of connected players is: ' + 1);

                                App.$startScreen.hide();
                                App.$waitForGameScreen.show();
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
     * If we are on the game screen, and decided to close our game(i.e. if nobody is coming),
     *  this function is triggered.
     *
     * It will remove game, from open games list(on the Ethereum ledger).
     *  However, we are going to return to main screen, only after we receive
     *  the closing event, that is connected to our game.
     *
     *
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
                        console.log(log);
                        console.log('Insede filter');
                        if (!err) {
                            console.log('Insede filter1');
                            console.log(App.ourAddress);
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
     *
     */
    joinSomeGame: function (event) {
        event.preventDefault();

        let meta;
        App.contracts.StickGame.deployed().then(function (instance) {
            meta = instance;

            let asyncJoinGame;

            if (App.isInjected) {
                asyncJoinGame = App.promisify(meta.joinGame);
            } else {
                asyncJoinGame = meta.joinGame;
            }
            console.log(event.target.options[event.target.selectedIndex].text);
            return asyncJoinGame(/* Game id we decided to join. */);

        }).then(function (joinedGameParams) {

        }).catch(function (err) {

            alert('Cannot join some game.');
            console.log(err.message);

        });
    }
};