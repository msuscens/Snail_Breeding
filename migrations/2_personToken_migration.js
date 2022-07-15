const { deployProxy } = require('@openzeppelin/truffle-upgrades')

const PersonToken = artifacts.require("PersonToken")

const PERSON_TOKEN_NAME = "Person"
const PERSON_TOKEN_SYMBOL = "PSN"


module.exports = async function (deployer, network, accounts) {

    // Deploy the PersonToken (proxy & logic)
    await deployProxy(
        PersonToken, 
        [
            PERSON_TOKEN_NAME,
            PERSON_TOKEN_SYMBOL
        ],
        {deployer, initializer: 'init_PersonToken', from: accounts[0]}
    )
}
