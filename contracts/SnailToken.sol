//SPDX-License-Identifier: UNLICENSED
// Written by Mark Suscens, Copyright 2022, all rights reserved.
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./ISnailToken.sol";

bytes4 constant _ERC721_RECEIVED =
    bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
bytes4 constant _INTERFACE_ID_ERC721 = 0x80ac58cd;
bytes4 constant _INTERFACE_ID_ERC165 = 0x01ffc9a7;
// Note: bytes4(keccak256('supportsInterface(bytes4) == 0x01ffc9a7'));

uint256 constant _FERTILITY_BASE_PERCENTAGE = 80;  
uint256 constant _MINIMUM_FERTILITY_PERCENTAGE = 5;


contract SnailToken is
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721HolderUpgradeable,
    PausableUpgradeable,
    OwnableUpgradeable,
    ISnailToken
{
    // Mapping from snail's tokenId => Snail record 
    mapping (uint256 => Snail) private _snails;
    uint256 private _snailIdCounter;


// Constructor
    // Initializer for the upgradeable contract (instead of constructor) 
    // that can only be executed once (that must be done upon deployment)
    function init_SnailToken(
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

    function mintSnailsTo(
        address owner,
        Conception[] memory fromConceptions
    )
        override
        external
        onlyOwner
        returns (uint256[] memory newBornIds)
    {
        require(owner != address(0), "mintSnailsTo: 0 address!");
        require(fromConceptions.length > 0, "mintSnailsTo: No conception!");

        newBornIds = _mintSnailsTo(owner, fromConceptions);
    }


    function breed(uint256 snailAId, uint256 snailBId)
        override
        external
        whenNotPaused
    {
        require(snailAId != snailBId, "breed: With self!");
        require(_isApprovedOrOwner(msg.sender, snailAId), "breed: mateA is not present!");
        require(_isApprovedOrOwner(msg.sender, snailBId), "breed: mateB is not present!");
        
        // Determine which of the two mates conceive and so will give birth to a new-born snail.
        // NB as mates are haermaphrodites, they both may conceive (or only 1 of them or neither)
        (Conception[] memory conceptions,,,,,,,) = _whoConceives(snailAId, snailBId);

        // Mint any new-born snails
        if (conceptions.length > 0) {

            uint256[] memory newBornIds = _mintSnailsTo(msg.sender, conceptions);

            require(
                newBornIds.length == conceptions.length,
                "breedIE: conceptions!=newBorns!"
            );
            emit SnailsBorn(msg.sender, newBornIds, conceptions);
        }
    }


    function getSnail(uint256 snailId)
        override
        external
        view
        returns (Snail memory)

    {
        require(_exists(snailId), "getSnail: No such snailId!");
        return (_snails[snailId]);
    }


    function getRelationship(uint256 snailId, uint256 toSnailId)
        external
        view
        returns (Relationship relationship)
    {
        require(_exists(snailId), "getRelationship: No snail!");
        require(_exists(toSnailId), "getRelationship: No toSnail!");
        return (_getRelationship(snailId, toSnailId));
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

    function _mintSnailsTo(
        address owner,
        Conception[] memory fromConceptions
    )
        private
        returns (uint256[] memory newBornIds)
    {
        //Mint each snail
        newBornIds = new uint256[](fromConceptions.length);
        for (uint8 i=0; i < fromConceptions.length; i++) {

            Snail memory snail = Snail(
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
            newBornIds[i] = _snailIdCounter;
            _snails[_snailIdCounter] = snail;
            _snailIdCounter++;

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
            _snails[idMateA].age.generation,
            _snails[idMateB].age.generation
        );

        //Are either (or both) mates fertilised?
        seed = blockTime + idMateA + idMateB + _snailIdCounter;
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
            _snails[mateAId].age.generation > _snails[mateBId].age.generation ?
                _snails[mateAId].age.generation+1 :
                _snails[mateBId].age.generation+1;

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
    //     uint256 snailId, 
    //     uint256 toSnailId
    // )
    //     private
    //     view
    //     returns (bool)
    // {
    //     uint256 nextId = (snailId > toSnailId ) ? snailId: toSnailId;

    //     while (_snails[nextId].dnaId != 0) { // there's another snail

    //         if (_snails[nextId].mumId == snailId && _snails[nextId].dadId == toSnailId ||
    //             _snails[nextId].mumId == toSnailId && _snails[nextId].dadId == snailId)
    //             return true;
    //         nextId++;
    //     }
    //     return false;
    // }


    function _isMother(
        uint256 snailId, 
        uint256 toSnailId
    )
        private
        view
        returns (bool)
    {
        if (_isGen0(toSnailId)) return false;
        if (_snails[toSnailId].mumId == snailId)
            return true;
        return false;
    }


    function _isFather(
        uint256 snailId, 
        uint256 toSnailId
    )
        private
        view
        returns (bool)
    {
        if (_isGen0(toSnailId)) return false;
        if (_snails[toSnailId].dadId == snailId)
            return true;
        return false;
    }


    function _isChild(
        uint256 snailId, 
        uint256 toSnailId
    )
        private
        view
        returns (bool)
    {
        if (_isMother(toSnailId, snailId) ||
            _isFather(toSnailId, snailId))
            return true;
        return false;
    }


    function _isFullSibling(
        uint256 snailId, 
        uint256 toSnailId
    )
        private
        view
        returns (bool)
    {
        if (_isGen0(snailId) || _isGen0(toSnailId)) return false;

        if ((_snails[snailId].mumId == _snails[toSnailId].mumId && //Same mum
            _snails[snailId].dadId == _snails[toSnailId].dadId) || //Same dad
            (_snails[snailId].mumId == _snails[toSnailId].dadId && //one's mum is other's dad
            _snails[snailId].dadId == _snails[toSnailId].mumId ))  //one's dad is other's mum
            return true;
        return false;
    }


    function _isHalfSibling(
        uint256 snailId, 
        uint256 toSnailId
    )
        private
        view
        returns (bool)
    {
        if (_isGen0(snailId) || _isGen0(toSnailId)) return false;

        if ( //Share either a mum or dad
            (_snails[snailId].mumId == _snails[toSnailId].mumId && //Same mum and
            _snails[snailId].dadId != _snails[toSnailId].dadId) || //not same dad OR
            (_snails[snailId].dadId == _snails[toSnailId].dadId && //Same dad and
            _snails[snailId].mumId != _snails[toSnailId].mumId) || //not same mum
            //OR 1x common parent, but mum is the others dad or visa versa
            (_snails[snailId].mumId == _snails[toSnailId].dadId && //one's mum is other's dad and
            _snails[snailId].dadId != _snails[toSnailId].mumId) || //not one's dad is other's mum OR
            (_snails[snailId].dadId == _snails[toSnailId].mumId && //one's dad is other's mum and
            _snails[snailId].mumId != _snails[toSnailId].dadId))   //not one's mum is other's dad
            return true;
        return false;
    }


    function _isGrandmotherOnMumsSide(
        uint256 snailId, 
        uint256 toSnailId
    )
        private
        view
        returns (bool)
    {
        if (_isMother(snailId, _snails[toSnailId].mumId))
            return true;
        return false;
    }


    function _isGrandmotherOnDadsSide(
        uint256 snailId, 
        uint256 toSnailId
    )
        private
        view
        returns (bool)
    {
        if (_isMother(snailId, _snails[toSnailId].dadId))
            return true;
        return false;
    }


    function _isGrandfatherOnMumsSide(
        uint256 snailId, 
        uint256 toSnailId
    )
        private
        view
        returns (bool)
    {
        if (_isFather(snailId, _snails[toSnailId].mumId))
            return true;
        return false;
    }


    function _isGrandfatherOnDadsSide(
        uint256 snailId, 
        uint256 toSnailId
    )
        private
        view
        returns (bool)
    {
        if (_isFather(snailId, _snails[toSnailId].dadId))
            return true;
        return false;
    }


    function _isGrandchild(
        uint256 snailId, 
        uint256 toSnailId
    )
        private
        view
        returns (bool)
    {
        if (_isMother(toSnailId, _snails[snailId].mumId) ||
            _isMother(toSnailId, _snails[snailId].dadId) ||
            _isFather(toSnailId, _snails[snailId].dadId) ||
            _isFather(toSnailId, _snails[snailId].mumId))
            return true;
        return false;
    }


    function _isUncleAuntOnMumsSide(
        uint256 snailId, 
        uint256 toSnailId
    )
        private
        view
        returns (bool)
    {
        if (_isFullSibling(snailId, _snails[toSnailId].mumId) ||
            _isHalfSibling(snailId, _snails[toSnailId].mumId))
            return true;
        return false;
    }


    function _isUncleAuntOnDadsSide(
        uint256 snailId, 
        uint256 toSnailId
    )
        private
        view
        returns (bool)
    {
        if (_isFullSibling(snailId, _snails[toSnailId].dadId) ||
            _isHalfSibling(snailId, _snails[toSnailId].dadId)) 
            return true;
        return false;
    }


    function _isNephewNeice(
        uint256 snailId, 
        uint256 toSnailId
    )
        private
        view
        returns (bool)
    {
        if (_isUncleAuntOnMumsSide(toSnailId, snailId) ||
            _isUncleAuntOnDadsSide(toSnailId, snailId)) 
            return true;
        return false;
    }


    function _isGrandNephewNeice(
        uint256 snailId, 
        uint256 toSnailId
    )
        private
        view
        returns (bool)
    {
        if (_isNephewNeice(_snails[snailId].mumId, toSnailId) ||
            _isNephewNeice(_snails[snailId].dadId, toSnailId)) 
            return true;
        return false;
    }


    function _isFirstCousin(
        uint256 snailId, 
        uint256 toSnailId
    )
        private
        view
        returns (bool)
    {

        if ((_isUncleAuntOnMumsSide(_snails[snailId].mumId, toSnailId) ||
            _isUncleAuntOnMumsSide(_snails[snailId].dadId, toSnailId)) ||
            (_isUncleAuntOnDadsSide(_snails[snailId].mumId, toSnailId) ||
            (_isUncleAuntOnDadsSide(_snails[snailId].dadId, toSnailId))))
            return true;

        return false;
    }


    function _isFirstCousinOnceRemoved(
        uint256 snailId, 
        uint256 toSnailId
    )
        private
        view
        returns (bool)
    {

        if (_isFirstCousin(_snails[snailId].mumId, toSnailId) ||
            _isFirstCousin(_snails[snailId].dadId, toSnailId)) 
            return true;

        return false;
    }


    function _isFirstCousinTwiceRemoved(
        uint256 snailId, 
        uint256 toSnailId
    )
        private
        view
        returns (bool)
    {

        if (_isFirstCousinOnceRemoved(_snails[snailId].mumId, toSnailId) ||
            _isFirstCousinOnceRemoved(_snails[snailId].dadId, toSnailId)) 
            return true;

        return false;
    }

    function _isGen0(uint256 snailId)
        private view returns (bool)
    {
        if (_snails[snailId].age.generation == 0) return true;
        return false;
    }

    function _getRelationship(
        uint256 snailId,
        uint256 toSnailId
    )
        private
        view
        returns (Relationship relationship)
    {
        // Check for close direct and indirect blood relationships
        // (ie. from Grandparents to grandchilden & first cousins)
        if (snailId == toSnailId) return Relationship.Oneself;
        if (_isMother(snailId, toSnailId)) return Relationship.Mother;
        if (_isFather(snailId, toSnailId)) return Relationship.Father;
        if (_isChild(snailId, toSnailId)) return Relationship.Child;
        if (_isFullSibling(snailId, toSnailId)) return Relationship.FullSibling;
        if (_isHalfSibling(snailId, toSnailId)) return Relationship.HalfSibling;
        if (_isGrandmotherOnMumsSide(snailId, toSnailId)) return Relationship.GrandmotherOnMumsSide;
        if (_isGrandmotherOnDadsSide(snailId, toSnailId)) return Relationship.GrandmotherOnDadsSide;
        if (_isGrandfatherOnMumsSide(snailId, toSnailId)) return Relationship.GrandfatherOnMumsSide;
        if (_isGrandfatherOnDadsSide(snailId, toSnailId)) return Relationship.GrandfatherOnDadsSide;
        if (_isGrandchild(snailId, toSnailId)) return Relationship.Grandchild;
        if (_isUncleAuntOnMumsSide(snailId, toSnailId)) return Relationship.UncleAuntOnMumsSide;
        if (_isUncleAuntOnDadsSide(snailId, toSnailId)) return Relationship.UncleAuntOnDadsSide;
        if (_isNephewNeice(snailId, toSnailId)) return Relationship.NephewNeice;
        if (_isGrandNephewNeice(snailId, toSnailId)) return Relationship.GrandNephewNeice;
        if (_isFirstCousin(snailId, toSnailId)) return Relationship.FirstCousin;
        if (_isFirstCousinOnceRemoved(snailId, toSnailId)) return Relationship.FirstCousinOnceRemoved;
        if (_isFirstCousinTwiceRemoved(snailId, toSnailId)) return Relationship.FirstCousinTwiceRemoved;

        // Check for distant direct and indirect relationships
        // (ie. related to Great-great-grandparents and their descendents)

        return (Relationship.None);
    }
}