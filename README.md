CONTRACT APPLICATION DESCRIPTION

SnailsToken is an ERC721 contract, where snail tokens can be minted.  Each token represents a snail.

INITIAL MINTING:
MintSnailsTo() - This function allows the contrct owner to mints new snail tokens to any address (account).
When a new snail is minted it includes a record of its parents (mumId and dadId) and its generation.  Typically  
new snails that are minted using this function directly have unknown parants (with mumId & dadId both set to 0)
and the snail's generation is set to 0 (see 'Generations' below.)

BREEDING:
Snails are hamaphropdites (ie. are both male & female) and so upon mating either may conceive (and create one new snail).
Specificaly two snail tokens may be mated together using the breed() function, with a pseudo-random chance that each snail
gives birth to new snail token.  Therefore upon two snails breeding, 0, 1, or 2 new snails may be born (minted) - ie.
there are 4 possible outcomes from a call to breed(snailA, snailB):
 1. Neither snail conceives - no new sanils are minted
 2. Only snail mateA conceives - 1x new snail are minted
 3. Only snail mateB conceives - 1x new snail are minted
 4. Both snail mate A & B conceive - 2x new snails are minted

The parents of newly minted Snail are known & stored (ie. new snail's mum & dad).

Generation: Each snail token has a generation (Gen).  When two snails are breed together then any new snails 
that are born will be of a later generation, eg. 2x Gen-0 snails breed to produce Gen-1 snails.

THE ISSUE - With ganache upon using pseudo-randomness within a function (that determines what functions are minted)
1.  The breed() function sometimes executes the first time it is called but other times it fails upon first call. On subsequent calls it reverts (for an unknown reason).  The issue therefore lies when executing breed() with Ganache.
2.  This breed() revert seems to be due to breed's pseudo-random outcome - ie. either 0, 1, or 2 new snails may be minted as a result of calling breed to mate two snails.
3.  It is unclear why this revert occurs and why it sometime complete sucessfully.  I've coded similar breed-like test functions that always creates 0, 1 or 2 new snails (ie. a fixed number of new tokens minted) and all work correctly. 
Hence I think I've proved that the issue is related to the pseudo-randomness of results in any execution of breed. These breed-like test functions are:
      i.   breedBothMatesFertilised(snailA, snailB)  
      ii.  breedMateAFertilised(snailA, snailB) 
      iii. breedMateBFertilised(snailA, snailB) 
    These non-random functions always produce a specific number of newly minted snails and their associated Truffle tests, ie. the test scripts:
      i.   04.snailToken_breedBothMatesFertilised_test.js
      ii.  05.snailToken_breedMateAFertilised_test.js
      iii. 06.snailToken_breedMateBFertilised_test.js
    These Tests are refactored copies of the breed() truffle tests: 02_snailToken_breed_test.js.  These test functions/test always pass, functioning as expected.

    Similarly I created another test function breedToConceiveOnly(snailA, snailB) that breeds two snails to produce a
    pseudo-random fertilisation/conception result (as does the breed() function) but then ends without minting any snails. It has an associated test script 03.snailToken_breedToConceiveOnly_test.js
    This function / test script always passes and hence also always functions as expected.

    Bottom line: All of these test functions/test-scripts function as expected.  And hence I've checked the discrete parts of code (employed by breed) and all function as expected.  The issue therefore is when breed() itself is executed that uses all these steps together - ie. pseudo-randomly determines which of the two snails conceive and then mints the appropraite number of newly conceived snail tokens.  

    TEST RUN OUTPUT (Executing just these 4 truffle test files)

    Note: Under test "should allow suitable mates to breedToConceiveOnly" that for each of 3x calls the fertilisation/conceptions occur pseudo-randonly and hence typically give different conceptions for each run.

      Contract: 03 SnailToken - Two snails breedToConceiveOnly (no new snails born/minted)
    Breed Snails: Both mates must be present
      ✓ should NOT allow breedToConceiveOnly if neither mate is present (owned/approved)
      ✓ should NOT allow breedToConceiveOnly if only one mate is present (owned/approved) (63ms)
      ✓ should NOT allow a snail to be breedToConceiveOnly with itself
    Breed Two Snails (with pseudo-random chance that each mate produces 1x newborn smail): 
      ✓ should allow suitable mates to breedToConceiveOnly
        1. Actual fertilisation result, mate A: false; mate B: false
        1. Expect fertilisation result, mate A: false; mate B: false
        2. Actual fertilisation result, mate A: true; mate B: false
        2. Expect fertilisation result, mate A: true; mate B: false
        3. Actual fertilisation result, mate A: false; mate B: true
        3. Expect fertilisation result, mate A: false; mate B: true
      ✓ should get expected (pseudo-random) fertilisation from each breedToConceiveOnly (test for 3x breeds) (126ms)
        Breed 1: No conceptions
        Breed 2: 1x conceptions - mateA only
        Breed 3: 1x conceptions - mateB only
      ✓ should get expected (pseudo-random) conception result from each breedToConceiveOnly (test for 3x breeds) (101ms)
    Snail breedToConceiveOnly: Pausing  & Unpausing the SnailToken Contract
      ✓ should NOT breedToConceiveOnly when SnailToken contract is in 'paused' state (49ms)
      ✓ should allow breedToConceiveOnly after 'paused' SnailToken contract is 'unpaused' (90ms)

  Contract: 04 SnailToken - Two snails breedBothMatesFertilised
    Breed Snails: Both mates must be present
      ✓ should NOT allow breedBothMatesFertilised if neither mate is present (owned/approved)
      ✓ should NOT allow breedBothMatesFertilised if only one mate is present (owned/approved) (85ms)
      ✓ should NOT allow a snail to be breedBothMatesFertilised with itself
    Breed Two Snails (with pseudo-random chance that each mate produces 1x newborn smail): 
      ✓ should allow suitable mates to breedBothMatesFertilised (174ms)
        1. Actual fertilisation result, mate A: true; mate B: true
        2. Actual fertilisation result, mate A: true; mate B: true
        3. Actual fertilisation result, mate A: true; mate B: true
      ✓ should get expected both mates fertilised from each breedBothMatesFertilised (test 3x) (364ms)
      ✓ should get expected 2x conceptions from each breedBothMatesFertilised (test 3x) (217ms)
        Expected both mateA & mateB to have a baby snail...
      ✓ should when there are new-born snails (from breedBothMatesFertilised), emit a 'SnailsBorn' event (70ms)
      ✓ should, after breedBothMatesFertilised indicates new-born snail(s), have minted the expected new snails (69ms)
      ✓ should have (for any) new-born snails have the correct parents identified (102ms)
    Snail Breeding: Pausing  & Unpausing the SnailToken Contract
      ✓ should NOT breedBothMatesFertilised when SnailToken contract is in 'paused' state (45ms)
      ✓ should allow breedBothMatesFertilised after 'paused' SnailToken contract is 'unpaused' (141ms)

  Contract: 05 SnailToken - Two snails breedMateAFertilised
    Breed Snails: Both mates must be present
      ✓ should NOT allow breedMateAFertilised if neither mate is present (owned/approved)
      ✓ should NOT allow breedMateAFertilised if only one mate is present (owned/approved) (46ms)
      ✓ should NOT allow a snail to be breedMateAFertilised with itself
    Breed Two Snails (with pseudo-random chance that each mate produces 1x newborn smail): 
      ✓ should allow suitable mates to breedMateAFertilised (60ms)
        1. Actual fertilisation result, mate A: true; mate B: false
        2. Actual fertilisation result, mate A: true; mate B: false
        3. Actual fertilisation result, mate A: true; mate B: false
      ✓ should get expected mates A fertilised from each breedMateAFertilised (test 3x) (170ms)
      ✓ should get expected 1x conception from each breedMateAFertilised (test 3x) (152ms)
        Expected only mateA to have a baby snail...
      ✓ should when there are new-born snails (from breedMateAFertilised), emit a 'SnailsBorn' event (58ms)
      ✓ should, after breedMateAFertilised indicates new-born snail(s), have minted the expected new snails (59ms)
      ✓ should have (for any) new-born snails have the correct parents identified (45ms)
    Snail Breeding: Pausing  & Unpausing the SnailToken Contract
      ✓ should NOT breedMateAFertilised when SnailToken contract is in 'paused' state
      ✓ should allow breedMateAFertilised after 'paused' SnailToken contract is 'unpaused' (98ms)

  Contract: 06 SnailToken - Two snails breedMateBFertilised
    Breed Snails: Both mates must be present
      ✓ should NOT allow breedMateBFertilised if neither mate is present (owned/approved)
      ✓ should NOT allow breedMateBFertilised if only one mate is present (owned/approved) (40ms)
      ✓ should NOT allow a snail to be breedMateBFertilised with itself
    Breed Two Snails (with pseudo-random chance that each mate produces 1x newborn smail): 
      ✓ should allow suitable mates to breedMateBFertilised (42ms)
        1. Actual fertilisation result, mate A: false; mate B: true
        2. Actual fertilisation result, mate A: false; mate B: true
        3. Actual fertilisation result, mate A: false; mate B: true
      ✓ should get expected mates A fertilised from each breedMateBFertilised (test 3x) (127ms)
      ✓ should get expected 1x conception from each breedMateBFertilised (test 3x) (182ms)
        Expected only mateB to have a baby snail...
      ✓ should when there are new-born snails (from breedMateBFertilised), emit a 'SnailsBorn' event (59ms)
      ✓ should, after breedMateBFertilised indicates new-born snail(s), have minted the expected new snails (55ms)
      ✓ should have (for any) new-born snails have the correct parents identified (57ms)
    Snail Breeding: Pausing  & Unpausing the SnailToken Contract
      ✓ should NOT breedMateBFertilised when SnailToken contract is in 'paused' state (48ms)
      ✓ should allow breedMateBFertilised after 'paused' SnailToken contract is 'unpaused' (88ms)


  41 passing (5s)

        Contract: 03 SnailToken - Two snails breedToConceiveOnly (no new snails born/minted)
      Breed Snails: Both mates must be present
        ✓ should NOT allow breedToConceiveOnly if neither mate is present (owned/approved)
        ✓ should NOT allow breedToConceiveOnly if only one mate is present (owned/approved) (39ms)
        ✓ should NOT allow a snail to be breedToConceiveOnly with itself
      Breed Two Snails (with pseudo-random chance that each mate produces 1x newborn smail): 
        ✓ should allow suitable mates to breedToConceiveOnly
          1. Actual fertilisation result, mate A: false; mate B: true
          1. Expect fertilisation result, mate A: false; mate B: true
          2. Actual fertilisation result, mate A: true; mate B: true
          2. Expect fertilisation result, mate A: true; mate B: true
          3. Actual fertilisation result, mate A: false; mate B: false
          3. Expect fertilisation result, mate A: false; mate B: false
        ✓ should get expected (pseudo-random) fertilisation from each breedToConceiveOnly (test for 3x breeds) (72ms)
          Breed 1: 1x conceptions - mateB only
          Breed 2: 2x conceptions - mates A & B
          Breed 3: No conceptions
        ✓ should get expected (pseudo-random) conception result from each breedToConceiveOnly (test for 3x breeds) (69ms)
      Snail breedToConceiveOnly: Pausing  & Unpausing the SnailToken Contract
        ✓ should NOT breedToConceiveOnly when SnailToken contract is in 'paused' state
        ✓ should allow breedToConceiveOnly after 'paused' SnailToken contract is 'unpaused' (70ms)


TESTING - HITTING THE ISSUE (WITH TEST FAILURES)
The Truffle Test file that shows the breed() issue (ie. tests fail that I'd expect to pass) is 0.2.snailToken_breed_test.js
Note That the first call to breed "should allow suitable mates to breed" (under Breed Two Snails (with pseudo-random...") sometimes executes sucessfully and at other times doesn't.  The following test "should get expected (pseudo-random) fertilisation from each breed (test for 3x breeds)"" (irrespective of first test result) always fails.

Here are some example Truffle test runs. 
Before each test run I restart ganache:
  ganache -h 127.0.0.1 -p 8545 -m "quick brown fox jumped over the lazy dog" --miner.timestampIncrement 1

First Run of Test Script: Every valid call to breed() reverts with same error...
                          (Unknown which mates are fertilised/conceive)

  Contract: 02 SnailToken - Two snails breed
    Breed Snails: Both mates must be present
      ✓ should NOT allow breed if neither mate is present (owned/approved) (49ms)
      ✓ should NOT allow breed if only one mate is present (owned/approved) (82ms)
      ✓ should NOT allow a snail to be breed with itself
    Breed Two Snails (with pseudo-random chance that each mate produces 1x newborn smail): 
      1) should allow suitable mates to breed
    > No events were emitted
      2) should get expected (pseudo-random) fertilisation from each breed (test for 3x breeds)
    > No events were emitted
      3) should get expected (pseudo-random) conception result from each breed (test for 3x breeds)
    > No events were emitted
      4) should when there are new-born snails (from breeding), emit a 'SnailsBorn' event
    > No events were emitted
      5) should, after breed indicates new-born snail(s), have minted the expected new snails
    > No events were emitted
      6) should have (for any) new-born snails have the correct parents identified
    > No events were emitted
    Snail Breeding: Pausing  & Unpausing the SnailToken Contract
      ✓ should NOT breed when SnailToken contract is in 'paused' state (50ms)
      7) should allow breed after 'paused' SnailToken contract is 'unpaused'
    > No events were emitted

  1) Contract: 02 SnailToken - Two snails breed
       Breed Two Snails (with pseudo-random chance that each mate produces 1x newborn smail): 
         should allow suitable mates to breed:
     AssertionError: Snail owner was unable to breed their snails : Failed with StatusError: Transaction: 0xc53787b5250ef996b6ef51ef902b8f3c22b3f9bdb39ee23995ca97f97866cca9 exited with an error (status 0) after consuming all gas.
     Please check that the transaction:
     - satisfies all conditions set by Solidity `assert` statements.
     - has enough gas to execute the full transaction.
     - does not trigger an invalid opcode by other means (ex: accessing an array out of bounds).
      at passes (node_modules/truffle-assertions/index.js:142:11)
      at processTicksAndRejections (internal/process/task_queues.js:93:5)
      at Context.<anonymous> (test/02.snailToken_breed_test.js:173:13)

  2) Contract: 02 SnailToken - Two snails breed
       Breed Two Snails (with pseudo-random chance that each mate produces 1x newborn smail): 
         should get expected (pseudo-random) fertilisation from each breed (test for 3x breeds):
     Transaction: 0xc53787b5250ef996b6ef51ef902b8f3c22b3f9bdb39ee23995ca97f97866cca9 exited with an error (status 0) after consuming all gas.
     Please check that the transaction:
     - satisfies all conditions set by Solidity `assert` statements.
     - has enough gas to execute the full transaction.
     - does not trigger an invalid opcode by other means (ex: accessing an array out of bounds).
  StatusError: Transaction: 0xc53787b5250ef996b6ef51ef902b8f3c22b3f9bdb39ee23995ca97f97866cca9 exited with an error (status 0) after consuming all gas.
      at Context.<anonymous> (test/02.snailToken_breed_test.js:187:51)
      at processTicksAndRejections (internal/process/task_queues.js:93:5)

  3) Contract: 02 SnailToken - Two snails breed
       Breed Two Snails (with pseudo-random chance that each mate produces 1x newborn smail): 
         should get expected (pseudo-random) conception result from each breed (test for 3x breeds):
     Transaction: 0xc53787b5250ef996b6ef51ef902b8f3c22b3f9bdb39ee23995ca97f97866cca9 exited with an error (status 0) after consuming all gas.
     Please check that the transaction:
     - satisfies all conditions set by Solidity `assert` statements.
     - has enough gas to execute the full transaction.
     - does not trigger an invalid opcode by other means (ex: accessing an array out of bounds).
  StatusError: Transaction: 0xc53787b5250ef996b6ef51ef902b8f3c22b3f9bdb39ee23995ca97f97866cca9 exited with an error (status 0) after consuming all gas.
      at Context.<anonymous> (test/02.snailToken_breed_test.js:259:51)
      at processTicksAndRejections (internal/process/task_queues.js:93:5)

  4) Contract: 02 SnailToken - Two snails breed
       Breed Two Snails (with pseudo-random chance that each mate produces 1x newborn smail): 
         should when there are new-born snails (from breeding), emit a 'SnailsBorn' event:
     Transaction: 0xc53787b5250ef996b6ef51ef902b8f3c22b3f9bdb39ee23995ca97f97866cca9 exited with an error (status 0) after consuming all gas.
     Please check that the transaction:
     - satisfies all conditions set by Solidity `assert` statements.
     - has enough gas to execute the full transaction.
     - does not trigger an invalid opcode by other means (ex: accessing an array out of bounds).
  StatusError: Transaction: 0xc53787b5250ef996b6ef51ef902b8f3c22b3f9bdb39ee23995ca97f97866cca9 exited with an error (status 0) after consuming all gas.
      at Context.<anonymous> (test/02.snailToken_breed_test.js:420:50)
      at processTicksAndRejections (internal/process/task_queues.js:93:5)

  5) Contract: 02 SnailToken - Two snails breed
       Breed Two Snails (with pseudo-random chance that each mate produces 1x newborn smail): 
         should, after breed indicates new-born snail(s), have minted the expected new snails:
     Transaction: 0xc53787b5250ef996b6ef51ef902b8f3c22b3f9bdb39ee23995ca97f97866cca9 exited with an error (status 0) after consuming all gas.
     Please check that the transaction:
     - satisfies all conditions set by Solidity `assert` statements.
     - has enough gas to execute the full transaction.
     - does not trigger an invalid opcode by other means (ex: accessing an array out of bounds).
  StatusError: Transaction: 0xc53787b5250ef996b6ef51ef902b8f3c22b3f9bdb39ee23995ca97f97866cca9 exited with an error (status 0) after consuming all gas.
      at Context.<anonymous> (test/02.snailToken_breed_test.js:502:50)
      at processTicksAndRejections (internal/process/task_queues.js:93:5)

  6) Contract: 02 SnailToken - Two snails breed
       Breed Two Snails (with pseudo-random chance that each mate produces 1x newborn smail): 
         should have (for any) new-born snails have the correct parents identified:
     Transaction: 0xc53787b5250ef996b6ef51ef902b8f3c22b3f9bdb39ee23995ca97f97866cca9 exited with an error (status 0) after consuming all gas.
     Please check that the transaction:
     - satisfies all conditions set by Solidity `assert` statements.
     - has enough gas to execute the full transaction.
     - does not trigger an invalid opcode by other means (ex: accessing an array out of bounds).
  StatusError: Transaction: 0xc53787b5250ef996b6ef51ef902b8f3c22b3f9bdb39ee23995ca97f97866cca9 exited with an error (status 0) after consuming all gas.
      at Context.<anonymous> (test/02.snailToken_breed_test.js:559:50)
      at runMicrotasks (<anonymous>)
      at processTicksAndRejections (internal/process/task_queues.js:93:5)

  7) Contract: 02 SnailToken - Two snails breed
       Snail Breeding: Pausing  & Unpausing the SnailToken Contract
         should allow breed after 'paused' SnailToken contract is 'unpaused':
     AssertionError: Snail owner was unable to breed their snails : Failed with StatusError: Transaction: 0xfa8ee8d902f64d4b7da162fb43e951dd7876895ee77cfa70b4a25fdef8344949 exited with an error (status 0) after consuming all gas.
     Please check that the transaction:
     - satisfies all conditions set by Solidity `assert` statements.
     - has enough gas to execute the full transaction.
     - does not trigger an invalid opcode by other means (ex: accessing an array out of bounds).
      at passes (node_modules/truffle-assertions/index.js:142:11)
      at runMicrotasks (<anonymous>)
      at processTicksAndRejections (internal/process/task_queues.js:93:5)
      at Context.<anonymous> (test/02.snailToken_breed_test.js:676:13)


