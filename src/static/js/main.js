App = {
    web3Provider: null,
    contracts: {},

    /* The entry point of our application, initializes all setting and starts graphics. */
    init: function () {
        // Handle graphics here

        return App.initWeb3();
    },

    /* This functions creates the connection eth-test ledger(either straight, or through MetaMask). */
    initWeb3: function () {
        // Is there an injected web3 instance, like one from MetaMask, we are going to use it.
        if (typeof this.web3 !== 'undefined') {
            App.web3Provider = web3.currentProvider;
        } else {
            // If no injected web3 instance is detected, fall back to Ganache.
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
        }
        // We use the latest version, so we need to write code like this.
        this.web3 = new Web3(App.web3Provider);

        return App.initContracts();
    },

    /* Get our deployed contracts, using Truffle, in order to call the later. */
    initContracts: function () {
        $.getJSON('build/contracts/Adoption.json', function (data) {
            // Get the necessary contract artifact file and instantiate it with truffle-contract
            App.contracts.Adoption = TruffleContract(data);

            // Set the provider for our contract
            App.contracts.Adoption.setProvider(App.web3Provider);

            // Use our contract to retrieve and mark the adopted pets
            return App.markAdopted();
        });

        return App.bindEvents();
    },


    bindEvents: function () {
        $(document).on('click', '.btn-adopt', App.handleAdopt);
    },

    markAdopted: function (adopters, account) {
        var adoptionInstance;

        App.contracts.Adoption.deployed().then(function (instance) {
            adoptionInstance = instance;

            return adoptionInstance.getAdopters.call();
        }).then(function (adopters) {
            for (i = 0; i < adopters.length; i++) {
                if (adopters[i] !== '0x0000000000000000000000000000000000000000') {
                    $('.panel-pet').eq(i).find('button').text('Success').attr('disabled', true);
                }
            }
        }).catch(function (err) {
            console.log(err.message);
        });
    },

    handleAdopt: function (event) {
        event.preventDefault();

        var petId = parseInt($(event.target).data('id'));

        var adoptionInstance;

        web3.eth.getAccounts(function (error, accounts) {
            if (error) {
                console.log(error);
            }

            var account = accounts[0];

            App.contracts.Adoption.deployed().then(function (instance) {
                adoptionInstance = instance;

                // Execute adopt as a transaction by sending account
                return adoptionInstance.adopt(petId, {from: account});
            }).then(function (result) {
                return App.markAdopted();
            }).catch(function (err) {
                console.log(err.message);
            });
        });
    }

};

$(function () {
    $(window).load(function () {
        App.init();
    });
});
