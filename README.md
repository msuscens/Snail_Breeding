ISSUE: When PersonToken's breed() function is called (in truffle tests) then it fails at 
different points under different 'truffle test' runs.


TESTS FAIL AT DIFFERENT POINTS (UNDER GANACHE V7.3.2)

$ sudo npm install --global ganache

ganache -h 127.0.0.1 -p 8545 -m "quick brown fox jumped over the lazy dog" --miner.timestampIncrement 1
ganache v7.3.2 (@ganache/cli: 0.4.2, @ganache/core: 0.4.2)
Starting RPC server
...etc


FIRST EXAMPLE TEST RUN:

$ truffle test

> Compiled successfully using:
   - solc: 0.8.13+commit.abaa5c0e.Emscripten.clang


  Contract: 01 PersonToken State - Newly minted person
    New-born (Gen-0) Person: General State
      ✓ should have expected parents (mumId & dadaId)
      ✓ should know person's birth time (ie. blocktime)
      ✓ should only be the expected number persons in existance (ie. 2x persons)

  Contract: 02 PersonToken - Two people (one-pair) breed
    Breed YoungAdults: Both mates must be present
      ✓ should NOT allow breed both mates are NOT specified (49ms)
      ✓ should NOT allow breed if only a single mate is specified (60ms)
      ✓ should NOT allow breed if neither mate is present (owned/approved) (40ms)
      ✓ should NOT allow breed if only one mate is present (owned/approved) (93ms)
      ✓ should NOT allow a person to be breed with itself (43ms)
    Breed 2-Persons: 
      1) should allow suitable mates to breed
    > No events were emitted
      2) should if breed results in any new-borns, emit a 'BabiesBorn' event
    > No events were emitted
      3) should, after breed indicates new-born(s), have minted the expected new-born persons
    > No events were emitted
      4) should have (for any) new-borns have the correct parents identified
    > No events were emitted
    Person Breeding: Pausing  & Unpausing the PersonToken Contract
      ✓ should NOT breed when PersonToken contract is in 'paused' state (56ms)
      ✓ should allow breed after 'paused' PersonToken contract is 'unpaused' (287ms)

  Contract: 03 PersonToken - Get Relationship between two people
Breed count: 1 
        2x new-borns
