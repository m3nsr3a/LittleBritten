App = {

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

    /* The entry point of our application. */
    init: function () {

        /* First, init the game logic object. */

        this.gameLogic = new Game({

            /* Currently we don't support dynamic grid, and more than 2 players, but anyways. */
            width: 8,
            height: 8,
            numPlayers: 2,
            boardId: 'game-board',

        });

        return App.initWeb3();
    },

    /* This functions creates the connection eth-test ledger(either straight, or through MetaMask). */
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

    /*
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

    /*
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

        });

        return App.bindEvents();
    },

    /* Bind all event's, to their callbacks. */
    bindEvents: function () {

        /* Register callbacks for button pressing events. */
        const $createGame = $('#create-game');
        const $join = $('#join');

        /* Represents input form. */
        const $accountSelect = $('#account-select');
        const $addressInput = $('#address-input');

        /* Start screen holder. */
        App.$startScreen = $('div[data-role="start"]');
        /* Game screen holder. */
        App.$gameScreen = $('div[data-role="game"]');

        $(document).on('click', '.btn-adopt', App.handleAdopt);

        /* As of jQuery v1.8, such $(document).on( "ready", handler ) support has been deprecated. */
        $accountSelect.on('click', App.getMyAccounts);
        $addressInput.on('click', App.getOpenGames);

        $createGame.on('click', App.createNewGame);

        return App.startGame();
    },

    /* Finally, set the game running. */
    startGame: function () {

        // this.gameLogic.start();

    },

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
    
    getOpenGames: function (event) {

        event.preventDefault();

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
            $(event.target)
                .find('option')
                .remove()
                .end()
                .append(
                    listOfOpenGames
                        .map(n => web3.toAscii(n))
                        .map(n => `<option value="${this.web3.toAscii(n)}">${n}</option>`)
                );

        }).catch(function (err) {

            $(event.target).setContent("Some problem occurred while loading open games.");
            console.log(err.message);

        });
    },


    createNewGame: function (event) {
        event.preventDefault();

        let meta;
        App.contracts.StickGame.deployed().then(function (instance) {
            meta = instance;

            let asyncInitGame;

            if (App.isInjected) {
                asyncInitGame = App.promisify(meta.initGame);
            } else {
                asyncInitGame = meta.initGame;
            }

            return asyncInitGame.call();

        }).then(function (currentGameParams) {

            this.gameLogic.numPlayers = 1;

            /* Finally, show the game screen. */

            App.$startScreen.hide();
            App.$gameScreen.show();

        }).catch(function (err) {

            alert('Cannot create new game.');
            console.log(err.message);

        });
    },
};