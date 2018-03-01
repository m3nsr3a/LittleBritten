let TwoPlayerGame = artifacts.require("./TwoPlayerGame.sol");

module.exports = function(deployer) {
    deployer.deploy(TwoPlayerGame);
};