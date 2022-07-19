//SPDX-License-Identifier: UNLICENSED
// Written by Mark Suscens, Copyright 2022, all rights reserved.

const truffleAssert = require("truffle-assertions")
const { deployProxy } = require('@openzeppelin/truffle-upgrades')
const timeMachine = require('ganache-time-traveler')


// Test Helpers
const Relationship = require('./TestHelpers/PersonTH.js').Relationship
const whoIsFertilisedTH= require('./TestHelpers/PersonTH.js').whoIsFertilisedTH

const PersonToken = artifacts.require("PersonToken")

const PERSON_TOKEN_NAME = "Person Token"
const PERSON_TOKEN_SYMBOL = "PT"


contract("03 PersonToken - Get Relationship between two people", async accounts => {

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

    before("Mint 5x Gen-0 people for accounts[2] (tokenIds: 0-4)", async() => {

        await truffleAssert.passes(
            personToken.mintPersonsTo(
                accounts[2],  //owner
                [conception, conception, conception, conception, conception],   //conceptions
                {from: accounts[0]}
            )
        )
    })

    // CREATE: 5x Gen-0 Persons : To later be heads of Family 1, Family 2 & Family 3
    const A_PERSON_ID = 0   //Family1: Gen-0 parent
    const B_PERSON_ID = 1   //Family1: Gen-0 parent
    const C_PERSON_ID = 2   //Family2: Gen-0 parent 
    const D_PERSON_ID = 3   //Family2 & Family-3: Gen-0 parent (to both families)
    const E_PERSON_ID = 4   //Family3: Gen-0 parent

    // BREED CHILDREN: GEN-1
    // FAMILY 1 - A_PERSON_ID & B_PERSON_ID, breed until each get a child
    let F_PERSON_ID  //Family 1: Child (of Mum:A & Dad:B)
    let G_PERSON_ID  //Family 1: Child (of Mum:B & Dad:A)

    before(`Family 1: Breed (mate ids: ${A_PERSON_ID} & ${B_PERSON_ID}), until both get a child (from same breed event)`, async function() {

        const personIds = await breedUntilBothProdueNewBorn(A_PERSON_ID, B_PERSON_ID, accounts[2])
        F_PERSON_ID = personIds[0]
        G_PERSON_ID = personIds[1]
    })

    // FAMILY 2 - C_PERSON_ID & D_PERSON_ID, breed until both get a child (from same breed event)
    let H_PERSON_ID  //Family 2: Child (of Mum:C & Dad:D)
    let I_PERSON_ID  //Family 2: Child (of Mum:D & Dad:C)
    before(`Family 2: Breed (mate ids: ${C_PERSON_ID} & ${D_PERSON_ID}), until both have a child (at same time)`, async function() {

        const personIds = await breedUntilBothProdueNewBorn(C_PERSON_ID, D_PERSON_ID, accounts[2])
        H_PERSON_ID = personIds[0]
        I_PERSON_ID = personIds[1]
    })

    // BREED 1st GRANDCHILDREN from inter-breeding of Families 1 & 2:
    //   Parents F & H mate will have 2x children => J & K
    //   Parents G & I mate will have 2x children => L & M

    // FAMILIES 1&2 Interbreed: F_PERSON (Familiy-1) with H_PERSON (Familiy-2)
    let J_PERSON_ID //Families 1&2 Interbreed: Child (of parents: F & H)
    let K_PERSON_ID //Families 1&2 Interbreed: Child (of parents: H & F)
    before(`Family 2: Breed Mates: F_PERSON_ID & H_PERSON_ID, until both have a child (at same time)`, async function() {

        const personIds = await breedUntilBothProdueNewBorn(F_PERSON_ID, H_PERSON_ID, accounts[2])
        J_PERSON_ID = personIds[0]
        K_PERSON_ID = personIds[1]
    })

    // FAMILIES 1&2 Interbreed: G_PERSON (Familiy-1) with I_PERSON (Familiy-2)
    let L_PERSON_ID  //Families 1&2 Interbreed: Child (of parents: G & I)
    let M_PERSON_ID  //Families 1&2 Interbreed: Child (of parents: I & G)
    before(`Family 2: Breed Mates: G_PERSON_ID & I_PERSON_ID, until both have a child (at same time)`, async function() {

        const personIds = await breedUntilBothProdueNewBorn(G_PERSON_ID, I_PERSON_ID, accounts[2])
        L_PERSON_ID = personIds[0]
        M_PERSON_ID = personIds[1]
    })


// PERSON BLOOD RELATIONSHIPS:
 //              FAMILIY-1                        FAMILIY-2                       STATUS/ROLE 
 //        A_PERSON <---> B_PERSON        C_PERSON  <--->  D_PERSON      Parents/Grandparents (Gen-0)     
 //            |              |               |                |              
 //        F_PERSON       G_PERSON        H_PERSON         I_PERSON       Children (Gen-1)
 //   
 //                             FAMILY INTERBREEDING
 //     F_PERSON <---> H_PERSON         G_PERSON <---> I_PERSON            As Parents (Gen-1)
 //         |              |                |              |                  
 //     J_PERSON       K_PERSON         L_PERSON         M_PERSON          Children/Grandchildren (Gen-2)
 //
 

    describe("Get Relationships: Self-Related, an Ex-mate, or completely-releated", () => {

        it("should be 'oneself' if the two persons are the same person", async () => {

            let value
            await truffleAssert.passes(
                value = await personToken.getRelationship(
                    A_PERSON_ID, //of person
                    A_PERSON_ID  //to person
                ),
                "Unable to get the relationship of the 2x persons!?"
            )
            const relationship = Object.keys(Relationship)[value]

            assert.deepStrictEqual(
                Number(value),
                Relationship.Oneself,
                `Expected to be 'Oneself' but rather Person (id:${A_PERSON_ID}) has Relationship.${relationship} to itself!!`
            )
        })

        it("should not be related if persons are not ex-partners, nor blood-family", async () => {

            let value
            await truffleAssert.passes(
                value = await personToken.getRelationship(
                    A_PERSON_ID, //of person
                    E_PERSON_ID  //to person
                ),
                "Unable to get the relationship of the 2x persons!?"
            )
            const relationship = Object.keys(Relationship)[value]

            assert.deepStrictEqual(
                Number(value),
                Relationship.None,
                `Expected to be 'None' but rather Person (id:${A_PERSON_ID}) has Relationship.${relationship} to person (id:${E_PERSON_ID})!`
            )

        })

        it("should be ex-partners if they have produced offspring together", async () => {

            let value
            await truffleAssert.passes(
                value = await personToken.getRelationship(
                    A_PERSON_ID, //of person
                    B_PERSON_ID  //to person
                ),
                "Unable to get the relationship of the 2x persons!?"
            )
            const relationship = Object.keys(Relationship)[value]

            assert.deepStrictEqual(
                Number(value),
                Relationship.ExPartner,
                `Expected to be 'ExPartner' but rather Person (id:${A_PERSON_ID}) has Relationship.${relationship} to person (id:${B_PERSON_ID})!`
            )
        })
    })

    // 
    // *** Close-Family Relations
    // *** (ie. direct descendents from Grandfather through to Grandchildren or GrandNephewNiece)
    //

    describe("Get Immediate Direct-line Relationships: Parents & Child", () => {

        it("should be mother to their child (when mother==Gen0)", async () => {

            let value
            await truffleAssert.passes(
                value = await personToken.getRelationship(
                    A_PERSON_ID, //of person
                    F_PERSON_ID  //to person
                ),
                "Unable to get the relationship of the 2x persons!?"
            )
            const relationship = Object.keys(Relationship)[value]

            assert.deepStrictEqual(
                Number(value),
                Relationship.Mother,
                `Expected to be 'Mother' but rather Person (id:${A_PERSON_ID}) has Relationship.${relationship} to person (id:${F_PERSON_ID})!!`
            )
        })

        it("should be mother to their child (when mother==Gen1)", async () => {

            let value
            await truffleAssert.passes(
                value = await personToken.getRelationship(
                    F_PERSON_ID, //of person
                    J_PERSON_ID  //to person
                ),
                "Unable to get the relationship of the 2x persons!?"
            )
            const relationship = Object.keys(Relationship)[value]

            assert.deepStrictEqual(
                Number(value),
                Relationship.Mother,
                `Expected to be 'Mother' but rather Person (id:${F_PERSON_ID}) has Relationship.${relationship} to person (id:${V_PERSON_ID})!!`
            )
        })

        it("should be father to their child (when father==Gen0)", async () => {

            let value
            await truffleAssert.passes(
                value = await personToken.getRelationship(
                    B_PERSON_ID, //of person
                    F_PERSON_ID  //to person
                ),
                "Unable to get the relationship of the 2x persons!?"
            )
            const relationship = Object.keys(Relationship)[value]

            assert.deepStrictEqual(
                Number(value),
                Relationship.Father,
                `Expected to be 'Father' but rather Person (id:${B_PERSON_ID}) has Relationship.${relationship} to person (id:${F_PERSON_ID})!!`
            )
        })

        it("should be father of their child (when father==Gen1)", async () => {

            let value
            await truffleAssert.passes(
                value = await personToken.getRelationship(
                    H_PERSON_ID, //of person
                    J_PERSON_ID  //to person
                ),
                "Unable to get the relationship of the 2x persons!?"
            )
            const relationship = Object.keys(Relationship)[value]

            assert.deepStrictEqual(
                Number(value),
                Relationship.Father,
                `Expected to be 'Father' but rather Person (id:${H_PERSON_ID}) has Relationship.${relationship} to person (id:${V_PERSON_ID})!!`
            )
        })
    
        it("should be child to their mother", async () => {

            let value
            await truffleAssert.passes(
                value = await personToken.getRelationship(
                    F_PERSON_ID, //of person
                    A_PERSON_ID  //to person
                ),
                "Unable to get the relationship of the 2x persons!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.Child,
                `Expected to be 'Child' but rather Person (id:${F_PERSON_ID}) has Relationship.${relationship} to person (id:${A_PERSON_ID})!!`
            )
        })

        it("should be child of their father", async () => {

            let value
            await truffleAssert.passes(
                value = await personToken.getRelationship(
                    F_PERSON_ID, //of person
                    B_PERSON_ID  //to person
                ),
                "Unable to get the relationship of the 2x persons!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.Child,
                `Expected to be 'Child' but rather Person (id:${F_PERSON_ID}) has Relationship.${relationship} to person (id:${B_PERSON_ID})!!`
            )
        })
    })


    describe("Get Immediate Direct-line Relationships: Grandparents", () => {

        it("should be grandmother-on-mums-side to child's mothered child", async () => {

            let value
            await truffleAssert.passes(
                value = await personToken.getRelationship(
                    A_PERSON_ID, //of person
                    J_PERSON_ID  //to person
                ),
                "Unable to get the relationship of the 2x persons!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.GrandmotherOnMumsSide,
                `Expected to be 'GrandmotherOnMumsSide' but rather Person (id:${A_PERSON_ID}) has Relationship.${relationship} to person (id:${J_PERSON_ID})!!`
            )
        })

        it("should be grandmother-on-dads-side to child's fathered child", async () => {

            let value
            await truffleAssert.passes(
                value = await personToken.getRelationship(
                    C_PERSON_ID, //of person
                    J_PERSON_ID  //to person
                ),
                "Unable to get the relationship of the 2x persons!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.GrandmotherOnDadsSide,
                `Expected to be 'GrandmotherOnDadsSide' but rather Person (id:${C_PERSON_ID}) has Relationship.${relationship} to person (id:${J_PERSON_ID})!!`
            )
        })

        it("should be grandfather-on-mums-side to child's mothered child", async () => {

            let value
            await truffleAssert.passes(
                value = await personToken.getRelationship(
                    B_PERSON_ID, //of person
                    J_PERSON_ID  //to person
                ),
                "Unable to get the relationship of the 2x persons!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.GrandfatherOnMumsSide,
                `Expected to be 'GrandfatherOnMumsSide' but rather Person (id:${B_PERSON_ID}) has Relationship.${relationship} to person (id:${J_PERSON_ID})!!`
            )
        })

        it("should be grandfather-on-dads-side to child's fathered child", async () => {

            let value
            await truffleAssert.passes(
                value = await personToken.getRelationship(
                    D_PERSON_ID, //of person
                    J_PERSON_ID  //to person
                ),
                "Unable to get the relationship of the 2x persons!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.GrandfatherOnDadsSide,
                `Expected to be 'GrandfatherOnDadsSide' but rather Person (id:${D_PERSON_ID}) has Relationship.${relationship} to person (id:${J_PERSON_ID})!!`
            )
        })
    })

    describe("Get Immediate Direct-line Relationships: Grandchildren", () => {

        it("should be grandchild to their mother's mother", async () => {

            let value
            await truffleAssert.passes(
                value = await personToken.getRelationship(
                    J_PERSON_ID, //of person
                    A_PERSON_ID  //to person
                ),
                "Unable to get the relationship of the 2x persons!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.Grandchild,
                `Expected to be 'Grandchild' but rather Person (id:${J_PERSON_ID}) has Relationship.${relationship} to person (id:${A_PERSON_ID})!!`
            )
        })

        it("should be grandchild to their fathers's mother", async () => {
            
            let value
            await truffleAssert.passes(
                value = await personToken.getRelationship(
                    J_PERSON_ID, //of person
                    C_PERSON_ID  //to person
                ),
                "Unable to get the relationship of the 2x persons!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.Grandchild,
                `Expected to be 'Grandchild' but rather Person (id:${J_PERSON_ID}) has Relationship.${relationship} to person (id:${C_PERSON_ID})!!`
            )

        })

        it("should be grandchild to their father's mother", async () => {

            let value
            await truffleAssert.passes(
                value = await personToken.getRelationship(
                    J_PERSON_ID, //of person
                    B_PERSON_ID  //to person
                ),
                "Unable to get the relationship of the 2x persons!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.Grandchild,
                `Expected to be 'Grandchild' but rather Person (id:${J_PERSON_ID}) has Relationship.${relationship} to person (id:${B_PERSON_ID})!!`
            )
        })

        it("should be grandchild to their father's father", async () => {
            
            let value
            await truffleAssert.passes(
                value = await personToken.getRelationship(
                    J_PERSON_ID, //of person
                    D_PERSON_ID  //to person
                ),
                "Unable to get the relationship of the 2x persons!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.Grandchild,
                `Expected to be 'Grandchild' but rather Person (id:${J_PERSON_ID}) has Relationship.${relationship} to person (id:${D_PERSON_ID})!!`
            )
        })
    })


    describe("Get Close Direct-line: Siblings & Half-Siblings", () => {

        it("should be full-siblings if persons mum & dad are switched (ie. same parents but opposite roles)", async () => {

            let value
            await truffleAssert.passes(
                value = await personToken.getRelationship(
                    F_PERSON_ID, //of person
                    G_PERSON_ID  //to person
                ),
                "Unable to get the relationship of the 2x persons!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.FullSibling,
                `Expected to be 'FullSibling' but rather person (id:${F_PERSON_ID}) has Relationship.${relationship} to person (id:${G_PERSON_ID})!`
            )
        })

    })


    describe("Get Indirect Grandparents-line: FirstCousins (incl. once & twice removed)", () => {

        it("should be first-cousin to its mum's aunt/uncle's child", async () => {

            let value
            await truffleAssert.passes(
                value = await personToken.getRelationship(
                    K_PERSON_ID, //of person
                    M_PERSON_ID  //to person
                ),
                "Unable to get the relationship of the 2x persons!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.FirstCousin,
                `Expected to be 'FirstCousin' but rather Person (id:${K_PERSON_ID}) has Relationship.${relationship} to person (id:${M_PERSON_ID})!!`
            )
        })

        it("should be first-cousin to its dad's aunt/uncle's child", async () => {

            let value
            await truffleAssert.passes(
                value = await personToken.getRelationship(
                    J_PERSON_ID, //of person
                    M_PERSON_ID  //to person
                ),
                "Unable to get the relationship of the 2x persons!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.FirstCousin,
                `Expected to be 'FirstCousin' but rather Person (id:${J_PERSON_ID}) has Relationship.${relationship} to person (id:${M_PERSON_ID})!!`
            )

        })
    })


// *** Support Functions for setting up test data ***

    async function breedUntilBothProdueNewBorn(idMateA, idMateB, owner) {

        // Gather data used for pseudo-random breeding (seed),
        // to enable expected result to be calculated
        const genMateA = await getGenOf(idMateA)
        const genMateB = await getGenOf(idMateB)

        let mintedPeopleBeforeBreed
        await truffleAssert.passes(
            mintedPeopleBeforeBreed = await personToken.totalSupply(),
            "Unable to get the amount of people minted"
        )
        mintedPeopleBeforeBreed = Number(mintedPeopleBeforeBreed)

        // Breed until mating results in two new-borns (1x from each parent)
        let newBorns
        let numNewBorns = 0
        let txBreedResult
        let count = 0
        do {
            count++
            console.log(`Breed count: ${count} `)
            await truffleAssert.passes(
                txBreedResult = await personToken.breed(
                    idMateA, //mateA
                    idMateB, //mateB
                    {from: owner}),
                "Person owner was unable to mate their 2x persons"
            )
            // Determine the number of new-borns (0,1, or 2)
            const expected = await whoIsFertilisedTH(
                idMateA,
                idMateB,
                genMateA,
                genMateB,
                mintedPeopleBeforeBreed,
                txBreedResult
            )

            if (expected.fertilisedMateA || expected.fertilisedMateB) {
            
                truffleAssert.eventEmitted(txBreedResult, 'BabiesBorn', (ev) => {
                    newBorns = ev
                    numNewBorns = newBorns.babyIds.length
                    return true
                })
                console.log(`\t${numNewBorns}x new-borns`)
            }
            else {
                truffleAssert.eventNotEmitted(txBreedResult, 'BabiesBorn')
                numNewBorns = 0
                console.log(`\tNo new-borns`)
            }

            //Let some time pass (so we have a different blocktime)
            await truffleAssert.passes(
                timeMachine.advanceTimeAndBlock(60), //60-seconds
                "Failed to advance time and block"
            )

        } while (numNewBorns !=2) //2x eggs (ie. one from each parent)

        assert.deepStrictEqual(
            newBorns.babyIds.length,
            2,
            `Internal Error in breedUntilBothProdueNewBorn() should have 2x personIds but got: '${newBorns}'!!`
        )
        return newBorns.babyIds
    }

    async function getGenOf(personId) {

        let person
        await truffleAssert.passes(
            person = await personToken.getPerson(personId),
            `Unable to getPerson of personId: ${personId}`
        )
        return Number(person.age.generation)
    }

})