//SPDX-License-Identifier: UNLICENSED
// Written by Mark Suscens, Copyright 2022, all rights reserved.

const truffleAssert = require("truffle-assertions")
const { deployProxy } = require('@openzeppelin/truffle-upgrades')
const timeMachine = require('ganache-time-traveler')


// Test Helpers
const Relationship = require('./TestHelpers/SnailTH.js').Relationship
const whoIsFertilisedTH = require('./TestHelpers/SnailTH.js').whoIsFertilisedTH

const SnailToken = artifacts.require("SnailToken")

const SNAIL_TOKEN_NAME = "Snail Token"
const SNAIL_TOKEN_SYMBOL = "SNL"


contract.skip("03 SnailToken - Get Relationship between two snails", async accounts => {

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

    before("Mint 5x Gen-0 snails for accounts[2] (tokenIds: 0-4)", async() => {

        await truffleAssert.passes(
            snailToken.mintSnailsTo(
                accounts[2],  //owner
                [conception, conception, conception, conception, conception],   //conceptions
                {from: accounts[0]}
            )
        )
    })

    // CREATE: 5x Gen-0 Snails : To later be heads of Family 1, Family 2 & Family 3
    const A_SNAIL_ID = 0   //Family1: Gen-0 parent
    const B_SNAIL_ID = 1   //Family1: Gen-0 parent
    const C_SNAIL_ID = 2   //Family2: Gen-0 parent 
    const D_SNAIL_ID = 3   //Family2 & Family-3: Gen-0 parent (to both families)
    const E_SNAIL_ID = 4   //Family3: Gen-0 parent

    // BREED CHILDREN: GEN-1
    // FAMILY 1 - A_SNAIL_ID & B_SNAIL_ID, breed until each get a child
    let F_SNAIL_ID  //Family 1: Child (of Mum:A & Dad:B)
    let G_SNAIL_ID  //Family 1: Child (of Mum:B & Dad:A)

    before(`Family 1: Breed (mate ids: ${A_SNAIL_ID} & ${B_SNAIL_ID}), until both get a child (from same breed event)`, async function() {

        const snailIds = await breedUntilBothProdueNewBorn(A_SNAIL_ID, B_SNAIL_ID, accounts[2])
        F_SNAIL_ID = Number(snailIds[0])
        G_SNAIL_ID = Number(snailIds[1])
    })

    // FAMILY 2 - C_SNAIL_ID & D_SNAIL_ID, breed until both get a child (from same breed event)
    let H_SNAIL_ID  //Family 2: Child (of Mum:C & Dad:D)
    let I_SNAIL_ID  //Family 2: Child (of Mum:D & Dad:C)
    before(`Family 2: Breed (mate ids: ${C_SNAIL_ID} & ${D_SNAIL_ID}), until both have a child (at same time)`, async function() {

        const snailIds = await breedUntilBothProdueNewBorn(C_SNAIL_ID, D_SNAIL_ID, accounts[2])
        H_SNAIL_ID = Number(snailIds[0])
        I_SNAIL_ID = Number(snailIds[1])
    })

    // BREED 1st GRANDCHILDREN from inter-breeding of Families 1 & 2:
    //   Parents F & H mate will have 2x children => J & K
    //   Parents G & I mate will have 2x children => L & M

    // FAMILIES 1&2 Interbreed: F_SNAIL (Familiy-1) with H_SNAIL (Familiy-2)
    let J_SNAIL_ID //Families 1&2 Interbreed: Child (of parents: F & H)
    let K_SNAIL_ID //Families 1&2 Interbreed: Child (of parents: H & F)
    before(`Family 2&3: Breed Mates: F_SNAIL_ID (family 1) & H_SNAIL_ID (family 2), until both have a child (at same time)`, async function() {

        const snailIds = await breedUntilBothProdueNewBorn(F_SNAIL_ID, H_SNAIL_ID, accounts[2])
        J_SNAIL_ID = Number(snailIds[0])
        K_SNAIL_ID = Number(snailIds[1])
    })

    // FAMILIES 1&2 Interbreed: G_SNAIL (Familiy-1) with I_SNAIL (Familiy-2)
    let L_SNAIL_ID  //Families 1&2 Interbreed: Child (of parents: G & I)
    let M_SNAIL_ID  //Families 1&2 Interbreed: Child (of parents: I & G)
    before(`Family 1&2: Breed Mates: G_SNAIL_ID (family 1) & I_SNAIL_ID (family 2), until both have a child (at same time)`, async function() {

        const snailIds = await breedUntilBothProdueNewBorn(G_SNAIL_ID, I_SNAIL_ID, accounts[2])
        L_SNAIL_ID = Number(snailIds[0])
        M_SNAIL_ID = Number(snailIds[1])
    })


// SNAIL BLOOD RELATIONSHIPS:
 //              FAMILIY-1                      FAMILIY-2                 STATUS/ROLE 
 //        A_SNAIL <---> B_SNAIL        C_SNAIL  <--->  D_SNAIL       Parents/Grandparents (Gen-0)     
 //            |            |              |               |              
 //        F_SNAIL       G_SNAIL        H_SNAIL         I_SNAIL       Children (Gen-1)
 //   
 //                      FAMILIES INTERBREEDING
 //     F_SNAIL <---> H_SNAIL         G_SNAIL <---> I_SNAIL           As Parents (Gen-1)
 //        |             |               |             |                  
 //     J_SNAIL       K_SNAIL         L_SNAIL       M_SNAIL           Children/Grandchildren (Gen-2)
 //
 

    describe("Get Relationships: Self-Related, an Ex-mate, or completely-releated", () => {

        it("should be 'oneself' if the two snails are the same snail", async () => {

            let value
            await truffleAssert.passes(
                value = await snailToken.getRelationship(
                    A_SNAIL_ID, //of snail
                    A_SNAIL_ID  //to snail
                ),
                "Unable to get the relationship of the 2x snails!?"
            )
            const relationship = Object.keys(Relationship)[value]

            assert.deepStrictEqual(
                Number(value),
                Relationship.Oneself,
                `Expected to be 'Oneself' but rather Snail (id:${A_SNAIL_ID}) has Relationship.${relationship} to itself!!`
            )
        })

        it("should not be related if snails are not ex-partners, nor blood-family", async () => {

            let value
            await truffleAssert.passes(
                value = await snailToken.getRelationship(
                    A_SNAIL_ID, //of snail
                    E_SNAIL_ID  //to snail
                ),
                "Unable to get the relationship of the 2x snails!?"
            )
            const relationship = Object.keys(Relationship)[value]

            assert.deepStrictEqual(
                Number(value),
                Relationship.None,
                `Expected to be 'None' but rather Snail (id:${A_SNAIL_ID}) has Relationship.${relationship} to snail (id:${E_SNAIL_ID})!`
            )

        })

        it("should be ex-partners if they have produced offspring together", async () => {

            let value
            await truffleAssert.passes(
                value = await snailToken.getRelationship(
                    A_SNAIL_ID, //of snail
                    B_SNAIL_ID  //to snail
                ),
                "Unable to get the relationship of the 2x snails!?"
            )
            const relationship = Object.keys(Relationship)[value]

            assert.deepStrictEqual(
                Number(value),
                Relationship.ExPartner,
                `Expected to be 'ExPartner' but rather Snail (id:${A_SNAIL_ID}) has Relationship.${relationship} to snail (id:${B_SNAIL_ID})!`
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
                value = await snailToken.getRelationship(
                    A_SNAIL_ID, //of snail
                    F_SNAIL_ID  //to snail
                ),
                "Unable to get the relationship of the 2x snails!?"
            )
            const relationship = Object.keys(Relationship)[value]

            assert.deepStrictEqual(
                Number(value),
                Relationship.Mother,
                `Expected to be 'Mother' but rather Snail (id:${A_SNAIL_ID}) has Relationship.${relationship} to snail (id:${F_SNAIL_ID})!!`
            )
        })

        it("should be mother to their child (when mother==Gen1)", async () => {

            let value
            await truffleAssert.passes(
                value = await snailToken.getRelationship(
                    F_SNAIL_ID, //of snail
                    J_SNAIL_ID  //to snail
                ),
                "Unable to get the relationship of the 2x snails!?"
            )
            const relationship = Object.keys(Relationship)[value]

            assert.deepStrictEqual(
                Number(value),
                Relationship.Mother,
                `Expected to be 'Mother' but rather Snail (id:${F_SNAIL_ID}) has Relationship.${relationship} to snail (id:${V_SNAIL_ID})!!`
            )
        })

        it("should be father to their child (when father==Gen0)", async () => {

            let value
            await truffleAssert.passes(
                value = await snailToken.getRelationship(
                    B_SNAIL_ID, //of snail
                    F_SNAIL_ID  //to snail
                ),
                "Unable to get the relationship of the 2x snails!?"
            )
            const relationship = Object.keys(Relationship)[value]

            assert.deepStrictEqual(
                Number(value),
                Relationship.Father,
                `Expected to be 'Father' but rather Snail (id:${B_SNAIL_ID}) has Relationship.${relationship} to snail (id:${F_SNAIL_ID})!!`
            )
        })

        it("should be father of their child (when father==Gen1)", async () => {

            let value
            await truffleAssert.passes(
                value = await snailToken.getRelationship(
                    H_SNAIL_ID, //of snail
                    J_SNAIL_ID  //to snail
                ),
                "Unable to get the relationship of the 2x snails!?"
            )
            const relationship = Object.keys(Relationship)[value]

            assert.deepStrictEqual(
                Number(value),
                Relationship.Father,
                `Expected to be 'Father' but rather Snail (id:${H_SNAIL_ID}) has Relationship.${relationship} to snail (id:${V_SNAIL_ID})!!`
            )
        })
    
        it("should be child to their mother", async () => {

            let value
            await truffleAssert.passes(
                value = await snailToken.getRelationship(
                    F_SNAIL_ID, //of snail
                    A_SNAIL_ID  //to snail
                ),
                "Unable to get the relationship of the 2x snails!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.Child,
                `Expected to be 'Child' but rather Snail (id:${F_SNAIL_ID}) has Relationship.${relationship} to snail (id:${A_SNAIL_ID})!!`
            )
        })

        it("should be child of their father", async () => {

            let value
            await truffleAssert.passes(
                value = await snailToken.getRelationship(
                    F_SNAIL_ID, //of snail
                    B_SNAIL_ID  //to snail
                ),
                "Unable to get the relationship of the 2x snails!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.Child,
                `Expected to be 'Child' but rather Snail (id:${F_SNAIL_ID}) has Relationship.${relationship} to snail (id:${B_SNAIL_ID})!!`
            )
        })
    })


    describe("Get Immediate Direct-line Relationships: Grandparents", () => {

        it("should be grandmother-on-mums-side to child's mothered child", async () => {

            let value
            await truffleAssert.passes(
                value = await snailToken.getRelationship(
                    A_SNAIL_ID, //of snail
                    J_SNAIL_ID  //to snail
                ),
                "Unable to get the relationship of the 2x snails!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.GrandmotherOnMumsSide,
                `Expected to be 'GrandmotherOnMumsSide' but rather Snail (id:${A_SNAIL_ID}) has Relationship.${relationship} to snail (id:${J_SNAIL_ID})!!`
            )
        })

        it("should be grandmother-on-dads-side to child's fathered child", async () => {

            let value
            await truffleAssert.passes(
                value = await snailToken.getRelationship(
                    C_SNAIL_ID, //of snail
                    J_SNAIL_ID  //to snail
                ),
                "Unable to get the relationship of the 2x snails!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.GrandmotherOnDadsSide,
                `Expected to be 'GrandmotherOnDadsSide' but rather Snail (id:${C_SNAIL_ID}) has Relationship.${relationship} to snail (id:${J_SNAIL_ID})!!`
            )
        })

        it("should be grandfather-on-mums-side to child's mothered child", async () => {

            let value
            await truffleAssert.passes(
                value = await snailToken.getRelationship(
                    B_SNAIL_ID, //of snail
                    J_SNAIL_ID  //to snail
                ),
                "Unable to get the relationship of the 2x snails!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.GrandfatherOnMumsSide,
                `Expected to be 'GrandfatherOnMumsSide' but rather Snail (id:${B_SNAIL_ID}) has Relationship.${relationship} to snail (id:${J_SNAIL_ID})!!`
            )
        })

        it("should be grandfather-on-dads-side to child's fathered child", async () => {

            let value
            await truffleAssert.passes(
                value = await snailToken.getRelationship(
                    D_SNAIL_ID, //of snail
                    J_SNAIL_ID  //to snail
                ),
                "Unable to get the relationship of the 2x snails!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.GrandfatherOnDadsSide,
                `Expected to be 'GrandfatherOnDadsSide' but rather Snail (id:${D_SNAIL_ID}) has Relationship.${relationship} to snail (id:${J_SNAIL_ID})!!`
            )
        })
    })

    describe("Get Immediate Direct-line Relationships: Grandchildren", () => {

        it("should be grandchild to their mother's mother", async () => {

            let value
            await truffleAssert.passes(
                value = await snailToken.getRelationship(
                    J_SNAIL_ID, //of snail
                    A_SNAIL_ID  //to snail
                ),
                "Unable to get the relationship of the 2x snails!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.Grandchild,
                `Expected to be 'Grandchild' but rather Snail (id:${J_SNAIL_ID}) has Relationship.${relationship} to snail (id:${A_SNAIL_ID})!!`
            )
        })

        it("should be grandchild to their fathers's mother", async () => {
            
            let value
            await truffleAssert.passes(
                value = await snailToken.getRelationship(
                    J_SNAIL_ID, //of snail
                    C_SNAIL_ID  //to snail
                ),
                "Unable to get the relationship of the 2x snails!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.Grandchild,
                `Expected to be 'Grandchild' but rather Snail (id:${J_SNAIL_ID}) has Relationship.${relationship} to snail (id:${C_SNAIL_ID})!!`
            )

        })

        it("should be grandchild to their father's mother", async () => {

            let value
            await truffleAssert.passes(
                value = await snailToken.getRelationship(
                    J_SNAIL_ID, //of snail
                    B_SNAIL_ID  //to snail
                ),
                "Unable to get the relationship of the 2x snails!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.Grandchild,
                `Expected to be 'Grandchild' but rather Snail (id:${J_SNAIL_ID}) has Relationship.${relationship} to snail (id:${B_SNAIL_ID})!!`
            )
        })

        it("should be grandchild to their father's father", async () => {
            
            let value
            await truffleAssert.passes(
                value = await snailToken.getRelationship(
                    J_SNAIL_ID, //of snail
                    D_SNAIL_ID  //to snail
                ),
                "Unable to get the relationship of the 2x snails!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.Grandchild,
                `Expected to be 'Grandchild' but rather Snail (id:${J_SNAIL_ID}) has Relationship.${relationship} to snail (id:${D_SNAIL_ID})!!`
            )
        })
    })


    describe("Get Close Direct-line: Siblings & Half-Siblings", () => {

        it("should be full-siblings if snails mum & dad are switched (ie. same parents but opposite roles)", async () => {

            let value
            await truffleAssert.passes(
                value = await snailToken.getRelationship(
                    F_SNAIL_ID, //of snail
                    G_SNAIL_ID  //to snail
                ),
                "Unable to get the relationship of the 2x snails!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.FullSibling,
                `Expected to be 'FullSibling' but rather snail (id:${F_SNAIL_ID}) has Relationship.${relationship} to snail (id:${G_SNAIL_ID})!`
            )
        })

    })


    describe("Get Indirect Grandparents-line: FirstCousins (incl. once & twice removed)", () => {

        it("should be first-cousin to its mum's aunt/uncle's child", async () => {

            let value
            await truffleAssert.passes(
                value = await snailToken.getRelationship(
                    K_SNAIL_ID, //of snail
                    M_SNAIL_ID  //to snail
                ),
                "Unable to get the relationship of the 2x snails!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.FirstCousin,
                `Expected to be 'FirstCousin' but rather Snail (id:${K_SNAIL_ID}) has Relationship.${relationship} to snail (id:${M_SNAIL_ID})!!`
            )
        })

        it("should be first-cousin to its dad's aunt/uncle's child", async () => {

            let value
            await truffleAssert.passes(
                value = await snailToken.getRelationship(
                    J_SNAIL_ID, //of snail
                    M_SNAIL_ID  //to snail
                ),
                "Unable to get the relationship of the 2x snails!?"
            )
            const relationship = Object.keys(Relationship)[value]
    
            assert.deepStrictEqual(
                Number(value),
                Relationship.FirstCousin,
                `Expected to be 'FirstCousin' but rather Snail (id:${J_SNAIL_ID}) has Relationship.${relationship} to snail (id:${M_SNAIL_ID})!!`
            )

        })
    })


// *** Support Functions for setting up test data ***

    async function breedUntilBothProdueNewBorn(idMateA, idMateB, owner) {

        // Gather data used for pseudo-random breeding (seed),
        // to enable expected result to be calculated
        const genMateA = await getGenOf(idMateA)
        const genMateB = await getGenOf(idMateB)

        let mintedSnailsBeforeBreed
        await truffleAssert.passes(
            mintedSnailsBeforeBreed = await snailToken.totalSupply(),
            "Unable to get the amount of snails minted"
        )
        mintedSnailsBeforeBreed = Number(mintedSnailsBeforeBreed)

        // Breed until mating results in two new-borns (1x from each parent)
        let newBorns
        let numNewBorns = 0
        let txBreedResult
        let count = 0
        do {
            count++
            console.log(`Breed count: ${count} `)
            await truffleAssert.passes(
                txBreedResult = await snailToken.breed(
                    idMateA, //mateA
                    idMateB, //mateB
                    {from: owner}),
                "Snail owner was unable to mate their 2x snails"
            )
            // Determine the number of new-borns (0,1, or 2)
            const expected = await whoIsFertilisedTH(
                idMateA,
                idMateB,
                genMateA,
                genMateB,
                mintedSnailsBeforeBreed,
                txBreedResult
            )

            if (expected.fertilisedMateA || expected.fertilisedMateB) {
            
                truffleAssert.eventEmitted(txBreedResult, 'SnailsBorn', (ev) => {
                    newBorns = ev
                    numNewBorns = newBorns.babyIds.length
                    return true
                })
                console.log(`\t${numNewBorns}x new-borns`)
            }
            else {
                truffleAssert.eventNotEmitted(txBreedResult, 'SnailsBorn')
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
            `Internal Error in breedUntilBothProdueNewBorn() should have 2x snailIds but got: '${newBorns}'!!`
        )
        return newBorns.babyIds
    }

    async function getGenOf(snailId) {

        let snail
        await truffleAssert.passes(
            snail = await snailToken.getSnail(snailId),
            `Unable to getSnail of snailId: ${snailId}`
        )
        return Number(snail.age.generation)
    }

})