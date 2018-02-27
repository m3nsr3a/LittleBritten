let TwoPlayerGame = artifacts.require("./TwoPlayerGame.sol");
let StickGame = artifacts.require("./StickGame.sol");

module.exports = function(deployer) {
    deployer.deploy(TwoPlayerGame);
    deployer.deploy(StickGame);
};
