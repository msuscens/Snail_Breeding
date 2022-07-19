const { deployProxy } = require('@openzeppelin/truffle-upgrades')

const SnailToken = artifacts.require("SnailToken")

const SNAIL_TOKEN_NAME = "Snail"
const SNAIL_TOKEN_SYMBOL = "SNL"


module.exports = async function (deployer, network, accounts) {

    // Deploy the SnailToken (proxy & logic)
    await deployProxy(
        SnailToken, 
        [
            SNAIL_TOKEN_NAME,
            SNAIL_TOKEN_SYMBOL
        ],
        {deployer, initializer: 'init_SnailToken', from: accounts[0]}
    )
}