Restart Ganache: ganache -h 127.0.0.1 -p 8545 -m "quick brown fox jumped over the lazy dog" --miner.timestampIncrement 1

Second Run of Test Script: First call to breed() succeeds (under " should allow suitable mates to breed ")
                        Succeeds (A case where neither neither mate A nor B is fertilised/conceives) and then fails for 2nd & 3rd calls
                        (test "should get expected (pseudo-random) fertilisation from each breed (test for 3x breeds)")
                        Note: Subsequent call to breed() under should allow breed after 'paused' SnailToken contract is 'unpaused' works.

  Contract: 02 SnailToken - Two snails breed
    Breed Snails: Both mates must be present
      ✓ should NOT allow breed if neither mate is present (owned/approved) (46ms)
      ✓ should NOT allow breed if only one mate is present (owned/approved) (79ms)
      ✓ should NOT allow a snail to be breed with itself
    Breed Two Snails (with pseudo-random chance that each mate produces 1x newborn smail): 
      ✓ should allow suitable mates to breed (74ms)
        1. Actual fertilisation result, mate A: false; mate B: false
        1. Expect fertilisation result, mate A: false; mate B: false
      1) should get expected (pseudo-random) fertilisation from each breed (test for 3x breeds)
    > No events were emitted
        Breed 1: No conceptions
      2) should get expected (pseudo-random) conception result from each breed (test for 3x breeds)
    > No events were emitted
        Expected NO new-born snails...
      ✓ should when there are new-born snails (from breeding), emit a 'SnailsBorn' event (45ms)
      ✓ should, after breed indicates new-born snail(s), have minted the expected new snails (65ms)
      ✓ should have (for any) new-born snails have the correct parents identified (49ms)
    Snail Breeding: Pausing  & Unpausing the SnailToken Contract
      ✓ should NOT breed when SnailToken contract is in 'paused' state (42ms)
      ✓ should allow breed after 'paused' SnailToken contract is 'unpaused' (90ms)

  1) Contract: 02 SnailToken - Two snails breed
       Breed Two Snails (with pseudo-random chance that each mate produces 1x newborn smail): 
         should get expected (pseudo-random) fertilisation from each breed (test for 3x breeds):
     Transaction: 0x6c508d9bc7fc890517018345ccfb0046fe331045cda4cb99eb9c36021c7dbfc7 exited with an error (status 0) after consuming all gas.
     Please check that the transaction:
     - satisfies all conditions set by Solidity `assert` statements.
     - has enough gas to execute the full transaction.
     - does not trigger an invalid opcode by other means (ex: accessing an array out of bounds).
  StatusError: Transaction: 0x6c508d9bc7fc890517018345ccfb0046fe331045cda4cb99eb9c36021c7dbfc7 exited with an error (status 0) after consuming all gas.
      at Context.<anonymous> (test/02.snailToken_breed_test.js:210:51)
      at processTicksAndRejections (internal/process/task_queues.js:93:5)

  2) Contract: 02 SnailToken - Two snails breed
       Breed Two Snails (with pseudo-random chance that each mate produces 1x newborn smail): 
         should get expected (pseudo-random) conception result from each breed (test for 3x breeds):
     Transaction: 0x6c508d9bc7fc890517018345ccfb0046fe331045cda4cb99eb9c36021c7dbfc7 exited with an error (status 0) after consuming all gas.
     Please check that the transaction:
     - satisfies all conditions set by Solidity `assert` statements.
     - has enough gas to execute the full transaction.
     - does not trigger an invalid opcode by other means (ex: accessing an array out of bounds).
  StatusError: Transaction: 0x6c508d9bc7fc890517018345ccfb0046fe331045cda4cb99eb9c36021c7dbfc7 exited with an error (status 0) after consuming all gas.
      at Context.<anonymous> (test/02.snailToken_breed_test.js:312:51)
      at processTicksAndRejections (internal/process/task_queues.js:93:5)



