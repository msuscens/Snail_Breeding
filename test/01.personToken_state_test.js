//SPDX-License-Identifier: UNLICENSED
// Written by Mark Suscens, Copyright 2022, all rights reserved.

const truffleAssert = require("truffle-assertions")
const { deployProxy } = require('@openzeppelin/truffle-upgrades')
const timeMachine = require('ganache-time-traveler')

const PersonToken = artifacts.require("PersonToken")

const PERSON_TOKEN_NAME = "Person Token"
const PERSON_TOKEN_SYMBOL = "PT"


contract("01 PersonToken State - Newly minted person", async accounts => {

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

    describe("New-born (Gen-0) Person: General State", () => {

        const conception1 = {
            generation: 0,
            mumId: 0,
            dadId: 0
        }

        let tx1Result
        let tx1BlockObject
        let person1
        
        before("Mint one person (tokenId: 0)", async() => {

            await truffleAssert.passes(
                tx1Result = await personToken.mintPersonsTo(
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
                person1 = await personToken.getPerson(0),
                "Unable to get first (minted) person details"
            )
        })

        const conception2 = {
            generation: 0,
            mumId: 0,
            dadId: 0
        }
        let tx2Result
        let tx2BlockObject
        let person2
        before("Mint second person (tokenId: 1)", async() => {

            await truffleAssert.passes(
                tx2Result = await personToken.mintPersonsTo(
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
                person2 = await personToken.getPerson(1),
                "Unable to get second (minted)) person details"
            )
        })

        it("should have expected parents (mumId & dadaId)", async () => {

            // First (Gen-0) person hatched should have unknown parents (both mumId & dadId ==0)
            assert.deepStrictEqual(
                Number(person1.mumId),
                Number(conception1.mumId),
                `Got first person's mumId as ${person1.mumId}, but was expecting mumId == ${conception1.mumId}`
            )
            assert.deepStrictEqual(
                Number(person1.dadId),
                Number(conception1.dadId),
                `Got first person's dadId as ${person1.dadId}, but was expecting dadId == ${conception1.dadId}`
            )

            // Second (Gen-0) person should have unknown parents (both mumId & dadId ==0)
            assert.deepStrictEqual(
                Number(person2.mumId),
                Number(conception2.mumId),
                `Got second person's mumId as ${person2.mumId}, but was expecting mumId == ${conception2.mumId}`
            )
            assert.deepStrictEqual(
                Number(person2.dadId),
                Number(conception2.dadId),
                `Got second person's dadId as ${person2.dadId}, but was expecting mumId == ${conception2.dadId}`
            )
        })

        it("should know person's birth time (ie. blocktime)", async () => {

            assert.deepStrictEqual(
                Number(person1.age.birthTime),
                Number(tx1BlockObject.timestamp),
                `Got first person's birth time as ${person1.age.birthTime} (seconds), but was expecting ${tx1BlockObject.timestamp} (seconds)`
            )
            assert.deepStrictEqual(
                Number(person2.age.birthTime),
                Number(tx2BlockObject.timestamp),
                `Got second person's birth time as ${person2.age.birthTime} (seconds), but was expecting ${tx2BlockObject.timestamp} (seconds)`
            )

            //Check second person's birth time was the same or after the first hatched person
            assert.deepStrictEqual(
                Number(person2.age.birthTime) >= Number(person1.age.birthTime) ,
                true,
                `Got second person birthtime (${person2.age.birthTime} seconds), but this is before first person's birthtime (${person1.age.birthTime} seconds)`
            )
        })

        it("should only be the expected number persons in existance (ie. 2x persons)", async () => {

            let totalPersons
            await truffleAssert.passes(
                totalPersons = await personToken.totalSupply(),
                "Unable to get person token's total supply"
            )
            assert.deepStrictEqual(
                Number(totalPersons),
                2,
                `There are ${totalPersons} person tokens but expected 2!`
            )
        })
    })

})