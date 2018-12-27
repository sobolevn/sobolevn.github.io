---
layout: post
title: "Testing Bash applications"
description: Some time ago I was faced with a task of testing a bash script. At first I decided to use Python unit-tests, however, I was reluctant to bring external technologies to the project. Therefore I had to go with the testing framework written in the notorious bash.
date: 2017-07-08
tags: bash
republished:
  dev.to: https://dev.to/sobolevn/testing-bash-scripts
  medium.com: https://medium.com/wemake-services/testing-bash-applications-85512e7fe2de
  habr.com: https://habr.com/post/278937/
---

<img src="https://cdn-images-1.medium.com/max/1200/1*FEE98iWinlZBYkxBAG8MvA.png" width="33%">

Some time ago I was faced with a task of testing a bash script. At first I decided to use Python unit-tests, however, I was reluctant to bring external technologies to the project. Therefore I had to go with the testing framework written in the notorious bash.

## Overview of the existing solutions

After googling available solutions, I was presented with very scarce options. We are going have a closer look at some of them.

Which criteria are going to be important?

1. Dependencies: when taking a bash testing framework you wouldn’t want it to drag python, lua, and a few more systems packages along with it

1. Installation difficulties: since one of the tasks was implementing continuous-development and continuous-integration in Travis, it was important to me that the installation took a reasonable amount of time and number of steps. Ideal options — package managers, acceptable options — git clone, wget

1. Documentation and support: the application should run on different Unix-distributions, thus, the tests should work everywhere including various platforms, shells, and their combinations along with the speed of updates; plus staying outside communities and experience of other users was undesirable

1. Availability of fixtures in some form and/or (at least!) `setup()` and `teardown()` functions

1. The reasonable syntax for writing new tests, which is a crucial requirement in the world of bash

1. Habitual results: how many tests were carried out, what succeeded and what did not, and what happened (preferably)

### [assert.sh](https://github.com/lehmannro/assert.sh)

One of the first options that I noticed was a small framework assert.sh. It is a pretty good solution — easy to install and use. In order to write the first test, you need to create a file tests.sh (example taken from the documentation):

```
. assert.sh

# `echo test` is expected to write "test" on stdout
assert "echo test" "test"
# `seq 3` is expected to print "1", "2" and "3" on different lines
assert "seq 3" "1\n2\n3"
# exit code of `true` is expected to be 0
assert_raises "true"
# exit code of `false` is expected to be 1
assert_raises "false" 1
# end of test suite
assert_end examples
```

Then you can run this file:

```
$ ./tests.sh
all 4 examples tests passed **in** 0.014s.
```

Other advantages include:

* Simple syntax and use

* Good documentation and examples of use

* Ability to make conditional or unconditional test skip

* Ability to fail-fast or run-all

* You can display the errors in detail (if you use flag `–v`), initially, it does not tell you which tests are failing

However, there is a number of serious drawbacks:

* At the time of writing the article, there was a red icon on, saying “build failing” on Github, this looks scary

* Even thought the framework positions itself as an easy one, for me it lacks `setup()` and `teardown()` methods to prepare the data for each test and delete it upon its completion

* You can’t run all the tests from a certain folder

**Conclusion**: it is a good tool, which I would recommend using if you need to write a simple tests for a basic shell script. It isn’t suitable for more complex tasks.

### [shunit2](https://github.com/kward/shunit2)

Installing shunit2 is not as easy as the previous tool. I was unable to find an adequate repository — there is some project on Google Code, there are a few on Github, left at various stages 3 and 5 years ago, and there are even some svn repositories. Consequently, it is impossible to make sense which release is the latest and how to download it. But those are small inconveniences.

How do the tests themselves look? Here is a simplified example from the documentation:


```bash
testAdding()
{
  result=`expr 1 + 2`
  assertEquals \
      "the result of '${result}' was wrong" \
      3 "${result}"
}
```

And then running it:

```
/bin/bash math_test.sh testAdding

Ran 1 test.

OK
```

This framework boasts of some unique features for its class:

* Ability to create test suites inside the code. This feature can be handy when you have tests for certain platforms or shells. In this case, you can use your own namespaces, such as `zsh_`, `debian_`, etc