Restart Ganache: ganache -h 127.0.0.1 -p 8545 -m "quick brown fox jumped over the lazy dog" --miner.timestampIncrement 1

Third Run of Test Script: First call to breed() succeeds (under " should allow suitable mates to breed ")
                        Suceeds (A case where mate B only is fertilised/conceives) and then fails for 2nd & 3rd calls
                        (test "should get expected (pseudo-random) fertilisation from each breed (test for 3x breeds)")
                        But subquent breed calls revert but call to breed() under "should allow breed after 'paused' SnailToken contract is 'unpaused'" works.
                            (a case where mate B only is fertilised)
  Contract: 02 SnailToken - Two snails breed
    Breed Snails: Both mates must be present
      ✓ should NOT allow breed if neither mate is present (owned/approved)
      ✓ should NOT allow breed if only one mate is present (owned/approved) (60ms)
      ✓ should NOT allow a snail to be breed with itself
    Breed Two Snails (with pseudo-random chance that each mate produces 1x newborn smail): 
      ✓ should allow suitable mates to breed (62ms)
        1. Actual fertilisation result, mate A: false; mate B: true
        1. Expect fertilisation result, mate A: false; mate B: true
      1) should get expected (pseudo-random) fertilisation from each breed (test for 3x breeds)
    > No events were emitted
        Breed 1: 1x conceptions - mateB only
      2) should get expected (pseudo-random) conception result from each breed (test for 3x breeds)
    > No events were emitted
        Expected only mateB to have a baby snail...
      ✓ should when there are new-born snails (from breeding), emit a 'SnailsBorn' event (65ms)
      ✓ should, after breed indicates new-born snail(s), have minted the expected new snails (73ms)
      ✓ should have (for any) new-born snails have the correct parents identified (95ms)
    Snail Breeding: Pausing  & Unpausing the SnailToken Contract
      ✓ should NOT breed when SnailToken contract is in 'paused' state (44ms)
      ✓ should allow breed after 'paused' SnailToken contract is 'unpaused' (110ms)

  1) Contract: 02 SnailToken - Two snails breed
       Breed Two Snails (with pseudo-random chance that each mate produces 1x newborn smail): 
         should get expected (pseudo-random) fertilisation from each breed (test for 3x breeds):
     Transaction: 0x413c8730bc01d6aad1732ea9949e647f0ae72a0cc270c81839e31f2aa4343b6a exited with an error (status 0) after consuming all gas.
     Please check that the transaction:
     - satisfies all conditions set by Solidity `assert` statements.
     - has enough gas to execute the full transaction.
     - does not trigger an invalid opcode by other means (ex: accessing an array out of bounds).
  StatusError: Transaction: 0x413c8730bc01d6aad1732ea9949e647f0ae72a0cc270c81839e31f2aa4343b6a exited with an error (status 0) after consuming all gas.
      at Context.<anonymous> (test/02.snailToken_breed_test.js:210:51)
      at processTicksAndRejections (internal/process/task_queues.js:93:5)

  2) Contract: 02 SnailToken - Two snails breed
       Breed Two Snails (with pseudo-random chance that each mate produces 1x newborn smail): 
         should get expected (pseudo-random) conception result from each breed (test for 3x breeds):
     Transaction: 0x413c8730bc01d6aad1732ea9949e647f0ae72a0cc270c81839e31f2aa4343b6a exited with an error (status 0) after consuming all gas.
     Please check that the transaction:
     - satisfies all conditions set by Solidity `assert` statements.
     - has enough gas to execute the full transaction.
     - does not trigger an invalid opcode by other means (ex: accessing an array out of bounds).
  StatusError: Transaction: 0x413c8730bc01d6aad1732ea9949e647f0ae72a0cc270c81839e31f2aa4343b6a exited with an error (status 0) after consuming all gas.
      at Context.<anonymous> (test/02.snailToken_breed_test.js:312:51)
      at processTicksAndRejections (internal/process/task_queues.js:93:5)



