// Written by Mark Suscens, Copyright 2022, all rights reserved.

const truffleAssert = require("truffle-assertions")
const toBN = web3.utils.toBN


const Relationship = {None:0, ExPartner:1, Oneself:2, Mother:3, Father:4, Child:5, FullSibling:6, HalfSibling:7,
  GrandmotherOnMumsSide:8, GrandmotherOnDadsSide:9, GrandfatherOnMumsSide:10, GrandfatherOnDadsSide:11, 
  Grandchild:12, UncleAuntOnMumsSide:13, UncleAuntOnDadsSide:14, NephewNeice:15, GrandNephewNeice:16, 
  FirstCousin:17, FirstCousinOnceRemoved:18, FirstCousinTwiceRemoved:19}
Object.freeze(Relationship);

//Export Test Helper Function
module.exports = {
    Relationship: Relationship,
    calcFertilisationTH : calcFertilisationTH,
}

async function calcFertilisationTH(txBreedResult)
{
    let txBlockObject
    await truffleAssert.passes(
        txBlockObject = await web3.eth.getBlock(txBreedResult.receipt.blockNumber),
        "Failed to get the given Tx's block object!"
    )
    const pseudoRandomA = (Number(txBlockObject.timestamp) % 10)     //last digit (of timestamp)
    const pseudoRandomB = Math.floor((Number(txBlockObject.timestamp) % 100)/10) //second last digit (of timestamp)
    // console.log(`Expected pseudoRandomA: ${pseudoRandomA}; pseudoRandomB: ${pseudoRandomB}`)

    const expectMateAFertilised = (pseudoRandomA % 2) == 1 ? true: false;
    const expectMateBFertilised = (pseudoRandomB % 2) == 1 ? true: false;

    return {expectMateAFertilised, expectMateBFertilised}
}


