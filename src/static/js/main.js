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

        $.getJSON('build/contracts/StickGame.json', function (data) {

            let networks = data["networks"];
            let address = '';

            for (let key in networks) {
                if (networks.hasOwnProperty(key)) {
                    address = networks[key]['address'];
                }
            }

            App.contracts.StickGame = TruffleContract(data);
            App.contracts.StickGame.setProvider(App.web3Provider);

            let contractArtifact = App.contracts.StickGame;
            App.contracts.StickGame = web3.eth.contract(contractArtifact.abi);
            const contractInstance = new Promise(function(resolve, reject) {
                resolve(App.contracts.StickGame.at(address));
            });
            App.contracts.StickGame = { deployed: () => contractInstance};

            /*
             * As soon as we get the contact, update the table
             *  of open games once, without waiting for timer.
             */
            App.getOpenGames();

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
        $('#address-input').on('click', App.getOpenGames);
        $('#create-game').on('click', App.createNewGame);
        $('#join').on('click', App.joinSomeGame);
        $('.closeGameButton').on('click', App.closeThisGame);

        /*
         * We update the `Open Games` table each 5 seconds.
         */
        setInterval(App.getOpenGames, 5000)
    },

    bindGameEvents: function () {

        let meta;
        App.contracts.StickGame.deployed().then(function (instance) {
            meta = instance;

            /*
             * When we get this event, everything we do, is we append
             *  to list of open games, the id data we received, in case it wasn't there already.
             */
            meta.GameInitialized()
                .watch(
                    (er, logs) => {

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
                                                            :typeof field === "boolean" ?
                                                                field ?
                                                                    "First move is ours."
                                                                    :"Other player goes first."
                                                                :field.c[0]
                                                    )
                                        )
                                    )
                                    .attr('data-value', logs.args['gameId'])
                                );
                            console.log('Adding ' + logs.toString());
                        } else {
                            console.log('Not adding ' + logs.toString());
                        }

                    }
                );

            meta.GameClosed()
                .watch(
                    (er, logs) => {
                        App.$gameToJoinTable.find(`tr[data-value="${logs.args['gameId']}"]`).remove();

                        console.log('Removing from table ' + logs.toString());
                    }
                );


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
        });

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

        let meta;
        App.contracts.StickGame.deployed().then(function (instance) {
            meta = instance;

            let asyncGetOpenGameIds;

            if (App.isInjected) {
                asyncGetOpenGameIds = App.promisify(meta.getOpenGameIds);
            } else {
                asyncGetOpenGameIds = meta.getOpenGameIds;
            }

            return asyncGetOpenGameIds.call();

        }).then(function (listOfOpenGames) {

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

        }).catch(function (err) {

            Alert.warning("Warning", "Some problem occurred while loading open games.");
            console.log(err.message);

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

        let meta;
        App.contracts.StickGame.deployed().then(function (instance) {
            meta = instance;

            meta.initGame(App.ourName, App.gameWidth, App.gameHigth, App.numberOfPlayers, (err, currentGameParams) => {

                if (err) {
                    Alert.warning("Big error", 'Some internal problem occurred while processing game creating call.');
                    console.log(err.message);
                    return;
                }

                App.currentGameId = currentGameParams[0];
                App.weMoveFirst = currentGameParams[1];

                /* Update and show waiting screen, until somebody connects to our game. */

                $('#actual-player-nick-name')
                    .text(App.ourName);
                App.$waitForGameScreen
                    .find('#actual-moving-statement')
                    .text(App.weMoveFirst? 'First movements is ours, Yay': "We didn't got firs step.");
                App.$waitForGameScreen
                    .find('#actual-game-size')
                    .text(App.gameHigth + ' x ' + App.gameWidth);
                App.$waitForGameScreen
                    .find('#actual-number-of-players')
                    .text(App.numberOfPlayers);
                App.$waitForGameScreen
                    .find('#actual-game-id')
                    .text(App.currentGameId);

                App.$startScreen.hide();
                App.$waitForGameScreen.show();

            });

        }).catch(function (err) {

            Alert.warning("Warning", 'Cannot create new game.');
            console.log(err.message);

        });
    },

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
    },

    closeThisGame: function (event) {

        event.preventDefault();

        let meta;
        App.contracts.StickGame.deployed().then(function (instance) {
            meta = instance;

            let asyncCloseGame;

            if (App.isInjected) {
                asyncCloseGame = App.promisify(meta.closeGame);
            } else {
                asyncCloseGame = meta.closeGame;
            }

            asyncCloseGame(App.currentGameId);

        }).catch(function (err) {

            Alert.warning("Warning", "Some problem occurred while closing the game.");
            console.log(err.message);

        });
    }
};