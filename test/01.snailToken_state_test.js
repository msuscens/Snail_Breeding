//SPDX-License-Identifier: UNLICENSED
// Written by Mark Suscens, Copyright 2022, all rights reserved.

const truffleAssert = require("truffle-assertions")

const SnailToken = artifacts.require("SnailToken")
const SNAIL_TOKEN_NAME = "Snail Token"
const SNAIL_TOKEN_SYMBOL = "PT"


contract("01 SnailToken State - Newly minted snail", async accounts => {

    "use strict"

    let snailToken

    before("Deploy SnailToken contract", async function() {

        await truffleAssert.passes(
            snailToken = await SnailToken.deployed(SNAIL_TOKEN_NAME, SNAIL_TOKEN_SYMBOL)
        )
    })

    describe("Newly minted (Gen-0) Snail: General State", () => {

        const conception1 = {
            generation: 0,
            mumId: 0,
            dadId: 0
        }

        let tx1Result
        let tx1BlockObject
        let snail1
        
        before("Mint one snail (tokenId: 0)", async() => {

            await truffleAssert.passes(
                tx1Result = await snailToken.mintSnailsTo(
                    accounts[2],    //owner
                    [conception1],  //conceptions
                    {from: accounts[0]}
                )
            )
            await truffleAssert.passes(
                tx1BlockObject = await web3.eth.getBlock(tx1Result.receipt.blockNumber),
                "Failed to get the Tx's block object!"
            )
            await truffleAssert.passes(
                snail1 = await snailToken.getSnail(0),
                "Unable to get first (minted) snail details"
            )
        })

        const conception2 = {
            generation: 0,
            mumId: 0,
            dadId: 0
        }
        let tx2Result
        let tx2BlockObject
        let snail2
        before("Mint second snail (tokenId: 1)", async() => {

            await truffleAssert.passes(
                tx2Result = await snailToken.mintSnailsTo(
                    accounts[2],    //owner
                    [conception2],  //conceptions
                    {from: accounts[0]}
                )
            )
            await truffleAssert.passes(
                tx2BlockObject = await web3.eth.getBlock(tx2Result.receipt.blockNumber),
                "Failed to get the Tx's block object!"
            )
            await truffleAssert.passes(
                snail2 = await snailToken.getSnail(1),
                "Unable to get second (minted)) snail details"
            )
        })

        it("should have expected parents (mumId & dadaId)", async () => {

            // First (Gen-0) snail hatched should have unknown parents (both mumId & dadId ==0)
            assert.deepStrictEqual(
                Number(snail1.mumId),
                Number(conception1.mumId),
                `Got first snail's mumId as ${snail1.mumId}, but was expecting mumId == ${conception1.mumId}`
            )
            assert.deepStrictEqual(
                Number(snail1.dadId),
                Number(conception1.dadId),
                `Got first snail's dadId as ${snail1.dadId}, but was expecting dadId == ${conception1.dadId}`
            )

            // Second (Gen-0) snail should have unknown parents (both mumId & dadId ==0)
            assert.deepStrictEqual(
                Number(snail2.mumId),
                Number(conception2.mumId),
                `Got second snail's mumId as ${snail2.mumId}, but was expecting mumId == ${conception2.mumId}`
            )
            assert.deepStrictEqual(
                Number(snail2.dadId),
                Number(conception2.dadId),
                `Got second snail's dadId as ${snail2.dadId}, but was expecting mumId == ${conception2.dadId}`
            )
        })

        it("should know snail's birth time (ie. blocktime)", async () => {

            assert.deepStrictEqual(
                Number(snail1.age.birthTime),
                Number(tx1BlockObject.timestamp),
                `Got first snail's birth time as ${snail1.age.birthTime} (seconds), but was expecting ${tx1BlockObject.timestamp} (seconds)`
            )
            assert.deepStrictEqual(
                Number(snail2.age.birthTime),
                Number(tx2BlockObject.timestamp),
                `Got second snail's birth time as ${snail2.age.birthTime} (seconds), but was expecting ${tx2BlockObject.timestamp} (seconds)`
            )

            //Check second snail's birth time was the same or after the first hatched snail
            assert.deepStrictEqual(
                Number(snail2.age.birthTime) >= Number(snail1.age.birthTime) ,
                true,
                `Got second snail birthtime (${snail2.age.birthTime} seconds), but this is before first snail's birthtime (${snail1.age.birthTime} seconds)`
            )
        })

        it("should only be the expected number snails in existance (ie. 2x snails)", async () => {

            let totalSnails
            await truffleAssert.passes(
                totalSnails = await snailToken.totalSupply(),
                "Unable to get snail token's total supply"
            )
            assert.deepStrictEqual(
                Number(totalSnails),
                2,
                `There are ${totalSnails} snail tokens but expected 2!`
            )
        })
    })

})