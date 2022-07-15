//SPDX-License-Identifier: UNLICENSED
// Written by Mark Suscens, Copyright 2022, all rights reserved.

const truffleAssert = require("truffle-assertions")
const { deployProxy } = require('@openzeppelin/truffle-upgrades')
const timeMachine = require('ganache-time-traveler')

// Test Helpers
const whoIsFertilisedTH= require('./TestHelpers/PersonTH.js').whoIsFertilisedTH

const PersonToken = artifacts.require("PersonToken")

const PERSON_TOKEN_NAME = "Person Token"
const PERSON_TOKEN_SYMBOL = "PT"

//Convert an array 1D & 2D (of string or BN format numbers) into array of Numbers
const toNumbers = arr => arr.map(Number); 
//Compare two arrays
const equals = (a, b) => a.length === b.length && a.every((v, i) => v === b[i])


contract("02 PersonToken - Two people (one-pair) breed", async accounts => {

    "use strict"

    let personToken

    before("Deploy PersonToken contract", async function() {

        await truffleAssert.passes(
            personToken = await deployProxy(
                PersonToken,
                [
                    PERSON_TOKEN_NAME,
                    PERSON_TOKEN_SYMBOL
                ],
                {initializer: 'init_PersonToken', from: accounts[0]}
            ),
            "Failed to deployProxy for PersonToken contract"
        )
    })

    const conception = {
        generation: 0,
        mumId: 0,
        dadId: 0
    }

    before("Mint 2x people for accounts[2] (tokenId:s 0 & 1)", async() => {

        await truffleAssert.passes(
            personToken.mintPersonsTo(
                accounts[2],                //owner
                [conception, conception],   //conceptions
                {from: accounts[0]}
            )
        )
    })

    before("Mint 1x person for accounts[0] (tokenId: 2)", async() => {

        await truffleAssert.passes(
            personToken.mintPersonsTo(
                accounts[0],   //owner
                [conception],  //conceptions
                {from: accounts[0]}
            )
        )
    })
    // CURRENT STATE: 3x Gen0 Person tokens exist 
    const A_PERSON_ID = 0 //Owner accounts[2]
    const B_PERSON_ID = 1 //Owner accounts[2]
    const C_PERSON_ID = 2 //Owner accounts[0]


    describe("Breed YoungAdults: Both mates must be present", () => {

        let snapshotId
        beforeEach("Save Initial Setup State (of blockchain)", async() => {
            let snapshot = await timeMachine.takeSnapshot()
            snapshotId = snapshot['result']
        })

        afterEach("Restore To Initial Setup State (of blockchain)", async() => {
            await timeMachine.revertToSnapshot(snapshotId)
        })

        it("should NOT allow breed both mates are NOT specified", async () => {

            await truffleAssert.reverts(
                personToken.breed(
                    [], //mateA - omitted
                    [], //mateB - omitted
                    {from: accounts[2]}
                ),
                "breed: No persons!"
            )
        })

        it("should NOT allow breed if only a single mate is specified", async () => {

            await truffleAssert.reverts(
                personToken.breed(
                    [A_PERSON_ID], //mateA - owned by accounts[2]
                    [], //mateB - omitted
                    {from: accounts[2]}
                ),
                "breed: Mates not all paired!"
            )
            await truffleAssert.reverts(
                personToken.breed(
                    [], //mateA - omitted
                    [B_PERSON_ID], //mateB - owned by accounts[2]
                    {from: accounts[2]}
                ),
                "breed: Mates not all paired!"
            )
        })

        it("should NOT allow breed if neither mate is present (owned/approved)", async () => {

            await truffleAssert.reverts(
                personToken.breed(
                    [A_PERSON_ID], //mateA - owned by accounts[2]
                    [B_PERSON_ID], //mateB - owned by accounts[2]
                    {from: accounts[0]}
                ),
                "breed: MateAs not all present!"
            )
        })

        it("should NOT allow breed if only one mate is present (owned/approved)", async () => {

            await truffleAssert.reverts(
                personToken.breed(
                    [C_PERSON_ID], //mateA - owned by accounts[0]
                    [A_PERSON_ID], //mateB - owned by accounts[2]
                    {from: accounts[2]}
                ),
                "breed: MateAs not all present!"
            )
            await truffleAssert.reverts(
                personToken.breed(
                    [A_PERSON_ID], //mateA - owned by accounts[2] 
                    [C_PERSON_ID], //mateB - owned by accounts[0]
                    {from: accounts[2]}
                ),
                "breed: MateBs not all present!"
            )
        })

        it("should NOT allow a person to be breed with itself", async () => {

            await truffleAssert.reverts(
                personToken.breed(
                    [A_PERSON_ID], //mateA
                    [A_PERSON_ID], //mateB
                    {from: accounts[2]}
                ),
                "breed: Invalid mates!"
            )
        })
    })


    describe("Breed 2-Persons: ", () => {

        let genMateA
        let genMateB
        before(`Get person's Generations (MateA personId: ${A_PERSON_ID} & MateB's personId: ${B_PERSON_ID})`, async function() {
    
            let personMateA
            await truffleAssert.passes(
                personMateA = await personToken.getPerson(A_PERSON_ID),
                `Unable to getPerson of personId ${A_PERSON_ID}`
            )
            genMateA = Number(personMateA.age.generation)

            let personMateB
            await truffleAssert.passes(
                personMateB = await personToken.getPerson(B_PERSON_ID),
                `Unable to getPerson of personId ${B_PERSON_ID}`
            )
            genMateB = Number(personMateB.age.generation)
        })

        let mintedPeopleOrig
        let lastOrigPersonId
        let nextPersonId
        before("Get number minted people (and last/next tokenId)", async function() {

            await truffleAssert.passes(
                mintedPeopleOrig = await personToken.totalSupply(),
                "Unable to get the amount of people minted"
            )
            mintedPeopleOrig = Number(mintedPeopleOrig)
            lastOrigPersonId = lastOrigPersonId-1
            nextPersonId = mintedPeopleOrig
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
                personToken.breed(
                    [A_PERSON_ID], //mateA                
                    [B_PERSON_ID], //mateB
                    {from: accounts[2]}),
                "Person owner was unable to breed their persons"
            )
        })

        it("should if breed results in any new-borns, emit a 'BabiesBorn' event", async () => {

            let txBreedResult
            await truffleAssert.passes(
                txBreedResult = await personToken.breed(
                    [A_PERSON_ID], //mateA                
                    [B_PERSON_ID], //mateB
                    {from: accounts[2]}),
                "Person owner was unable to breed their persons"
            )
            // Calculate expected fertilisation
            const expected = await whoIsFertilisedTH(
                A_PERSON_ID, //mateA
                B_PERSON_ID, //mateB
                genMateA,
                genMateB,
                mintedPeopleOrig,
                txBreedResult
            )

            // Check expected new-borns were actally born (minted)
            let nextToBeBornId = nextPersonId
            if (expected.fertilisedMateA) {

                truffleAssert.eventEmitted(txBreedResult, 'BabiesBorn', (ev) => {

                    if (expected.fertilisedMateB) { //Expect MateA & MateB (both) to have a baby

                        console.log("\tExpected both mateA & mateB to have a baby ...")

                        return equals(toNumbers(ev.babyIds),[nextToBeBornId,nextToBeBornId+1]) &&
                            ev.provenance.length === 2 &&
                            Number(ev.provenance[0].generation) === 1 &&
                            Number(ev.provenance[1].generation) === 1 &&
                            Number(ev.provenance[0].mumId) === A_PERSON_ID &&
                            Number(ev.provenance[1].mumId) === B_PERSON_ID &&
                            Number(ev.provenance[0].dadId) === B_PERSON_ID &&
                            Number(ev.provenance[1].dadId) === A_PERSON_ID &&
                            ev.owner === accounts[2]
                    }
                    else { //Expect MateA only to have a baby

                        console.log("\tExpected only mateA to have a baby ...")

                        return equals(toNumbers(ev.babyIds),[nextToBeBornId]) &&
                            ev.provenance.length === 1 &&
                            Number(ev.provenance[0].generation) === 1 &&
                            Number(ev.provenance[0].mumId) === A_PERSON_ID &&
                            Number(ev.provenance[0].dadId) === B_PERSON_ID &&
                            ev.owner == accounts[2] 
                    }
                }, "Event BabiesBorn (at least mateA has a baby) has incorrect parameter values!")
            }
            else if (expected.fertilisedMateB) { //Expect MateB only to have a baby

                console.log("\tExpected only mateB to have a baby ...")

                truffleAssert.eventEmitted(txBreedResult, 'BabiesBorn', (ev) => {
                    return equals(toNumbers(ev.babyIds),[nextToBeBornId]) &&
                        ev.provenance.length === 1 &&
                        Number(ev.provenance[0].generation) === 1 &&
                        Number(ev.provenance[0].mumId) === B_PERSON_ID &&
                        Number(ev.provenance[0].dadId) === A_PERSON_ID &&
                        ev.owner == accounts[2] 
                }, "Event BabiesBorn (only mateB had a baby) has incorrect parameter values!")
            }
            else  {
                console.log("\tExpected NO babies born ...")
                truffleAssert.eventNotEmitted(txBreedResult, 'BabiesBorn')
            }
        })

        it("should, after breed indicates new-born(s), have minted the expected new-born persons", async () => {

            let txBreedResult
            await truffleAssert.passes(
                txBreedResult = await personToken.breed(
                    [A_PERSON_ID], //mateA
                    [B_PERSON_ID], //mateB
                    {from: accounts[2]}),
                "Person owner was unable to breed their persons"
            )
            // Calculate expected number of new-borns
            const expected = await whoIsFertilisedTH(
                A_PERSON_ID, //mateA
                B_PERSON_ID, //mateB
                genMateA,
                genMateB,
                mintedPeopleOrig,
                txBreedResult
            )
            let expectedNumNewBorns = 0
            if (expected.fertilisedMateA) expectedNumNewBorns++
            if (expected.fertilisedMateB) expectedNumNewBorns++

            //Check new person total vs expected new-borns
            let actualNumPeople
            await truffleAssert.passes(
                actualNumPeople = await personToken.totalSupply(),
                "Unable to get the total of persons minted"
            )
            assert.deepStrictEqual(
                Number(actualNumPeople) - Number(mintedPeopleOrig),
                expectedNumNewBorns, 
                `Expected ${expectedNumNewBorns} new-borns, but total minted people before was ${mintedPeopleOrig} and is now ${actualNumPeople} which indicates that ${Number(actualNumPeople) - Number(mintedPeopleOrig)} babies were born!`
            )
        })

        it("should have (for any) new-borns have the correct parents identified", async () => {

            let txBreedResult
            await truffleAssert.passes(
                txBreedResult = await personToken.breed(
                    [A_PERSON_ID], //mateA
                    [B_PERSON_ID], //mateB
                    {from: accounts[2]}),
                "Owner was unable to breed their persons"
            )
            // Calculate expected number of new-borns
            // Calculate expected fertilisation
            const expected = await whoIsFertilisedTH(
                A_PERSON_ID, //mateA
                B_PERSON_ID, //mateB
                genMateA,
                genMateB,
                mintedPeopleOrig,
                txBreedResult
            )

            //Get & check new-born details
            let newBabyId = nextPersonId
            let person
            if (expected.fertilisedMateA) {

                await truffleAssert.passes(
                    person = await personToken.getPerson(newBabyId),
                    `Unable to getPerson() with id: ${newBabyId}`
                )
                assert.deepStrictEqual(
                    Number(person.mumId),
                    A_PERSON_ID, 
                    `Expected mum personId == ${A_PERSON_ID} but is incorrectly recorded as ${Number(person.mumId)}!`
                )
                assert.deepStrictEqual(
                    Number(person.dadId),
                    B_PERSON_ID, 
                    `Expected dad personId == ${B_PERSON_ID} but is incorrectly recorded as ${Number(person.dadId)}!`
                )
                newBabyId++
            }
            
            if (expected.fertilisedMateB) {

                await truffleAssert.passes(
                    person = await personToken.getPerson(newBabyId),
                    `Unable to getPerson() with id: ${newBabyId}`
                )
                assert.deepStrictEqual(
                    Number(person.mumId),
                    B_PERSON_ID, 
                    `Expected mum personId == ${B_PERSON_ID} but is incorrectly recorded as ${Number(person.mumId)}!`
                )
                assert.deepStrictEqual(
                    Number(person.dadId),
                    A_PERSON_ID, 
                    `Expected dad personId == ${A_PERSON_ID} but is incorrectly recorded as ${Number(person.dadId)}!`
                )
            }
        })
    })


    describe("Person Breeding: Pausing  & Unpausing the PersonToken Contract", () => {

        let snapshotId
        beforeEach("Save Initial Setup State (of blockchain)", async() => {
            let snapshot = await timeMachine.takeSnapshot()
            snapshotId = snapshot['result']
        })

        afterEach("Restore To Initial Setup State (of blockchain)", async() => {
            await timeMachine.revertToSnapshot(snapshotId)
        })

        it("should NOT breed when PersonToken contract is in 'paused' state", async () => {

            // Put contract into 'paused' state
            await truffleAssert.passes(
                personToken.pause(),
                "Failed to put personToken contract into 'paused' state!"
            )
            await truffleAssert.reverts(
                personToken.breed(
                    [A_PERSON_ID], //mateA
                    [B_PERSON_ID], //mateB
                    {from: accounts[2]}
                ),
                "Pausable: paused"
            )
        })

        it("should allow breed after 'paused' PersonToken contract is 'unpaused'", async () => {

            // Put contract into 'paused' state
            await truffleAssert.passes(
                personToken.pause(),
                "Failed to put personToken contract into 'paused' state!"
            )
            // Put contract back into 'unpaused' state
            await truffleAssert.passes(
                personToken.unpause(),
                "Failed to put personToken contract into 'unpaused' state!"
            )
            await truffleAssert.passes(
                personToken.breed(
                    [A_PERSON_ID], //mateA
                    [B_PERSON_ID], //mateB
                    {from: accounts[2]}
                ),
                "Person owner was unable to breed their persons"
            )
        })
    })
})