* There `setUp` and `teardown` functions, which are run for each test; as well as `oneTimeSetUp` and `oneTimeTearDown`, which are run in the beginning and at the end of the testing session

* Wide selection of various asserts, with the possibility of inputting numbers of the lines where the test fails, using `${_ASSERT_EQUALS_}`, however, this works only for the shells which support line numbering: `bash` (>=3.0), `ksh`, `pdksh`, and `zsh`

* You can skip tests

Still, there are a few considerable disadvantages, which have pushed me away in the end:

* The project is almost inactive

* Following the previous comment, it is hard to understand what to install, it seems that the last release was in 2011

* The number of features is a bit excessive. For example, there are two ways of checking the equation: assertEquals and assertSame. It is quite surprising

* You cannot run all the files from the folder

**Conclusion**: it is a serious tool, which should be setup in a flexible enough way and make an indispensable part of your project. However, lack of structure in the `shunit2` project itself is scary, so I decided to continue my search.

### [roundup](https://github.com/bmizerany/roundup)

Initially, I was intrigued by this framework because it was written by the author of Sinatra for ruby. I also liked test syntax, which resembles the well-known mocha. All functions starting with it_ inside the file are considered as tests and run by default. Interestingly, all tests run in their own sandbox, which allows avoiding extra errors. Here is how an example from the documentation looks:

```bash
describe "roundup(5)"

before() {
    foo="bar"
}

after() {
    rm -f foo.txt
}

it_runs_before() {
    test "$foo" "=" "bar"
}
```

There are no examples of the output. You need to install it and check by yourself, which is not that good, actually. On the plus side, though:

* Each test runs in its own sandbox, which is very convenient

* It is easy to use

* You can install it through `git clone` and `./configure && make`, plus installation can be done into the local directory, you just need to modify `$PATH`

Still, there are quite a few drawbacks:

* You cannot create a source of common functions for all the tests (To be completely honest you can if you use a hack)

* You cannot run all the test files from the folder.

* Documentation is full of `TODO` marks, while the works haven’t been in progress for a couple of years now

* You can not skip a test

**Conclusion**: it is a perfectly mediocre tool, you can not say it’s a good one, and yet it isn’t that bad. In its functions, while being wider, are similar to `assert.sh`. When should you use it? If you were going for assert.sh, and the only things lacking are functions `before()` or `after()`.

### [bats](https://github.com/sstephenson/bats)

I say it straight away — I chose this framework in the end. There is a lot to like. First of all, great documentation: examples of use, semantic versioning; and I would like to specifically point out the list of projects using bats.

bats uses the following approach: the test is considered complete if all the commands inside return code `0` (like `set –e` does). Here is how test written on bats look like:

```bash
#!/usr/bin/env bats

@test "addition using bc" {
  result="$(echo 2+2 | bc)"
  [ "$result" -eq 4 ]
}

@test "addition using dc" {
  result="$(echo 2 2+p | dc)"
  [ "$result" -eq 4 ]
}
```

And the output:

```
$ bats addition.bats
✓ addition using bc
✓ addition using dc

2 tests, 0 failures
```

You can get test information in text compatible with Test Anything Protocol with the help of a flag `--tap`. You can find the plugins for a wide number of programs there: Jenkins, Redmine, SublimeText and others.

Apart from peculiar test syntax, there are other interesting things about bats:

* Command run allows you to run the command first and then test its outgoing code and text output; which you can do with the help of special variables: $status and $output

* Command load allows you to load a common code base

* Command skip allows you to skip a test if needed

* `setup()` and `teardown()` functions allow you to adjust the environment and clean up after yourself

* There is a whole set of specific variables

* You can run all the tests inside the folder

* Active community

I have already listed quite a large number of positive bats’ features. As for the negative sides, I was able to find only one:

* bats steps away from valid bash. Tests should be written in files with .bats extension, using a different shebang

**Conclusion**: it is a quality tool with close to no weaknesses. I highly recommend it.

## Results

This research was made in attempt to write some quality tests for my personal project called `git-secret`. Which primary goal is to store encrypted files in the git repository.
[Check it out!](https://github.com/sobolevn/git-secret)
