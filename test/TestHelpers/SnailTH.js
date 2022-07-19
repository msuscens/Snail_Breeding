// Written by Mark Suscens, Copyright 2022, all rights reserved.

const truffleAssert = require("truffle-assertions")
const toBN = web3.utils.toBN

//Following constants are as set in PersonToken Smart Contract
const FERTILITY_BASE_PERCENTAGE = 80    
const MINIMUM_FERTILITY_PERCENTAGE = 5 

const Relationship = {None:0, ExPartner:1, Oneself:2, Mother:3, Father:4, Child:5, FullSibling:6, HalfSibling:7,
  GrandmotherOnMumsSide:8, GrandmotherOnDadsSide:9, GrandfatherOnMumsSide:10, GrandfatherOnDadsSide:11, 
  Grandchild:12, UncleAuntOnMumsSide:13, UncleAuntOnDadsSide:14, NephewNeice:15, GrandNephewNeice:16, 
  FirstCousin:17, FirstCousinOnceRemoved:18, FirstCousinTwiceRemoved:19}
Object.freeze(Relationship);

//Following constants are used by calcPseudoRandomTH
// MAX_RANDOM_DIGITS = 76 (as MAX_UINT256.length == 78, from which -2)
const MAX_UINT256 = toBN(2).pow(toBN(256)).subn(1) //115792089237316195423570985008687907853269984665640564039457584007913129639935
const MAX_RANDOM_DIGITS = MAX_UINT256.toString().length - 2 //Most-significant digit may only be 0 or 1 (so -1) AND

//Export Test Helper Function
module.exports = {
    Relationship: Relationship,
    whoIsFertilisedTH: whoIsFertilisedTH,
    FERTILITY_BASE_PERCENTAGE : FERTILITY_BASE_PERCENTAGE,
    MINIMUM_FERTILITY_PERCENTAGE : MINIMUM_FERTILITY_PERCENTAGE,
    calcNextGenerationTH: calcNextGenerationTH,
    calcPseudoRandomTH: calcPseudoRandomTH,
    MAX_RANDOM_DIGITS : MAX_RANDOM_DIGITS
}


async function whoIsFertilisedTH(idMateA, idMateB, genMateA, genMateB, numPersonTokens, txResult=undefined)
{
    assert.deepStrictEqual(idMateA>=0, true, `TestHelper whoIsFertilised: Invalid (negative) idMateA!`)
    assert.deepStrictEqual(genMateA>=0, true, `TestHelper whoIsFertilised: Invalid (negative) MateA generation!`)
    assert.deepStrictEqual(idMateB>=0, true, `TestHelper whoIsFertilised: Invalid (negative) idMateB!`)
    assert.deepStrictEqual(genMateB>=0, true, `TestHelper whoIsFertilised: Invalid (negative) MateB generation!`)
    assert.deepStrictEqual(numPersonTokens>1, true, `TestHelper whoIsFertilised: Invalid numPersonTokens!`)

    //Calculate the fertiliy percentage
    let fertility = FERTILITY_BASE_PERCENTAGE - Math.floor((genMateA + genMateB) / 2)
    if (fertility < MINIMUM_FERTILITY_PERCENTAGE) fertility = MINIMUM_FERTILITY_PERCENTAGE

    // Get the timestamp from the relevent block
    let txBlockObject
    if (txResult == undefined) {
        // Get the pending block
        await truffleAssert.passes(
            txBlockObject = await web3.eth.getBlock("pending"),
            "Failed to get the pending block object!"
        )
    }
    else {
        // Get the block of the given Tx
        await truffleAssert.passes(
            txBlockObject = await web3.eth.getBlock(txResult.receipt.blockNumber),
            "Failed to get the given Tx's block object!"
        )
    }

    // Calculate seed - as in PersonToken contract's _whoIsFertilised() function
    const seed = toBN(txBlockObject.timestamp).addn(idMateA).addn(idMateB).addn(numPersonTokens).toString()
    
    // Calulate expected pseudo-random
    const pseudoRandom = calcPseudoRandomTH( 4, /*numDigits*/ seed)

    // Determine if each mate is fertilised
    const randomChanceA = pseudoRandom % 100
    const randomChanceB = Math.floor(pseudoRandom/100) % 100
    const fertilisedMateA = randomChanceA < fertility
    const fertilisedMateB = randomChanceB < fertility

    return { 
        fertilisedMateA: fertilisedMateA,
        fertilisedMateB: fertilisedMateB,
        atChanceOf: fertility,
        withSeed: seed,
        withBlock: txBlockObject.number,
        withTimestamp: txBlockObject.timestamp
    }
}


function calcNextGenerationTH(mumGen, dadGen)
{
    assert.deepStrictEqual(mumGen >= 0, true, `calcNextGenerationTH: Mum's generation is invaild!`)
    assert.deepStrictEqual(dadGen >= 0, true, `calcNextGenerationTH: Dad's generation is invalid!`)

    const nextGen = mumGen > dadGen ? mumGen+1 : dadGen+1

    return nextGen
}


function calcPseudoRandomTH(numDigits, seed)
{
    assert.deepStrictEqual(numDigits>0, true, `calcPseudoRandomTH: Requested 0-digits!`)
    assert.deepStrictEqual(numDigits<=MAX_RANDOM_DIGITS, true, `calcPseudoRandomTH: >${MAX_RANDOM_DIGITS} digits!`)

    let value = toBN(
        web3.utils.soliditySha3(
            { type: 'uint256',
              value: seed.toString()
             }
        )
    )
    let leading1 = "1"
    for(let i=0; i<numDigits; i++) {
        leading1 = leading1 + "0"
    }
    let random = value.mod(toBN(leading1))

    // Allow for first random digit to be '0'
    random = random.add(toBN(leading1)) //Add leading '1' digit

    return random
}