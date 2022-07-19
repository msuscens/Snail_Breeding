//SPDX-License-Identifier: UNLICENSED
// Written by Mark Suscens, Copyright 2022, all rights reserved.
pragma solidity 0.8.13;

enum Relationship {None, ExPartner, Oneself, Mother, Father, Child, FullSibling, HalfSibling,
    GrandmotherOnMumsSide, GrandmotherOnDadsSide, GrandfatherOnMumsSide, GrandfatherOnDadsSide, 
    Grandchild, UncleAuntOnMumsSide, UncleAuntOnDadsSide, NephewNeice, GrandNephewNeice,
    FirstCousin, FirstCousinOnceRemoved, FirstCousinTwiceRemoved
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
    * Requirement: If generation-0 to be minted, both parent Ids must == 0
    * Event emitted: Transfer (for each newly minted person token) 
    */
    function mintPersonsTo(
        address owner,
        Conception[] memory fromConceptions
    )
        external
        returns (uint256[] memory newBornIds);


    /*
    * Breed two people (who are haemaphrodites), so either may conceive and mint a baby (new-born person).
    * Note: New-born chance is governed by _FERTILITY_BASE_PERCENTAGE, modified by mate's generations.
    * Requirement: A person is unable to breed without a mate.
    * Requirement: A person is unable to mate with itself.
    * Requirement: All mating persons must be present (ie. caller is owner or approver).
    * Event emitted: BabiesBorn (only if 1+ new-born persons are minted)
    */
    function breed(uint256 mateAId, uint256 mateBId) external;

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