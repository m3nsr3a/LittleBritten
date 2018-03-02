let StickGame = artifacts.require("./StickGame.sol");

module.exports = function(deployer) {
    deployer.deploy(StickGame);
};