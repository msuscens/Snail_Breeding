//SPDX-License-Identifier: UNLICENSED
// Written by Mark Suscens, Copyright 2022, all rights reserved.
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./IPersonToken.sol";

bytes4 constant _ERC721_RECEIVED =
    bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
bytes4 constant _INTERFACE_ID_ERC721 = 0x80ac58cd;
bytes4 constant _INTERFACE_ID_ERC165 = 0x01ffc9a7;
// Note: bytes4(keccak256('supportsInterface(bytes4) == 0x01ffc9a7'));

uint256 constant _BATCH_MATING_PAIRS_LIMIT = 10;
uint256 constant _FERTILITY_BASE_PERCENTAGE = 80;  
uint256 constant _MINIMUM_FERTILITY_PERCENTAGE = 5;


contract PersonToken is
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721HolderUpgradeable,
    PausableUpgradeable,
    OwnableUpgradeable,
    IPersonToken
{
    // Mapping from person's tokenId => Person record 
    mapping (uint256 => Person) private _persons;
    uint256 private _personIdCounter;


// Constructor
    // Initializer for the upgradeable contract (instead of constructor) 
    // that can only be executed once (that must be done upon deployment)
    function init_PersonToken(
        string memory tokenName, 
        string memory tokenSymbol
    )
        public
        initializer
    {
        __ERC721_init(tokenName, tokenSymbol);
        __ERC721Enumerable_init();
        __ERC721Holder_init();
        __Pausable_init();
        __Ownable_init();
    }


// External functions

    function mintPersonsTo(
        address owner,
        Conception[] memory fromConceptions
    )
        override
        external
        onlyOwner
        returns (uint256[] memory newBornIds)
    {
        require(owner != address(0), "mintPersonsTo: 0 address!");
        require(fromConceptions.length > 0, "mintPersonsTo: No conception!");

        newBornIds = _mintPersonsTo(owner, fromConceptions);
    }


    function breed(uint256[] calldata personAIds, uint256[] calldata personBIds)
        override
        external
        whenNotPaused
    {
        // Check input parameters are in range
        require(
            personAIds.length == personBIds.length,
            "breed: Mates not all paired!"
        );
        require(personAIds.length > 0, "breed: No persons!");
        require(
            personAIds.length <= _BATCH_MATING_PAIRS_LIMIT,
            "breed: Mating pairs > limit!"
        );

        // Check all persons are owned, rented by caller (or has token operator approval)
        require(
            _areAllPresent(personAIds),
            "breed: MateAs not all present!"
        );
        require(
            _areAllPresent(personBIds),
            "breed: MateBs not all present!"
        );

        //Validate mating pairs, are adults, have energy, same subspecies etc. 
        ( Status validity, uint256[][2] memory mateAs, uint256[][2] memory mateBs ) = 
            _collateValidMates(personAIds, personBIds);
        require(validity == Status.Valid, "breed: Invalid mates!");  


        // Determine which persons have conceived
        (Conception[] memory conceptions,,,,,,,) = 
            _whoAreFertilised(mateAs, mateBs);


        // Any new-borns are minted
        if (conceptions.length > 0) {

            uint256[] memory newBornIds = _mintPersonsTo(msg.sender, conceptions);

            require(
                newBornIds.length == conceptions.length,
                "breedIE: conceptions!=newBorns!"
            );
            emit BabiesBorn(msg.sender, newBornIds, conceptions);
        }
    }


    function getPerson(uint256 personId)
        override
        external
        view
        returns (Person memory)

    {
        require(_exists(personId), "getPerson: No such personId!");
        return (_persons[personId]);
    }


    function getRelationship(uint256 personId, uint256 toPersonId)
        external
        view
        returns (Relationship relationship)
    {
        require(_exists(personId), "getRelationship: No person!");
        require(_exists(toPersonId), "getRelationship: No toPerson!");
        return (_getRelationship(personId, toPersonId));
    }



// Public functions

    // Functions to pause or unpause all functions that have
    // the whenNotPaused or whenPaused modify applied on them
    function pause() public onlyOwner whenNotPaused {
        _pause();
    }

    function unpause() public onlyOwner whenPaused {
        _unpause();
    }


    // IERC165 
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(
            ERC721Upgradeable,
            ERC721EnumerableUpgradeable
        )
        returns (bool)
    {
      return (
        interfaceId == _INTERFACE_ID_ERC721 ||
        interfaceId == _INTERFACE_ID_ERC165 ||
        super.supportsInterface(interfaceId)
      );
    }


// Internal  functions

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        virtual
        override(
            ERC721Upgradeable,
            ERC721EnumerableUpgradeable
        )
        whenNotPaused
    {
        super._beforeTokenTransfer(from, to, amount);
    }


// Private functions

    function _mintPersonsTo(
        address owner,
        Conception[] memory fromConceptions
    )
        private
        returns (uint256[] memory newBornIds)
    {
        //Mint each person
        newBornIds = new uint256[](fromConceptions.length);
        for (uint8 i=0; i < fromConceptions.length; i++) {

            Person memory person = Person(
                {
                    age: Age(
                        {
                            birthTime: block.timestamp,
                            generation: fromConceptions[i].generation
                        }
                    ),
                    mumId: fromConceptions[i].mumId,
                    dadId: fromConceptions[i].dadId
                }
            );
            newBornIds[i] = _personIdCounter;
            _persons[_personIdCounter] = person;
            _personIdCounter++;

            _safeMint(owner, newBornIds[i]);
        }
    }


    function _areAllPresent(uint256[] calldata personIds)
        private
        view
        returns (bool allPresent)
    {
        for (uint8 i=0; i < personIds.length; i++)
        {
            if (_isPresent(personIds[i]) == false) {
                return false;
            }
        }
        return true;
    }


    function _isPresent(uint256 personId)
        private
        view
        returns (bool present)
    {
        if (_isApprovedOrOwner(msg.sender, personId)) {
            return true;
        } else return false;
    }


    function _collateValidMates(
        uint256[] calldata personAIds,
        uint256[] calldata personBIds
    )
        private
        view
        returns (
            Status validity,
            uint256[][2] memory mateAs,
            uint256[][2] memory mateBs
        )
    {
        validity = _areValidMates(personAIds, personBIds);
        if (validity == Status.Valid) {

            mateAs[0] = new uint256[](personAIds.length); //Person Ids (for mateA)
            mateAs[1] = new uint256[](personAIds.length); //Generation (of mateA)
            mateBs[0] = new uint256[](personBIds.length); //Person Ids (for mateB)
            mateBs[1] = new uint256[](personBIds.length); //Generation (of mateB)

            //Collate each mating pair of persons...
            for (uint8 i=0; i< personAIds.length; i++) 
            {
                //Mate's personId & dnaId
                mateAs[0][i] = personAIds[i];
                mateAs[1][i] = _persons[personAIds[i]].age.generation;
                mateBs[0][i] = personBIds[i];
                mateBs[1][i] = _persons[personBIds[i]].age.generation;
            }
        }
    }


    function _areValidMates(
        uint256[] calldata mateAIds,
        uint256[] calldata mateBIds
    )
        private
        view
        returns (Status validity)
    {
        //Check that all mateing pairs are invalid
        for (uint8 i=0; i< mateAIds.length; i++) 
        {
            if (mateAIds[i] == mateBIds[i]) return Status.PairedWithSelf;

            if (_areCloseBloodRelatives(mateAIds[i], mateBIds[i]))
                return Status.PairedWithCloseFamily;
        }
        if (_areAllDifferent(mateAIds, mateBIds) == false)
            return Status.PairedAlready;

        return Status.Valid;
    }


    function _areCloseBloodRelatives(
        uint256 personId, 
        uint256 toPersonId
    )
        private
        view
        returns (bool)
    {

        return (
            personId == toPersonId || //self
            _isMother(personId, toPersonId) ||
            _isFather(personId, toPersonId) ||
            _isChild(personId, toPersonId) ||
            _isFullSibling(personId, toPersonId) ||
            _isHalfSibling(personId, toPersonId) ||
            _isGrandmotherOnMumsSide(personId, toPersonId) ||
            _isGrandmotherOnDadsSide(personId, toPersonId) ||
            _isGrandfatherOnMumsSide(personId, toPersonId) ||
            _isGrandfatherOnDadsSide(personId, toPersonId) ||
            _isGrandchild(personId, toPersonId) ||
            _isUncleAuntOnMumsSide(personId, toPersonId) ||
            _isUncleAuntOnDadsSide(personId, toPersonId) ||
            _isNephewNeice(personId, toPersonId) ||
            _isGrandNephewNeice(personId, toPersonId) ||
            _isFirstCousin(personId, toPersonId) ||
            _isFirstCousinOnceRemoved(personId, toPersonId) ||
            _isFirstCousinTwiceRemoved(personId, toPersonId)
        );
    }

    function _areAllDifferent(
        uint256[] calldata valueSetA,
        uint256[] calldata valueSetB
    )
        private pure returns (bool)
    {
        if (_areDifferent(valueSetA) == false) return false;
        if (_areDifferent(valueSetB) == false) return false;

        for (uint256 i=0; i < valueSetA.length; i++) {
            if (_occursInExactly(valueSetB, valueSetA[i],0) == false) {
                return false;
            }
        }
        return true;
    }


    function _areDifferent(uint256[] calldata valueSet)
        private pure returns (bool)
    {
        for (uint256 i=0; i<valueSet.length; i++) {
            if (_occursInExactly(valueSet,valueSet[i],1) == false) return false;
        }
        return true;
    }


    function _occursInExactly(
        uint256[] calldata valueSet,
        uint256 value,
        uint256 times
    )
        private pure returns (bool)
    {
        uint256 count;
        for(uint256 i=0; i<valueSet.length; i++) {
            if (valueSet[i] == value) count++;
        }
        if (count == times) return true;
        return false;
    }




    function _whoAreFertilised(
        uint256[][2] memory mateAs,  //tokenIds & generations
        uint256[][2] memory mateBs  //tokenIds & generations
    )
        private
        view
        returns(
            Conception[] memory conceptions,
            uint256[] memory atProbability,
            uint256[] memory seed,
            uint256[] memory pseudoRandom,
            uint256 blockTime,
            uint256 numFertilised,
            bool[] memory mateAFertilisations,
            bool[] memory mateBFertilisations
        )
    {
        require(mateAs[0].length == mateBs[0].length, "whoAreFertilised: AB Id pairs!");
        require(mateAs[0].length > 0, "whoAreFertilised: No mates!");
        require(mateAs[1].length == mateBs[1].length, "whoAreFertilised: Num A&B Gens!");
        require(mateAs[1].length == mateAs[0].length, "whoAreFertilised: Num Gens!=Ids!");

        mateAFertilisations = new bool[](mateAs[0].length);
        mateBFertilisations = new bool[](mateBs[0].length);
        atProbability = new uint256[](mateAs[0].length);
        seed = new uint256[](mateAs[0].length);
        pseudoRandom = new uint256[](mateAs[0].length);

        blockTime = block.timestamp;

        //Determine which mates are fertilised (checking each mating pair in turn)
        for (uint256 i=0; i < mateAs[0].length; i++) {

            (mateAFertilisations[i], mateBFertilisations[i], atProbability[i], seed[i], pseudoRandom[i]) =
                _whoIsFertilised(
                    mateAs[0][i], //tokenId
                    mateBs[0][i], //tokenId
                    mateAs[1][i], //generation
                    mateBs[1][i], //generation
                    blockTime
                );

            if (mateAFertilisations[i]) numFertilised++;
            if (mateBFertilisations[i]) numFertilised++;
        }
    
        //Gather conception details
        if (numFertilised > 0) {

            conceptions = _matesConceive(
                numFertilised,
                mateAFertilisations,
                mateBFertilisations,
                mateAs, 
                mateBs 
            );
        }
    }


    function _whoIsFertilised(
        uint256 idMateA,  //tokenId
        uint256 idMateB,  //tokenId
        uint256 genMateA, //generation
        uint256 genMateB, //generation
        uint256 blockTime
    )
        private
        view
        returns(
            bool fertilisedMateA,
            bool fertilisedMateB,
            uint256 fertilityPercentage,
            uint256 seed,
            uint256 pseudoRandom
        )
    {
        require(idMateA != idMateB, "_whoIsFertilised: Only 1x Mate!");

        fertilityPercentage = _calculateFertility(genMateA, genMateB);

        //Does either (or both) of mates get fertilised?
        seed = blockTime + idMateA + idMateB + _personIdCounter;
        pseudoRandom =_calcPseudoRandom(4, seed); //2x 2-digit numbers 
        uint256 random = pseudoRandom;

        fertilisedMateA = (random % 100) < fertilityPercentage;
        random /= 100;
        fertilisedMateB = (random % 100) < fertilityPercentage;

        require(random/100 == 1, "_whoIsFertilisedIE: random fail!");
    }


    function _matesConceive(
        uint256 numFertilised,
        bool[] memory mateAFertilisations,
        bool[] memory mateBFertilisations,
        uint256[][2] memory mateAs, 
        uint256[][2] memory mateBs
    ) 
        private
        pure
        returns(Conception[] memory conceptions)
    {
        require(numFertilised > 0, "_matesConceive IE: No fertilisations!");
        require(mateAFertilisations.length > 0, "_matesConceive IE: No mates!");

        require(mateAFertilisations.length == mateBFertilisations.length, "_matesConceive IE: Fert. params!");
        require(mateAFertilisations.length == mateAs[0].length, "_matesConceiveIE: Fert/Id pairs!");
        require(mateAs[0].length == mateBs[0].length, "_matesConceiveIE:Mates Id pairs!");

        // Determine details of each fertilisation (conception)
        conceptions = new Conception[](numFertilised);
        require(
            numFertilised == conceptions.length,
            "_matesConceiveIE: Invarient!"
        );

        uint8 index;
        uint256 newGeneration;
        for (uint8 i=0; i < mateAFertilisations.length; i++) {

            if (mateAFertilisations[i] || mateBFertilisations[i] ) {

                // Calculate Generation (highest of mum/dads generation, plus one)
                newGeneration = mateAs[1][i] > mateBs[1][i] ?
                    mateAs[1][i]+1 : mateBs[1][i]+1;
            }

            if (mateAFertilisations[i] == true) {
                conceptions[index] = Conception(
                    {
                        generation: newGeneration,
                        mumId: mateAs[0][i],
                        dadId: mateBs[0][i]
                    }
                );
                index++;
            }
            if (mateBFertilisations[i] == true) {
                conceptions[index] = Conception(
                    {
                        generation: newGeneration,
                        mumId: mateBs[0][i],
                        dadId: mateAs[0][i]
                    }
                );
                index++;
            }
        }
        require(index == numFertilised, "_matesConceive IE: index fail!");
    }    


    function _calculateFertility(uint256 genMateA, uint256 genMateB)
        private
        pure
        returns (uint256 fertilityPercentage)
    {
        uint256 fertilityReduction = (genMateA + genMateB) / 2;

        if (_FERTILITY_BASE_PERCENTAGE > 
                (fertilityReduction + _MINIMUM_FERTILITY_PERCENTAGE)
            )
        {
            fertilityPercentage = _FERTILITY_BASE_PERCENTAGE - fertilityReduction;
        }
        else
        {
            fertilityPercentage = _MINIMUM_FERTILITY_PERCENTAGE;
        }
    }


    function _calcPseudoRandom(uint256 numDigits, uint256 seed)
        private
        pure
        returns (uint256 random)
    {
        require(numDigits>0, "_calcPseudoRandom: Of 0 digits!");
        require(numDigits <= 76, "_calcPseudoRandom IE:>76 digits!");

        uint256 value = uint256( keccak256(abi.encodePacked(seed)) );

        random = value % (10**numDigits);

        // Allow for most-sig digit(s) to be '0'
        random += 10**numDigits; //Add leading '1' digit
    }


    // function _isExPartner(
    //     uint256 personId, 
    //     uint256 toPersonId
    // )
    //     private
    //     view
    //     returns (bool)
    // {
    //     uint256 nextId = (personId > toPersonId ) ? personId: toPersonId;

    //     while (_persons[nextId].dnaId != 0) { // there's another person

    //         if (_persons[nextId].mumId == personId && _persons[nextId].dadId == toPersonId ||
    //             _persons[nextId].mumId == toPersonId && _persons[nextId].dadId == personId)
    //             return true;
    //         nextId++;
    //     }
    //     return false;
    // }


    function _isMother(
        uint256 personId, 
        uint256 toPersonId
    )
        private
        view
        returns (bool)
    {
        if (_isGen0(toPersonId)) return false;
        if (_persons[toPersonId].mumId == personId)
            return true;
        return false;
    }


    function _isFather(
        uint256 personId, 
        uint256 toPersonId
    )
        private
        view
        returns (bool)
    {
        if (_isGen0(toPersonId)) return false;
        if (_persons[toPersonId].dadId == personId)
            return true;
        return false;
    }


    function _isChild(
        uint256 personId, 
        uint256 toPersonId
    )
        private
        view
        returns (bool)
    {
        if (_isMother(toPersonId, personId) ||
            _isFather(toPersonId, personId))
            return true;
        return false;
    }


    function _isFullSibling(
        uint256 personId, 
        uint256 toPersonId
    )
        private
        view
        returns (bool)
    {
        if (_isGen0(personId) || _isGen0(toPersonId)) return false;

        if ((_persons[personId].mumId == _persons[toPersonId].mumId && //Same mum
            _persons[personId].dadId == _persons[toPersonId].dadId) || //Same dad
            (_persons[personId].mumId == _persons[toPersonId].dadId && //one's mum is other's dad
            _persons[personId].dadId == _persons[toPersonId].mumId ))  //one's dad is other's mum
            return true;
        return false;
    }


    function _isHalfSibling(
        uint256 personId, 
        uint256 toPersonId
    )
        private
        view
        returns (bool)
    {
        if (_isGen0(personId) || _isGen0(toPersonId)) return false;

        if ( //Share either a mum or dad
            (_persons[personId].mumId == _persons[toPersonId].mumId && //Same mum and
            _persons[personId].dadId != _persons[toPersonId].dadId) || //not same dad OR
            (_persons[personId].dadId == _persons[toPersonId].dadId && //Same dad and
            _persons[personId].mumId != _persons[toPersonId].mumId) || //not same mum
            //OR 1x common parent, but mum is the others dad or visa versa
            (_persons[personId].mumId == _persons[toPersonId].dadId && //one's mum is other's dad and
            _persons[personId].dadId != _persons[toPersonId].mumId) || //not one's dad is other's mum OR
            (_persons[personId].dadId == _persons[toPersonId].mumId && //one's dad is other's mum and
            _persons[personId].mumId != _persons[toPersonId].dadId))   //not one's mum is other's dad
            return true;
        return false;
    }


    function _isGrandmotherOnMumsSide(
        uint256 personId, 
        uint256 toPersonId
    )
        private
        view
        returns (bool)
    {
        if (_isMother(personId, _persons[toPersonId].mumId))
            return true;
        return false;
    }


    function _isGrandmotherOnDadsSide(
        uint256 personId, 
        uint256 toPersonId
    )
        private
        view
        returns (bool)
    {
        if (_isMother(personId, _persons[toPersonId].dadId))
            return true;
        return false;
    }


    function _isGrandfatherOnMumsSide(
        uint256 personId, 
        uint256 toPersonId
    )
        private
        view
        returns (bool)
    {
        if (_isFather(personId, _persons[toPersonId].mumId))
            return true;
        return false;
    }


    function _isGrandfatherOnDadsSide(
        uint256 personId, 
        uint256 toPersonId
    )
        private
        view
        returns (bool)
    {
        if (_isFather(personId, _persons[toPersonId].dadId))
            return true;
        return false;
    }


    function _isGrandchild(
        uint256 personId, 
        uint256 toPersonId
    )
        private
        view
        returns (bool)
    {
        if (_isMother(toPersonId, _persons[personId].mumId) ||
            _isMother(toPersonId, _persons[personId].dadId) ||
            _isFather(toPersonId, _persons[personId].dadId) ||
            _isFather(toPersonId, _persons[personId].mumId))
            return true;
        return false;
    }


    function _isUncleAuntOnMumsSide(
        uint256 personId, 
        uint256 toPersonId
    )
        private
        view
        returns (bool)
    {
        if (_isFullSibling(personId, _persons[toPersonId].mumId) ||
            _isHalfSibling(personId, _persons[toPersonId].mumId))
            return true;
        return false;
    }


    function _isUncleAuntOnDadsSide(
        uint256 personId, 
        uint256 toPersonId
    )
        private
        view
        returns (bool)
    {
        if (_isFullSibling(personId, _persons[toPersonId].dadId) ||
            _isHalfSibling(personId, _persons[toPersonId].dadId)) 
            return true;
        return false;
    }


    function _isNephewNeice(
        uint256 personId, 
        uint256 toPersonId
    )
        private
        view
        returns (bool)
    {
        if (_isUncleAuntOnMumsSide(toPersonId, personId) ||
            _isUncleAuntOnDadsSide(toPersonId, personId)) 
            return true;
        return false;
    }


    function _isGrandNephewNeice(
        uint256 personId, 
        uint256 toPersonId
    )
        private
        view
        returns (bool)
    {
        if (_isNephewNeice(_persons[personId].mumId, toPersonId) ||
            _isNephewNeice(_persons[personId].dadId, toPersonId)) 
            return true;
        return false;
    }


    function _isFirstCousin(
        uint256 personId, 
        uint256 toPersonId
    )
        private
        view
        returns (bool)
    {

        if ((_isUncleAuntOnMumsSide(_persons[personId].mumId, toPersonId) ||
            _isUncleAuntOnMumsSide(_persons[personId].dadId, toPersonId)) ||
            (_isUncleAuntOnDadsSide(_persons[personId].mumId, toPersonId) ||
            (_isUncleAuntOnDadsSide(_persons[personId].dadId, toPersonId))))
            return true;

        return false;
    }


    function _isFirstCousinOnceRemoved(
        uint256 personId, 
        uint256 toPersonId
    )
        private
        view
        returns (bool)
    {

        if (_isFirstCousin(_persons[personId].mumId, toPersonId) ||
            _isFirstCousin(_persons[personId].dadId, toPersonId)) 
            return true;

        return false;
    }


    function _isFirstCousinTwiceRemoved(
        uint256 personId, 
        uint256 toPersonId
    )
        private
        view
        returns (bool)
    {

        if (_isFirstCousinOnceRemoved(_persons[personId].mumId, toPersonId) ||
            _isFirstCousinOnceRemoved(_persons[personId].dadId, toPersonId)) 
            return true;

        return false;
    }

    function _isGen0(uint256 personId)
        private view returns (bool)
    {
        if (_persons[personId].age.generation == 0) return true;
        return false;
    }

    function _getRelationship(
        uint256 personId,
        uint256 toPersonId
    )
        private
        view
        returns (Relationship relationship)
    {
        // Check for close direct and indirect blood relationships
        // (ie. from Grandparents to grandchilden & first cousins)
        if (personId == toPersonId) return Relationship.Oneself;
        if (_isMother(personId, toPersonId)) return Relationship.Mother;
        if (_isFather(personId, toPersonId)) return Relationship.Father;
        if (_isChild(personId, toPersonId)) return Relationship.Child;
        if (_isFullSibling(personId, toPersonId)) return Relationship.FullSibling;
        if (_isHalfSibling(personId, toPersonId)) return Relationship.HalfSibling;
        if (_isGrandmotherOnMumsSide(personId, toPersonId)) return Relationship.GrandmotherOnMumsSide;
        if (_isGrandmotherOnDadsSide(personId, toPersonId)) return Relationship.GrandmotherOnDadsSide;
        if (_isGrandfatherOnMumsSide(personId, toPersonId)) return Relationship.GrandfatherOnMumsSide;
        if (_isGrandfatherOnDadsSide(personId, toPersonId)) return Relationship.GrandfatherOnDadsSide;
        if (_isGrandchild(personId, toPersonId)) return Relationship.Grandchild;
        if (_isUncleAuntOnMumsSide(personId, toPersonId)) return Relationship.UncleAuntOnMumsSide;
        if (_isUncleAuntOnDadsSide(personId, toPersonId)) return Relationship.UncleAuntOnDadsSide;
        if (_isNephewNeice(personId, toPersonId)) return Relationship.NephewNeice;
        if (_isGrandNephewNeice(personId, toPersonId)) return Relationship.GrandNephewNeice;
        if (_isFirstCousin(personId, toPersonId)) return Relationship.FirstCousin;
        if (_isFirstCousinOnceRemoved(personId, toPersonId)) return Relationship.FirstCousinOnceRemoved;
        if (_isFirstCousinTwiceRemoved(personId, toPersonId)) return Relationship.FirstCousinTwiceRemoved;

        // Check for distant direct and indirect relationships
        // (ie. related to Great-great-grandparents and their descendents)

        return (Relationship.None);
    }
}