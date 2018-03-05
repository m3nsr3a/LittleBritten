# LittleBritten

> Small game that uses Ethereum ledger to store states and ensure that players don't cheat.  

## Table Of Contents
1. [TL;DR](#tldr)
2. [Deadlines](#deadlines)
5. [Implementation Details](#implementation-details)
6. [How-to Use](#how-to-use)
7. [ToDo Log](#todo-log)

## [TL;DR](#table-of-contents)

* one
* Two

## [Deadlines](#table-of-contents)

|       Date      | Maximum possible mark |
| :-------------: | :-------------------: |
| 2359 5-th March |         10.0          |
| 0000 6-th March |         0.0           |


## [Implementation Details](#table-of-contents)

## Installing the application to an Ethereum network
Truffle commands helps you to install the contracts to a network. In this project it's slightly different but more useful. You can either use `npm run migrate` or alternatively if truffle is installed globally you can `truffle migrate` directly with the following arguments. These configurations can be updated by modifying the `./truffle-config.js`

`--network`: name of the network you want to deploy to. You can use `rinkeby` or `mainnet` depends on which one you would like to deploy the contract.

`--accessToken`: Deployment is using [infura](https://infura.io/) to deploy the contract. In order to deploy the contract you need to create an account, obtain the access token, and pass as an argument.

`--mnemonic`: 12 word mnemonic for the deployment account. Your account must have enough ether to cover the gas cost.

```
npm run migrate -- --network <<network>> --accessToken <<token>> --mnemonic <<12 word mnemonic>>
```


## [How-to Use](#table-of-contents)

In order to start everything, a little bit of preparations are required:

1. Since I tried to make the game, as most user-friendly as possible, 
    we are using __MetaMask__, to communicate with game. Or more precisely, we 
    need MetaMask's _web3.js_ instance, to easily confirm our transactions, 
    that we send to our test net.
    
    So in order, for everything to work correctly, follow this steps:
    
    * Download [Google Chrome](https://www.google.ru/chrome/index.html) browser.
    * Install the [MetaMask](http://metamask.io/) browser extension.
    * The icon will show in the _top-right_ corner of the browser(where other extensions are).
    * Click on it, and create account.
    * Click the menu that shows "Main Network" and select `Localhost 8545`.
2. Install the `docker` thing.
    * Do `curl https://get.docker.com/ | sh` in the terminal, 
        if you are under some Linux distro.(In other case, look [here](https://docs.docker.com/install/))
    * Install [pip3]() for __python3__ and run `sudo pip3 install docker-compose`.
3. Then, at long last, let's run _dis_ game.
    * Assuming you have __git__ run in terminal `git clone https://github.com/NumenZ/LittleBritten`,
        or, well, just somehow get the code part of current project.
    * Now, we need to get a small information from our meta-mask account, in order for us, to launch test-net correctly:
        * Press on ellipsis(_3 dots_), under the
        literally -- `TAG="info_from_your_buffer"`.
        * Do, the same, but now for '' parameter. However here, not forget to attach `0x` 
            to the beginning of your input(literally -- `TAG="0xINFO_FROM_YOUR_BUFFER"`.).  
    * Finally, run `docker-compose up --build`.
4. As a last step, open your __Google Chrome__ browser at 'http://localhost:8545', and _enjoy the game_. 

## [ToDo Log](#table-of-contents)

- [x] __0.2 points__ - Write simple working example, with simple _web-server_ and _fronted_.

- [ ] __0.4 points__  - Implement the game, with nice GUIs and _Smart-Contracts_ backing up the logic.

- [ ] __0.6 points__  - Write _tests_ for the _Smart-Contracts_ code.

- [x] __0.8 points__  - Make all configuration as simple as possible, using `Docker`, `MetaMask`, _file-serving_, etc.

- [x] __1.0 point__ - Write this `ReadMe.md` with all explanations.