Breed count: 1 
    5) "before all" hook: Family 2: Breed (mate ids: 2 & 3), until both have a child (at same time) in "Contract: 03 PersonToken - Get Relationship between two people"


  10 passing (4s)
  5 failing

  1) Contract: 02 PersonToken - Two people (one-pair) breed
       Breed 2-Persons: 
         should allow suitable mates to breed:
     AssertionError: Person owner was unable to breed their persons : Failed with StatusError: Transaction: 0x5291a4f03af7192de1a8cc9b5a8a292b1a7376ab06a1d67759c50d362cac6a49 exited with an error (status 0). 
     Please check that the transaction:
     - satisfies all conditions set by Solidity `require` statements.
     - does not trigger a Solidity `revert` statement.

      at passes (node_modules/truffle-assertions/index.js:142:11)
      at runMicrotasks (<anonymous>)
      at processTicksAndRejections (internal/process/task_queues.js:93:5)
      at Context.<anonymous> (test/02.personToken_breed_one_pair_test.js:214:13)

  2) Contract: 02 PersonToken - Two people (one-pair) breed
       Breed 2-Persons: 
         should if breed results in any new-borns, emit a 'BabiesBorn' event:
     Transaction: 0x5291a4f03af7192de1a8cc9b5a8a292b1a7376ab06a1d67759c50d362cac6a49 exited with an error (status 0). 
     Please check that the transaction:
     - satisfies all conditions set by Solidity `require` statements.
     - does not trigger a Solidity `revert` statement.

  StatusError: Transaction: 0x5291a4f03af7192de1a8cc9b5a8a292b1a7376ab06a1d67759c50d362cac6a49 exited with an error (status 0). 
      at Context.<anonymous> (test/02.personToken_breed_one_pair_test.js:227:51)
      at runMicrotasks (<anonymous>)
      at processTicksAndRejections (internal/process/task_queues.js:93:5)

  3) Contract: 02 PersonToken - Two people (one-pair) breed
       Breed 2-Persons: 
         should, after breed indicates new-born(s), have minted the expected new-born persons:
     Transaction: 0x5291a4f03af7192de1a8cc9b5a8a292b1a7376ab06a1d67759c50d362cac6a49 exited with an error (status 0). 
     Please check that the transaction:
     - satisfies all conditions set by Solidity `require` statements.
     - does not trigger a Solidity `revert` statement.

  StatusError: Transaction: 0x5291a4f03af7192de1a8cc9b5a8a292b1a7376ab06a1d67759c50d362cac6a49 exited with an error (status 0). 
      at Context.<anonymous> (test/02.personToken_breed_one_pair_test.js:299:51)
      at runMicrotasks (<anonymous>)
      at processTicksAndRejections (internal/process/task_queues.js:93:5)

  4) Contract: 02 PersonToken - Two people (one-pair) breed
       Breed 2-Persons: 
         should have (for any) new-borns have the correct parents identified:
     Transaction: 0x5291a4f03af7192de1a8cc9b5a8a292b1a7376ab06a1d67759c50d362cac6a49 exited with an error (status 0). 
     Please check that the transaction:
     - satisfies all conditions set by Solidity `require` statements.
     - does not trigger a Solidity `revert` statement.

  StatusError: Transaction: 0x5291a4f03af7192de1a8cc9b5a8a292b1a7376ab06a1d67759c50d362cac6a49 exited with an error (status 0). 
      at Context.<anonymous> (test/02.personToken_breed_one_pair_test.js:335:51)
      at runMicrotasks (<anonymous>)
      at processTicksAndRejections (internal/process/task_queues.js:93:5)

  5) Contract: 03 PersonToken - Get Relationship between two people
       "before all" hook: Family 2: Breed (mate ids: 2 & 3), until both have a child (at same time) in "Contract: 03 PersonToken - Get Relationship between two people":
     Transaction: 0x6098c89578ae2ff55b72ba4c1cc5a31335b1d0b509bbcd1aa38a565628d1d590 exited with an error (status 0). 
     Please check that the transaction:
     - satisfies all conditions set by Solidity `require` statements.
     - does not trigger a Solidity `revert` statement.

  StatusError: Transaction: 0x6098c89578ae2ff55b72ba4c1cc5a31335b1d0b509bbcd1aa38a565628d1d590 exited with an error (status 0). 
      at breedUntilBothProdueNewBorn (test/03.personToken_get_relationship_test.js:561:51)
      at runMicrotasks (<anonymous>)
      at processTicksAndRejections (internal/process/task_queues.js:93:5)
      at Context.<anonymous> (test/03.personToken_get_relationship_test.js:82:27)


SECOND EXAMPLE TEST RUN:

$ truffle test

> Compiled successfully using:
   - solc: 0.8.13+commit.abaa5c0e.Emscripten.clang


  Contract: 01 PersonToken State - Newly minted person
    New-born (Gen-0) Person: General State
      ✓ should have expected parents (mumId & dadaId)
      ✓ should know person's birth time (ie. blocktime)
      ✓ should only be the expected number persons in existance (ie. 2x persons)

  Contract: 02 PersonToken - Two people (one-pair) breed
    Breed YoungAdults: Both mates must be present
      ✓ should NOT allow breed both mates are NOT specified (46ms)
      ✓ should NOT allow breed if only a single mate is specified (68ms)
      ✓ should NOT allow breed if neither mate is present (owned/approved) (43ms)
      ✓ should NOT allow breed if only one mate is present (owned/approved) (87ms)
      ✓ should NOT allow a person to be breed with itself (43ms)
    Breed 2-Persons: 
      ✓ should allow suitable mates to breed (257ms)
        Expected both mateA & mateB to have a baby ...
      ✓ should if breed results in any new-borns, emit a 'BabiesBorn' event (306ms)
      ✓ should, after breed indicates new-born(s), have minted the expected new-born persons (314ms)
      ✓ should have (for any) new-borns have the correct parents identified (240ms)
    Person Breeding: Pausing  & Unpausing the PersonToken Contract
      ✓ should NOT breed when PersonToken contract is in 'paused' state (69ms)
      ✓ should allow breed after 'paused' PersonToken contract is 'unpaused' (308ms)

  Contract: 03 PersonToken - Get Relationship between two people
Breed count: 1 
        2x new-borns
Breed count: 1 
        1x new-borns
Breed count: 2 
        1x new-borns
Breed count: 3 
        2x new-borns
