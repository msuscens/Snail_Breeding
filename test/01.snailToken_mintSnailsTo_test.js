//SPDX-License-Identifier: UNLICENSED
// Written by Mark Suscens, Copyright 2022, all rights reserved.

const truffleAssert = require("truffle-assertions")

const SnailToken = artifacts.require("SnailToken")
const SNAIL_TOKEN_NAME = "Snail Token"
const SNAIL_TOKEN_SYMBOL = "PT"

const conceptionGen0 = {
    generation: 0,
    mumId: 0,
    dadId: 0
}


contract("01 SnailToken - MintSnailsTo (given a snail 'conception')", async accounts => {

    "use strict"

    let snailToken

    before("Deploy SnailToken contract", async function() {

        await truffleAssert.passes(
            snailToken = await SnailToken.deployed(SNAIL_TOKEN_NAME, SNAIL_TOKEN_SYMBOL)
        )
    })

    describe("Minted Gen-0 Snails: Check expected State", () => {

        let tx1Result
        let tx1BlockObject
        let snail1
        
        before("Mint one Gen-0 snail (tokenId: 0)", async() => {

            await truffleAssert.passes(
                tx1Result = await snailToken.mintSnailsTo(
                    accounts[2],        //owner
                    [conceptionGen0],  //conceptions
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

        let tx2Result
        let tx2BlockObject
        let snail2
        before("Mint second Gen-0 snail (tokenId: 1)", async() => {

            await truffleAssert.passes(
                tx2Result = await snailToken.mintSnailsTo(
                    accounts[2],        //owner
                    [conceptionGen0],   //conceptions
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

            // First (Gen-0) snail should have unknown parents (both mumId & dadId ==0)
            assert.deepStrictEqual(
                Number(snail1.mumId),
                Number(conceptionGen0.mumId),
                `Got first snail's mumId as ${snail1.mumId}, but was expecting mumId == ${conceptionGen0.mumId}`
            )
            assert.deepStrictEqual(
                Number(snail1.dadId),
                Number(conceptionGen0.dadId),
                `Got first snail's dadId as ${snail1.dadId}, but was expecting dadId == ${conceptionGen0.dadId}`
            )

            // Second (Gen-0) snail should have unknown parents (both mumId & dadId ==0)
            assert.deepStrictEqual(
                Number(snail2.mumId),
                Number(conceptionGen0.mumId),
                `Got second snail's mumId as ${snail2.mumId}, but was expecting mumId == ${conceptionGen0.mumId}`
            )
            assert.deepStrictEqual(
                Number(snail2.dadId),
                Number(conceptionGen0.dadId),
                `Got second snail's dadId as ${snail2.dadId}, but was expecting mumId == ${conceptionGen0.dadId}`
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

    describe("Gen-1 Snails: Minted with stated parents", () => {

        const conceptionAGen1 = {
            generation: 0,
            mumId: 0, //snail tokenId
            dadId: 1  //snail tokenId
        }

        let tx1Result
        let tx1BlockObject
        let gen1Snail1
        before("Mint 1x Gen-1 snail from a single conception (tokenId: 2)", async() => {

            await truffleAssert.passes(
                tx1Result = await snailToken.mintSnailsTo(
                    accounts[2],        //owner
                    [conceptionAGen1],  //conceptions
                    {from: accounts[0]}
                )
            )
            await truffleAssert.passes(
                tx1BlockObject = await web3.eth.getBlock(tx1Result.receipt.blockNumber),
                "Failed to get the Tx's block object!"
            )
            await truffleAssert.passes(
                gen1Snail1 = await snailToken.getSnail(2),
                "Unable to get snail details"
            )
        })

        const conceptionBGen1 = {
            generation: 0,
            mumId: 1,   //snail tokenId
            dadId: 0    //snail tokenId
        }

        let tx2Result
        let tx2BlockObject
        let gen1Snail2, gen1Snail3
        before("Mint 2x more Gen-1 snails from 2x conceptions (tokenId: 3 & 4)", async() => {

            await truffleAssert.passes(
                tx2Result = await snailToken.mintSnailsTo(
                    accounts[2],                        //owner
                    [conceptionAGen1, conceptionBGen1], //conceptions
                    {from: accounts[0]}
                )
            )
            await truffleAssert.passes(
                tx2BlockObject = await web3.eth.getBlock(tx2Result.receipt.blockNumber),
                "Failed to get the Tx's block object!"
            )
            await truffleAssert.passes(
                gen1Snail2 = await snailToken.getSnail(3),
                "Unable to get snail details"
            )
            await truffleAssert.passes(
                gen1Snail3 = await snailToken.getSnail(4),
                "Unable to get snail details"
            )
        })

        it("should have expected parents (mumId & dadaId): 1x Gen-1 snail (from single-conception)", async () => {

            // 1x gen-1 snail (minted as lone conception)
            assert.deepStrictEqual(
                Number(gen1Snail1.mumId),
                Number(conceptionAGen1.mumId),
                `Got snail's mumId as ${gen1Snail1.mumId}, but was expecting mumId == ${conceptionAGen1.mumId}`
            )
            assert.deepStrictEqual(
                Number(gen1Snail1.dadId),
                Number(conceptionAGen1.dadId),
                `Got snail's dadId as ${gen1Snail1.dadId}, but was expecting dadId == ${conceptionAGen1.dadId}`
            )
        })

        it("should have expected parents (mumId & dadaId): 2x Gen-1 snails (from double-conception)", async () => {

            // Snail from 1st conception
            assert.deepStrictEqual(
                Number(gen1Snail2.mumId),
                Number(conceptionAGen1.mumId),
                `Got snail's mumId as ${gen1Snail2.mumId}, but was expecting mumId == ${conceptionAGen1.mumId}`
            )
            assert.deepStrictEqual(
                Number(gen1Snail2.dadId),
                Number(conceptionAGen1.dadId),
                `Got snail's dadId as ${gen1Snail2.dadId}, but was expecting mumId == ${conceptionAGen1.dadId}`
            )

            // Snail from 2nd conception
            assert.deepStrictEqual(
                Number(gen1Snail3.mumId),
                Number(conceptionBGen1.mumId),
                `Got snail's mumId as ${gen1Snail3.mumId}, but was expecting mumId == ${conceptionBGen1.mumId}`
            )
            assert.deepStrictEqual(
                Number(gen1Snail3.dadId),
                Number(conceptionBGen1.dadId),
                `Got snail's dadId as ${gen1Snail3.dadId}, but was expecting mumId == ${conceptionBGen1.dadId}`
            )
        })

        it("should know snail's birth time: 1x Gen-1 snail (from single conception)", async () => {

            assert.deepStrictEqual(
                Number(gen1Snail1.age.birthTime),
                Number(tx1BlockObject.timestamp),
                `Got snail's birth time as ${gen1Snail1.age.birthTime} (seconds), but was expecting ${tx1BlockObject.timestamp} (seconds)`
            )
        })

        it("should know both snail's birth time: 2x Gen-1 snails (from double-conception)", async () => {

            assert.deepStrictEqual(
                Number(gen1Snail2.age.birthTime),
                Number(tx2BlockObject.timestamp),
                `Got snail's birth time as ${gen1Snail2.age.birthTime} (seconds), but was expecting ${tx2BlockObject.timestamp} (seconds)`
            )
            assert.deepStrictEqual(
                Number(gen1Snail3.age.birthTime),
                Number(tx2BlockObject.timestamp),
                `Got snail's birth time as ${gen1Snail3.age.birthTime} (seconds), but was expecting ${tx2BlockObject.timestamp} (seconds)`
            )
        })

        it("should only be the expected number snails in existance (ie 2xGen-0 + 3xGen-1 == 5 snails)", async () => {

            let totalSnails
            await truffleAssert.passes(
                totalSnails = await snailToken.totalSupply(),
                "Unable to get snail token's total supply"
            )
            assert.deepStrictEqual(
                Number(totalSnails),
                5,
                `There are ${totalSnails} snail tokens but expected 5!`
            )
        })
    })

})