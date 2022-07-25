
const SnailToken = artifacts.require("SnailToken")

const SNAIL_TOKEN_NAME = "Snail"
const SNAIL_TOKEN_SYMBOL = "SNL"


module.exports = async function (deployer, network, accounts) {

    deployer.deploy(SnailToken, SNAIL_TOKEN_NAME, SNAIL_TOKEN_SYMBOL)
    console.log("Deployed SnailToken.")
}