Breed count: 1 
    1) "before all" hook: Family 2: Breed Mates: F_PERSON_ID & H_PERSON_ID, until both have a child (at same time) in "Contract: 03 PersonToken - Get Relationship between two people"


  14 passing (4s)
  1 failing

  1) Contract: 03 PersonToken - Get Relationship between two people
       "before all" hook: Family 2: Breed Mates: F_PERSON_ID & H_PERSON_ID, until both have a child (at same time) in "Contract: 03 PersonToken - Get Relationship between two people":
     Transaction: 0xb1c2fcd86f86ca659af9fe10cb396b091e4bf583318c2e324601bacd33a220b4 exited with an error (status 0). 
     Please check that the transaction:
     - satisfies all conditions set by Solidity `require` statements.
     - does not trigger a Solidity `revert` statement.

  StatusError: Transaction: 0xb1c2fcd86f86ca659af9fe10cb396b091e4bf583318c2e324601bacd33a220b4 exited with an error (status 0). 
      at breedUntilBothProdueNewBorn (test/03.personToken_get_relationship_test.js:561:51)
      at runMicrotasks (<anonymous>)
      at processTicksAndRejections (internal/process/task_queues.js:93:5)
      at Context.<anonymous> (test/03.personToken_get_relationship_test.js:96:27)




NOTE: TESTS WORK SLIGHLTY BETTER UNDER GANACHE V6.12.2
[in that contract tests 02 typically all pass, but contract tests 03 (in before blocks also fails]

$ sudo npm uninstall --global ganache
$ sudo npm install -g ganache-cli

$ ganache-cli -h 127.0.0.1 -p 8545 -m "quick brown fox jumped over the lazy dog"

Ganache CLI v6.12.2 (ganache-core: 2.13.2) 
...etc

$ truffle test

> Compiled successfully using:
   - solc: 0.8.13+commit.abaa5c0e.Emscripten.clang


  Contract: 01 PersonToken State - Newly minted person
    New-born (Gen-0) Person: General State
      ✓ should have expected parents (mumId & dadaId)
      ✓ should know person's birth time (ie. blocktime)
      ✓ should only be the expected number persons in existance (ie. 2x persons)

  Contract: 02 PersonToken - Two people (one-pair) breed
    Breed YoungAdults: Both mates must be present
      ✓ should NOT allow breed both mates are NOT specified (165ms)
      ✓ should NOT allow breed if only a single mate is specified (155ms)
      ✓ should NOT allow breed if neither mate is present (owned/approved) (71ms)
      ✓ should NOT allow breed if only one mate is present (owned/approved) (100ms)
      ✓ should NOT allow a person to be breed with itself (51ms)
    Breed 2-Persons: 
      ✓ should allow suitable mates to breed (177ms)
        Expected both mateA & mateB to have a baby ...
      ✓ should if breed results in any new-borns, emit a 'BabiesBorn' event (218ms)
      ✓ should, after breed indicates new-born(s), have minted the expected new-born persons (235ms)
      ✓ should have (for any) new-borns have the correct parents identified (245ms)
    Person Breeding: Pausing  & Unpausing the PersonToken Contract
      ✓ should NOT breed when PersonToken contract is in 'paused' state (108ms)
      ✓ should allow breed after 'paused' PersonToken contract is 'unpaused' (394ms)

  Contract: 03 PersonToken - Get Relationship between two people
Breed count: 1 
        2x new-borns
Breed count: 1 
        2x new-borns
Breed count: 1 
    1) "before all" hook: Family 2: Breed Mates: F_PERSON_ID & H_PERSON_ID, until both have a child (at same time) in "Contract: 03 PersonToken - Get Relationship between two people"


  14 passing (5s)
  1 failing

  1) Contract: 03 PersonToken - Get Relationship between two people
       "before all" hook: Family 2: Breed Mates: F_PERSON_ID & H_PERSON_ID, until both have a child (at same time) in "Contract: 03 PersonToken - Get Relationship between two people":
     Error: Assertion failed
      at assert (/usr/local/lib/node_modules/truffle/build/webpack:/node_modules/bn.js/lib/bn.js:6:1)
      at BN.iaddn (/usr/local/lib/node_modules/truffle/build/webpack:/node_modules/bn.js/lib/bn.js:2128:1)
      at BN.addn (/usr/local/lib/node_modules/truffle/build/webpack:/node_modules/bn.js/lib/bn.js:2197:1)
      at whoIsFertilisedTH (test/TestHelpers/PersonTH.js:66:48)
      at runMicrotasks (<anonymous>)
      at processTicksAndRejections (internal/process/task_queues.js:93:5)
      at breedUntilBothProdueNewBorn (test/03.personToken_get_relationship_test.js:568:30)
      at Context.<anonymous> (test/03.personToken_get_relationship_test.js:96:27)

Mark@MacBook-Pro People_Example % 



