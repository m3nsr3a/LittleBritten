module.exports = {
    networks: {
        development: {
            host: 'localhost',
            port: 8545,
            network_id: '*' // Match any network id
        }
        // rinkeby: {
        //     gasPrice: 800000000000, // 80 gwei,
        //     provider: provider,
        //     network_id: 3,
        //     from: address
        // }
    }
};
