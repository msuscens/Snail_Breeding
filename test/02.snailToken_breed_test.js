//SPDX-License-Identifier: UNLICENSED
// Written by Mark Suscens, Copyright 2022, all rights reserved.

const truffleAssert = require("truffle-assertions")
const { deployProxy } = require('@openzeppelin/truffle-upgrades')
const timeMachine = require('ganache-time-traveler')

// Test Helpers
const whoIsFertilisedTH= require('./TestHelpers/SnailTH.js').whoIsFertilisedTH

const SnailToken = artifacts.require("SnailToken")

const SNAIL_TOKEN_NAME = "Snail Token"
const SNAIL_TOKEN_SYMBOL = "SNL"

//Convert an array 1D & 2D (of string or BN format numbers) into array of Numbers
const toNumbers = arr => arr.map(Number); 
//Compare two arrays
const equals = (a, b) => a.length === b.length && a.every((v, i) => v === b[i])


contract("02 SnailToken - Two snails breed", async accounts => {

    "use strict"

    let snailToken

    before("Deploy SnailToken contract", async function() {

        await truffleAssert.passes(
            snailToken = await deployProxy(
                SnailToken,
                [
                    SNAIL_TOKEN_NAME,
                    SNAIL_TOKEN_SYMBOL
                ],
                {initializer: 'init_SnailToken', from: accounts[0]}
            ),
            "Failed to deployProxy for SnailToken contract"
        )
    })

    const conception = {
        generation: 0,
        mumId: 0,
        dadId: 0
    }

    before("Mint 2x snails for accounts[2] (tokenId:s 0 & 1)", async() => {

        await truffleAssert.passes(
            snailToken.mintSnailsTo(
                accounts[2],                //owner
                [conception, conception],   //conceptions
                {from: accounts[0]}
            )
        )
    })

    before("Mint 1x snail for accounts[0] (tokenId: 2)", async() => {

        await truffleAssert.passes(
            snailToken.mintSnailsTo(
                accounts[0],   //owner
                [conception],  //conceptions
                {from: accounts[0]}
            )
        )
    })
    // CURRENT STATE: 3x Gen0 Snail tokens exist 
    const A_SNAIL_ID = 0 //Owner accounts[2]
    const B_SNAIL_ID = 1 //Owner accounts[2]
    const C_SNAIL_ID = 2 //Owner accounts[0]


    describe("Breed Snails: Both mates must be present", () => {

        let snapshotId
        beforeEach("Save Initial Setup State (of blockchain)", async() => {
            let snapshot = await timeMachine.takeSnapshot()
            snapshotId = snapshot['result']
        })

        afterEach("Restore To Initial Setup State (of blockchain)", async() => {
            await timeMachine.revertToSnapshot(snapshotId)
        })


        it("should NOT allow breed if neither mate is present (owned/approved)", async () => {

            await truffleAssert.reverts(
                snailToken.breed(
                    A_SNAIL_ID, //mateA - owned by accounts[2]
                    B_SNAIL_ID, //mateB - owned by accounts[2]
                    {from: accounts[0]}
                ),
                "breed: mateA is not present!"
            )
        })

        it("should NOT allow breed if only one mate is present (owned/approved)", async () => {

            await truffleAssert.reverts(
                snailToken.breed(
                    C_SNAIL_ID, //mateA - owned by accounts[0]
                    A_SNAIL_ID, //mateB - owned by accounts[2]
                    {from: accounts[2]}
                ),
                "breed: mateA is not present!"
            )
            await truffleAssert.reverts(
                snailToken.breed(
                    A_SNAIL_ID, //mateA - owned by accounts[2] 
                    C_SNAIL_ID, //mateB - owned by accounts[0]
                    {from: accounts[2]}
                ),
                "breed: mateB is not present!"
            )
        })

        it("should NOT allow a snail to be breed with itself", async () => {

            await truffleAssert.reverts(
                snailToken.breed(
                    A_SNAIL_ID, //mateA
                    A_SNAIL_ID, //mateB
                    {from: accounts[2]}
                ),
                "breed: With self!"
            )
        })
    })


    describe("Breed 2x Snails: ", () => {

        let genMateA
        let genMateB
        before(`Get snails' Generations (MateA snailId: ${A_SNAIL_ID} & MateB's snailId: ${B_SNAIL_ID})`, async function() {
    
            let snailMateA
            await truffleAssert.passes(
                snailMateA = await snailToken.getSnail(A_SNAIL_ID),
                `Unable to getSnail of snailId ${A_SNAIL_ID}`
            )
            genMateA = Number(snailMateA.age.generation)

            let snailMateB
            await truffleAssert.passes(
                snailMateB = await snailToken.getSnail(B_SNAIL_ID),
                `Unable to getSnail of snailId ${B_SNAIL_ID}`
            )
            genMateB = Number(snailMateB.age.generation)
        })

        let mintedSnailsOrig
        let lastOrigSnailId
        let nextSnailId
        before("Get number minted snails (and last/next tokenId)", async function() {

            await truffleAssert.passes(
                mintedSnailsOrig = await snailToken.totalSupply(),
                "Unable to get the amount of snails minted"
            )
            mintedSnailsOrig = Number(mintedSnailsOrig)
            lastOrigSnailId = lastOrigSnailId-1
            nextSnailId = mintedSnailsOrig
        })

        let snapshotId
        beforeEach("Save Initial Setup State (of blockchain)", async() => {
            let snapshot = await timeMachine.takeSnapshot()
            snapshotId = snapshot['result']
        })

        afterEach("Restore To Initial Setup State (of blockchain)", async() => {
            await timeMachine.revertToSnapshot(snapshotId)
        })


        it("should allow suitable mates to breed", async () => {

            await truffleAssert.passes(
                snailToken.breed(
                    A_SNAIL_ID, //mateA                
                    B_SNAIL_ID, //mateB
                    {from: accounts[2]}),
                "Snail owner was unable to breed their snails"
            )
        })

        it("should when there are new-born snails (from breeding), emit a 'SnailsBorn' event", async () => {

            let txBreedResult
            await truffleAssert.passes(
                txBreedResult = await snailToken.breed(
                    A_SNAIL_ID, //mateA                
                    B_SNAIL_ID, //mateB
                    {from: accounts[2]}),
                "Snail owner was unable to breed their snails"
            )
            // Calculate expected fertilisation
            const expected = await whoIsFertilisedTH(
                A_SNAIL_ID, //mateA
                B_SNAIL_ID, //mateB
                genMateA,
                genMateB,
                mintedSnailsOrig,
                txBreedResult
            )

            // Check expected new-born snails were actally minted
            let nextToBeBornId = nextSnailId
            if (expected.fertilisedMateA) {

                truffleAssert.eventEmitted(txBreedResult, 'SnailsBorn', (ev) => {

                    if (expected.fertilisedMateB) { //Expect MateA & MateB (both) to have a baby

                        console.log("\tExpected both mateA & mateB to have a baby ...")

                        return equals(toNumbers(ev.babyIds),[nextToBeBornId,nextToBeBornId+1]) &&
                            ev.provenance.length === 2 &&
                            Number(ev.provenance[0].generation) === 1 &&
                            Number(ev.provenance[1].generation) === 1 &&
                            Number(ev.provenance[0].mumId) === A_SNAIL_ID &&
                            Number(ev.provenance[1].mumId) === B_SNAIL_ID &&
                            Number(ev.provenance[0].dadId) === B_SNAIL_ID &&
                            Number(ev.provenance[1].dadId) === A_SNAIL_ID &&
                            ev.owner === accounts[2]
                    }
                    else { //Expect MateA only to have a baby

                        console.log("\tExpected only mateA to have a baby ...")

                        return equals(toNumbers(ev.babyIds),[nextToBeBornId]) &&
                            ev.provenance.length === 1 &&
                            Number(ev.provenance[0].generation) === 1 &&
                            Number(ev.provenance[0].mumId) === A_SNAIL_ID &&
                            Number(ev.provenance[0].dadId) === B_SNAIL_ID &&
                            ev.owner == accounts[2] 
                    }
                }, "Event SnailsBorn (at least mateA has a baby) has incorrect parameter values!")
            }
            else if (expected.fertilisedMateB) { //Expect MateB only to have a baby

                console.log("\tExpected only mateB to have a baby ...")

                truffleAssert.eventEmitted(txBreedResult, 'SnailsBorn', (ev) => {
                    return equals(toNumbers(ev.babyIds),[nextToBeBornId]) &&
                        ev.provenance.length === 1 &&
                        Number(ev.provenance[0].generation) === 1 &&
                        Number(ev.provenance[0].mumId) === B_SNAIL_ID &&
                        Number(ev.provenance[0].dadId) === A_SNAIL_ID &&
                        ev.owner == accounts[2] 
                }, "Event SnailsBorn (only mateB had a baby) has incorrect parameter values!")
            }
            else  {
                console.log("\tExpected NO new-born snails...")
                truffleAssert.eventNotEmitted(txBreedResult, 'SnailsBorn')
            }
        })

        it("should, after breed indicates new-born snail(s), have minted the expected snails", async () => {

            let txBreedResult
            await truffleAssert.passes(
                txBreedResult = await snailToken.breed(
                    A_SNAIL_ID, //mateA
                    B_SNAIL_ID, //mateB
                    {from: accounts[2]}),
                "Snail owner was unable to breed their snails"
            )
            // Calculate expected number of new-born snails
            const expected = await whoIsFertilisedTH(
                A_SNAIL_ID, //mateA
                B_SNAIL_ID, //mateB
                genMateA,
                genMateB,
                mintedSnailsOrig,
                txBreedResult
            )
            let expectedNumNewBorns = 0
            if (expected.fertilisedMateA) expectedNumNewBorns++
            if (expected.fertilisedMateB) expectedNumNewBorns++

            //Check new snail total vs expected new-born snails
            let actualNumSnails
            await truffleAssert.passes(
                actualNumSnails = await snailToken.totalSupply(),
                "Unable to get the total of snails minted"
            )
            assert.deepStrictEqual(
                Number(actualNumSnails) - Number(mintedSnailsOrig),
                expectedNumNewBorns, 
                `Expected ${expectedNumNewBorns} new-born snails, but total minted snails before was ${mintedSnailsOrig} and is now ${actualNumSnails} which indicates that ${Number(actualNumSnails) - Number(mintedSnailsOrig)} snails were born!`
            )
        })

        it("should have (for any) new-born snails have the correct parents identified", async () => {

            let txBreedResult
            await truffleAssert.passes(
                txBreedResult = await snailToken.breed(
                    A_SNAIL_ID, //mateA
                    B_SNAIL_ID, //mateB
                    {from: accounts[2]}),
                "Owner was unable to breed their snails"
            )
            // Calculate expected number of new-born snails
            // Calculate expected fertilisation
            const expected = await whoIsFertilisedTH(
                A_SNAIL_ID, //mateA
                B_SNAIL_ID, //mateB
                genMateA,
                genMateB,
                mintedSnailsOrig,
                txBreedResult
            )

            //Get & check new-born snail's details
            let newBabyId = nextSnailId
            let snail
            if (expected.fertilisedMateA) {

                await truffleAssert.passes(
                    snail = await snailToken.getSnail(newBabyId),
                    `Unable to getSnail() with id: ${newBabyId}`
                )
                assert.deepStrictEqual(
                    Number(snail.mumId),
                    A_SNAIL_ID, 
                    `Expected mum snailId == ${A_SNAIL_ID} but is incorrectly recorded as ${Number(snail.mumId)}!`
                )
                assert.deepStrictEqual(
                    Number(snail.dadId),
                    B_SNAIL_ID, 
                    `Expected dad snailId == ${B_SNAIL_ID} but is incorrectly recorded as ${Number(snail.dadId)}!`
                )
                newBabyId++
            }
            
            if (expected.fertilisedMateB) {

                await truffleAssert.passes(
                    snail = await snailToken.getSnail(newBabyId),
                    `Unable to getSnail() with id: ${newBabyId}`
                )
                assert.deepStrictEqual(
                    Number(snail.mumId),
                    B_SNAIL_ID, 
                    `Expected mum snailId == ${B_SNAIL_ID} but is incorrectly recorded as ${Number(snail.mumId)}!`
                )
                assert.deepStrictEqual(
                    Number(snail.dadId),
                    A_SNAIL_ID, 
                    `Expected dad snailId == ${A_SNAIL_ID} but is incorrectly recorded as ${Number(snail.dadId)}!`
                )
            }
        })
    })


    describe("Snail Breeding: Pausing  & Unpausing the SnailToken Contract", () => {

        let snapshotId
        beforeEach("Save Initial Setup State (of blockchain)", async() => {
            let snapshot = await timeMachine.takeSnapshot()
            snapshotId = snapshot['result']
        })

        afterEach("Restore To Initial Setup State (of blockchain)", async() => {
            await timeMachine.revertToSnapshot(snapshotId)
        })

        it("should NOT breed when SnailToken contract is in 'paused' state", async () => {

            // Put contract into 'paused' state
            await truffleAssert.passes(
                snailToken.pause(),
                "Failed to put snailToken contract into 'paused' state!"
            )
            await truffleAssert.reverts(
                snailToken.breed(
                    A_SNAIL_ID, //mateA
                    B_SNAIL_ID, //mateB
                    {from: accounts[2]}
                ),
                "Pausable: paused"
            )
        })

        it("should allow breed after 'paused' SnailToken contract is 'unpaused'", async () => {

            // Put contract into 'paused' state
            await truffleAssert.passes(
                snailToken.pause(),
                "Failed to put snailToken contract into 'paused' state!"
            )
            // Put contract back into 'unpaused' state
            await truffleAssert.passes(
                snailToken.unpause(),
                "Failed to put snailToken contract into 'unpaused' state!"
            )
            await truffleAssert.passes(
                snailToken.breed(
                    A_SNAIL_ID, //mateA
                    B_SNAIL_ID, //mateB
                    {from: accounts[2]}
                ),
                "Snail owner was unable to breed their snails"
            )
        })
    })
})