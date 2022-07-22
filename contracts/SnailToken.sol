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


        Conception[] memory conceptions = _mateSnails(snailAId, snailBId);

        // Mint any new-born snails
        if (conceptions.length > 0) {

            uint256[] memory newBornSnailIds = _mintSnailsTo(msg.sender, conceptions);

            require(
                newBornSnailIds.length == conceptions.length,
                "breedIE: conceptions!=newBorns!"
            );
            emit SnailsBorn(msg.sender, newBornSnailIds);
        }
    }


    function breedToConceiveOnly(uint256 snailAId, uint256 snailBId)
        override
        external
        whenNotPaused
    {
        require(snailAId != snailBId, "breed: With self!");
        require(_isApprovedOrOwner(msg.sender, snailAId), "breed: mateA is not present!");
        require(_isApprovedOrOwner(msg.sender, snailBId), "breed: mateB is not present!");

        Conception[] memory conceptions = _mateSnails(snailAId, snailBId);
        require(
            conceptions.length <= 2,
            "breedIE: conceptions>2!"
        );
    }


    function breedToAlwaysMintTwoNewSnails(uint256 snailAId, uint256 snailBId)
        override
        external
        whenNotPaused
    {
        require(snailAId != snailBId, "breed: With self!");
        require(_isApprovedOrOwner(msg.sender, snailAId), "breed: mateA is not present!");
        require(_isApprovedOrOwner(msg.sender, snailBId), "breed: mateB is not present!");

        // Conception[] memory conceptions = _mateSnails(snailAId, snailBId);

        // **** HARDWIRING FERTILISATION RESULT
        // *** If instead of above psedudo-random code for the fertilisation & associated
        // *** setting of the conception(s), the fertilisation/conceptions are instead
        // *** set manaully (to always give either 0, 1, or 2 conceptions) IT WORKS!!!
        
        uint256 newGeneration =
            _snails[snailAId].age.generation > _snails[snailBId].age.generation ?
                _snails[snailAId].age.generation+1 :
                _snails[snailBId].age.generation+1;
        

        // * SPECIICALLY: BOTH MATES (A & B) FERTILISED *
        Conception[] memory conceptions = new Conception[](2);
        conceptions[0] = Conception(
            {
                generation: newGeneration,
                mumId: snailAId, //tokenId
                dadId: snailBId  //tokenId
            }
        );
        conceptions[1] = Conception(
            {
                generation: newGeneration,
                mumId: snailBId, //tokenId
                dadId: snailAId  //tokenId
            }
        );
        require(
            conceptions.length == 2,
            "breedIE: conceptions!=2!"
        );
        emit SnailsMated(
            snailAId,
            snailBId,
            true, //mateA fertilised
            true, //mateB fertilised
            conceptions
        );

        // * ALTERNATIVELY SPECIICALLY: ONLY MATE A FERTILISED *
        // Conception[] memory conceptions = new Conception[](1);
        // conceptions[0] = Conception(
        //     {
        //         generation: newGeneration,
        //         mumId: snailAId, //tokenId
        //         dadId: snailBId  //tokenId
        //     }
        // );
        // require(
        //     conceptions.length == 1,
        //     "breedIE: conceptions!=1!"
        // );
        // emit SnailsMated(
        //     snailAId,
        //     snailBId,
        //     true,  //mateA fertilised
        //     false, //mateB fertilised
        //     conceptions
        // );

        // * ALTERNATIVELY SPECIICALLY: ONLY MATE B FERTILISED *
        // Conception[] memory conceptions = new Conception[](1);
        // conceptions[0] = Conception(
        //     {
        //         generation: newGeneration,
        //         mumId: snailBId, //tokenId
        //         dadId: snailAId  //tokenId
        //     }
        // );
        // require(
        //     conceptions.length == 1,
        //     "breedIE: conceptions!=1!"
        // );
        // emit SnailsMated(
        //     snailAId,
        //     snailBId,
        //     false, //mateA fertilised
        //     true,  //mateB fertilised
        //     conceptions
        // );

        // * ALTERNATIVELY SPECIICALLY: NEITHER MATE FERTILISED *
        // Conception[] memory conceptions;
        // emit SnailsMated(
        //     snailAId,
        //     snailBId,
        //     false, //mateA fertilised
        //     false, //mateB fertilised
        //     conceptions
        // );


        // Mint any new-born snails
        if (conceptions.length > 0) {

            uint256[] memory newBornSnailIds = _mintSnailsTo(msg.sender, conceptions);

            require(
                newBornSnailIds.length == conceptions.length,
                "breedIE: conceptions!=newBorns!"
            );
            emit SnailsBorn(msg.sender, newBornSnailIds);
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
        require(fromConceptions.length > 0, "_mintSnailsToIE: 0 conceptions!");
        // require(fromConceptions.length <= 2, "_mintSnailsToIE: Too many conceptions!");

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



    function _mateSnails(uint256 mateAId, uint256 mateBId)
        private
        returns (Conception[] memory conceptions)
    {
        // Determine which of the two mates conceive and so will give birth to a new snail.
        // NB Snails are hermaphrodites (ie. are both male & femaile), they may therefore both 
        // conceive (or only 1 of them, or neither) and give birth to a new snail.

        // Pseudo-randomly determine which mates (if any) are fertilised
        uint256 timestamp = block.timestamp;
        uint256 pseudoRandomA = (timestamp % 10);     //last digit (of timestamp)
        uint256 pseudoRandomB = (timestamp % 100)/10; //second last digit (of timestamp)

        bool mateAFertilised = (pseudoRandomA % 2) == 1 ? true: false;
        bool mateBFertilised = (pseudoRandomB % 2) == 1 ? true: false;

        // Gather conception details for new snail(s) if either mate has been fertilised
        // (ie. one conception record for each mate fertilised, ie. 0-2 conceptions)
        if (mateAFertilised || mateBFertilised){

            uint256 newGeneration =
                _snails[mateAId].age.generation > _snails[mateBId].age.generation ?
                    _snails[mateAId].age.generation+1 :
                    _snails[mateBId].age.generation+1;

            // Collate conception details for each fertilised mate, ie. 1 or 2 conceptions.
            conceptions = _matesConceive(
                        mateAFertilised,
                        mateBFertilised,
                        mateAId,
                        mateBId,
                        newGeneration
                    );
        }
        emit SnailsMated(
            mateAId,
            mateBId,
            mateAFertilised,
            mateBFertilised,
            conceptions
        );
    }


    function _matesConceive(
        bool mateAFertilised,
        bool mateBFertilised,
        uint256 mateAId,
        uint256 mateBId,
        uint256 newGeneration
    )
        private
        pure
        returns (Conception[] memory conceptions)
    {
        require(
            mateAFertilised || mateBFertilised,
            "_matesConceiveIE: Neither mate fertilised!"
        );

        if (mateAFertilised && mateBFertilised) {
            conceptions = new Conception[](2);

            conceptions[0] = Conception(
                {
                    generation: newGeneration,
                    mumId: mateAId, //snail tokenId
                    dadId: mateBId  //snail tokenId
                }
            );
            conceptions[1] = Conception(
                {
                    generation: newGeneration,
                    mumId: mateBId, //snail tokenId
                    dadId: mateAId  //snail tokenId
                }
            );
        }
        else {
            conceptions = new Conception[](1);

            if (mateAFertilised && !mateBFertilised) {
                conceptions[0] = Conception(
                    {
                        generation: newGeneration,
                        mumId: mateAId, //snail tokenId
                        dadId: mateBId  //snail tokenId
                    }
                );
            }
            else if (mateBFertilised && !mateAFertilised) {
                conceptions[0] = Conception(
                    {
                        generation: newGeneration,
                        mumId: mateBId, //snail tokenId
                        dadId: mateAId  //snail tokenId
                    }
                ); 
            }
            else {
                revert("_matesConceiveIE: Logic error in code");
            }
        }
    }


    // -----------------------------------------------
    // *** Relationship Checking (View) Functions  ***
    
    function _isExPartner(
        uint256 snailId, 
        uint256 toSnailId
    )
        private
        view
        returns (bool)
    {
        uint256 nextId = (snailId > toSnailId ) ? snailId+1: toSnailId+1;

        while (nextId <= _snailIdCounter) { // there's another snail

            if (_snails[nextId].mumId == snailId && _snails[nextId].dadId == toSnailId ||
                _snails[nextId].mumId == toSnailId && _snails[nextId].dadId == snailId)
                return true;
            nextId++;
        }
        return false;
    }


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

        // An ex-partner?
        if (_isExPartner(snailId, toSnailId)) return Relationship.ExPartner;

        return (Relationship.None);
    }
}