//SPDX-License-Identifier: UNLICENSED
// Written by Mark Suscens, Copyright 2022, all rights reserved.
pragma solidity 0.8.13;

enum Relationship {None, ExPartner, Oneself, Mother, Father, Child, FullSibling, HalfSibling,
    GrandmotherOnMumsSide, GrandmotherOnDadsSide, GrandfatherOnMumsSide, GrandfatherOnDadsSide, 
    Grandchild, UncleAuntOnMumsSide, UncleAuntOnDadsSide, NephewNeice, GrandNephewNeice,
    FirstCousin, FirstCousinOnceRemoved, FirstCousinTwiceRemoved
}
enum Status {Valid, Repeated, LacksEnergy, Immature, NotAdult, OldestAgeGroup,
    PairedWithSelf, PairedAlready, PairedWithAnotherSubspecies,
    PairedWithAnotherAgeGroup, PairedWithCloseFamily
}

interface IPersonToken 
{
    struct Person {
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

    event BabiesBorn(
        address owner,
        uint256[] babyIds,
        Conception[] provenance
    );


    /*
    * Mints a set of new persons (based on conception details), giving the
    * new-borns to the specified owner.
    * Requirement: Only contract owner may execute this function.
    * Requirement: The owner must not be the 0 address
    * Requirement: If generation-0 to be minted, both parent Ids must be 0
    * Event emitted: Transfer (for each newly minted person token) 
    */
    function mintPersonsTo(
        address owner,
        Conception[] memory fromConceptions
    )
        external
        returns (uint256[] memory newBornIds);


    /*
    * Breed one or more pairs of persons, with a chance that each mating pair
    * may each produce a new-born.
    * Note: New-born chance is governed by _FERTILITY_BASE_PERCENTAGE, modified
    *   by the mate's generations.
    * Requirement: A person is unable to breed without a mate.
    * Requirement: A person is unable to mate with itself.
    * Requirement: All mating persons must be present (ie. caller is owner or renter).
    * Requirement: No Person in a batch breed may be specified more than once.
    * Requirement: Amount breading person pairs <= PersonToken's _BATCH_MATING_PAIRS_LIMIT
    * Requirement: A person must only be in one mating pair (in a breed tx).
    * Event emitted: BabiesBorn (only if 1+ new-borns are minted)
    */
    function breed(uint256[] calldata mateAIds, uint256[] calldata mateBIds) external;

    /*
    * Get all the Person's details of the specified person token.
    * Throws if the specified person doesn't exist
    * Returns: Struct of person's details.
    */
    function getPerson(uint256 personId)
        external
        view
        returns (Person memory);

    /*
    * Get relationship of a person compare to another person.  
    * Requirement: Both persons must exist
    * Returns: Relationship (enum), if not related returns Relationship.None
    */
    function getRelationship(uint256 personId, uint256 toPersonId)
        external
        view
        returns (Relationship relationship);

}