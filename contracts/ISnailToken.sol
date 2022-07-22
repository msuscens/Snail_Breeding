//SPDX-License-Identifier: UNLICENSED
// Written by Mark Suscens, Copyright 2022, all rights reserved.
pragma solidity 0.8.13;

enum Relationship {None, ExPartner, Oneself, Mother, Father, Child, FullSibling, HalfSibling,
    GrandmotherOnMumsSide, GrandmotherOnDadsSide, GrandfatherOnMumsSide, GrandfatherOnDadsSide, 
    Grandchild, UncleAuntOnMumsSide, UncleAuntOnDadsSide, NephewNeice, GrandNephewNeice,
    FirstCousin, FirstCousinOnceRemoved, FirstCousinTwiceRemoved
}

interface ISnailToken 
{
    struct Snail {
        Age age;
        uint256 mumId;
        uint256 dadId;
    }

    struct Age {
        uint256 generation;
        uint256 birthTime;
    }

    struct Conception {
        uint256 generation;
        uint256 mumId;  //tokenId
        uint256 dadId;  //tokenId
    }


    event SnailsMated(
        uint256 snailIdMateA,
        uint256 snailIdMateB,
        bool mateAFertilised,
        bool mateBFertilised,
        Conception[] conceptions
    );

    event SnailsBorn(
        address owner,
        uint256[] babyIds
    );


    /*
    * Mints a set of new snails (based on conception details), giving the
    * new-born snails to the specified owner.
    * Requirement: Only contract owner may execute this function.
    * Requirement: The owner must not be the 0 address
    * Requirement: If generation-0 to be minted, both parent Ids must == 0
    * Event emitted: Transfer (for each newly minted snail token) 
    */
    function mintSnailsTo(
        address owner,
        Conception[] memory fromConceptions
    )
        external
        returns (uint256[] memory newBornIds);


    /*
    * Breed two snails (who are hermaphrodites), so that either may conceive and mint a new-born snail.
    * Therefore both, one, or neither of the 2x mating snails may create a new-born snail (as result of breeding)
    * Note: New-born chance is governed by _FERTILITY_BASE_PERCENTAGE, modified by mate's generations.
    * Requirement: A snail is unable to breed without a mate.
    * Requirement: A snail is unable to mate with itself.
    * Requirement: All mating snails must be present (ie. caller is owner or approver).
    * Event emitted: SnailsBorn (only if 1+ new-born snails are minted)
    */
    function breed(uint256 mateAId, uint256 mateBId) external;

    /*
    * Get all the Snail's details of the specified snail token.
    * Throws if the specified snail doesn't exist
    * Returns: Struct of snail's details.
    */
    function getSnail(uint256 snailId)
        external
        view
        returns (Snail memory);

    /*
    * Get relationship of a snail to another snail.  
    * Requirement: Both snails must exist
    * Returns: Relationship (enum), if not related returns Relationship.None
    */
    function getRelationship(uint256 snailId, uint256 toSnailId)
        external
        view
        returns (Relationship relationship);

}