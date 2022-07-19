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


    function breed(uint256 personAId, uint256 personBId)
        override
        external
        whenNotPaused
    {
        require(personAId != personBId, "breed: With self!");
        require(_isApprovedOrOwner(msg.sender, personAId), "breed: mateA is not present!");
        require(_isApprovedOrOwner(msg.sender, personBId), "breed: mateB is not present!");
        
        // Determine which of the two mates conceive and so will have an baby.
        // NB as mates are haermaphrodites, they both may conceive (or only 1 of them or neither)
        (Conception[] memory conceptions,,,,,,,) = _whoConceives(personAId, personBId);

        // Mint any new-born babies (persons)
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

    function _whoConceives(
        uint256 mateAId, //tokenId
        uint256 mateBId  //tokenId
    )
        private
        view
        returns(
            Conception[] memory conceptions,
            uint256 atProbability,
            uint256 seed,
            uint256 pseudoRandom,
            uint256 blockTime,
            uint256 numFertilised,
            bool mateAFertilised,
            bool mateBFertilised
        )
    {
        blockTime = block.timestamp;

        (mateAFertilised, mateBFertilised, atProbability, seed, pseudoRandom) =
            _whoIsFertilised(
                mateAId, //tokenId
                mateBId, //tokenId
                blockTime
            );
        if (mateAFertilised) numFertilised++;
        if (mateBFertilised) numFertilised++;
    
        //Gather conception details
        if (numFertilised > 0) {

            conceptions = _matesConceive(
                mateAId, 
                mateBId,
                mateAFertilised,
                mateBFertilised
            );
        }
    }


    // *** NOTE: DEMEO CODE ONLY: THIS IS UNSAFE MANNER OF GENERATING PSEUDO-RANDOM NUMBERS ***
    function _whoIsFertilised(
        uint256 idMateA,  //tokenId
        uint256 idMateB,  //tokenId
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

        fertilityPercentage = _calculateFertility(
            _persons[idMateA].age.generation,
            _persons[idMateB].age.generation
        );

        //Are either (or both) mates fertilised?
        seed = blockTime + idMateA + idMateB + _personIdCounter;
        pseudoRandom =_calcPseudoRandom(4, seed); //2x 2-digit numbers 
        uint256 random = pseudoRandom;

        fertilisedMateA = (random % 100) < fertilityPercentage;
        random /= 100;
        fertilisedMateB = (random % 100) < fertilityPercentage;

        require(random/100 == 1, "_whoIsFertilisedIE: random fail!");
    }


    function _matesConceive(
        uint256 mateAId, 
        uint256 mateBId,
        bool mateAFertilised,
        bool mateBFertilised
    ) 
        private
        view
        returns(Conception[] memory conceptions)
    {
        require(mateAFertilised || mateBFertilised, "_matesConceive IE: No fertilisations!");
        uint numFertilised = (mateAFertilised && mateBFertilised) ? 2 : 1;

        // Determine details of each fertilisation (conception)
        conceptions = new Conception[](numFertilised);

        uint256 newGeneration =
            _persons[mateAId].age.generation > _persons[mateBId].age.generation ?
                _persons[mateAId].age.generation+1 :
                _persons[mateBId].age.generation+1;

        uint8 index;
        if (mateAFertilised == true) {
            conceptions[index] = Conception(
                {
                    generation: newGeneration,
                    mumId: mateAId,
                    dadId: mateBId
                }
            );
            index++;
        }
        if (mateBFertilised == true) {
            conceptions[index] = Conception(
                {
                    generation: newGeneration,
                    mumId: mateBId,
                    dadId: mateAId
                }
            );
            index++;
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