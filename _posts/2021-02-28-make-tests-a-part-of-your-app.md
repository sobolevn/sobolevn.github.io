---
layout: post
title: "Make tests a part of the app"
description: "Tests can be generated, tests can be shipped by library authors directly to end-users, tests can be encoded into the body of your app. Let's follow this path!"
date: 2021-02-28
tags: python
writing_time:
  writing: "4:00"
  proofreading: "0:20"
  decorating: "0:05"
republished: []
translated: []
---

![Cover image](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/c4y2pgr3ddjtu33svrm2.png)

Today I am going to discuss quite a new idea for Python users, an idea of making tests a valuable part of your application.

Let's jump into it.


## Current status

Right now the status-quo for source code/tests dualism is that you ship source code to your library users and most often do not include your tests in any manner.

Sometimes people also attach the `tests/` folder to your release, so they are just laying around just in case. Most of the time they are useless to the end-user.

And what is the most important part of it all is that our users are often find themselves in a situation when they have to reimplement some tests for library-specific things.

Let me give you an example: you have a Django view for authorized users only.

```python
from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse

@login_required
def my_view(request: HttpRequest) -> HttpRespose:
    ...
```

So, in our tests we would have to write at least two tests:
1. For the successful auth case and our business logic
2. For the failed auth case

Wouldn't it be amazing if we could just skip the second one and rely on some existing test-logic?

Imagine an API like:

```python
# tests/test_views/test_my_view.py
from myapp.views import my_view

def test_authed_successfully(user):
    """Test case for our own logic."""

# Not authed case:
my_view.test_not_authed()
```

And then - boom - we have our second use-case tested with just a single line of code!

And it goes further than this. For example, in Django you can stack function [decorators](https://docs.djangoproject.com/en/3.1/topics/http/decorators/) to do multiple things. Imagine this situation:

```python
from django.views.decorators.cache import never_cache
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods

@require_http_methods(['GET', 'POST'])
@login_required
@never_cache
def my_view(request: HttpRequest) -> HttpRespose:
    ...
```

So, the API might be a little more magical to include a test for all the possible cases:

```python
# tests/test_views/test_my_view.py
from myapp.views import my_view

my_view.run_tests()
```

And it can potentially execute:
1. Tests for http methods that are not allowed
2. Tests for http methods that are allowed
3. Test that `Cache-Control` header is there and has a correct value
4. Test that unauthorized users are not allowed
5. And possibly others!

All you have to do is testing your green path with a possibility to customize some particular generated test cases if you have some specifics, like returning a custom http code for unauthorized users.

The bad part of this chapter is that the discussed API does not exist. And probably won't ever exist in Django.

But, there are other less-known projects (but ones that I help to maintain) that already have these features. Let's see what you can do with them!


## deal

[`deal`](https://github.com/life4/deal) is a library for [Design-by-Contract](https://en.wikipedia.org/wiki/Design_by_contract).

In other words, it allows decorating your functions and classes with some extra checks that are not representable by types (at least in Python-land).

Let's say you have a function to divide two positive integers (which are just `int` in Python):

```python
import deal


@deal.pre(lambda a, b: a >= 0 and b >= 0)
@deal.raises(ZeroDivisionError)  # this function can raise if `b=0`, it is ok
def div(a: int, b: int) -> float:
    return a / b
```

It has all the contract information in the function definition:
- `@deal.pre(lambda a, b: a >= 0 and b >= 0)` checks that passed arguments are positive
- `@deal.raises(ZeroDivisionError)` allows this function to raise `ZeroDivisionError` without breaking the contract, by default functions cannot raise any exceptions

Note: type annotations are not enforced `(a: int, b: int) -> float`, you should use `mypy` to catch typing errors.

Usage (remember, it is still just a function!):

```python
div(1, 2)  # ok
div(1, 0)  # ok, runtime ZeroDivisionError

div(-1, 1)  # not ok
# deal.PreContractError: expected a >= 0 and b >= 0 (where a=-1, b=1)
```

Ok, the simple use-case is clear. Now, let's put a bug in this function on purpose:

```python
import deal


@deal.pre(lambda a, b: a >= 0 and b >= 0)
@deal.raises(ZeroDivisionError)  # this function can raise if `b=0`, it is ok
def div(a: int, b: int) -> float:
    if a > 50:  # Custom, in real life this would be a bug in our logic:
        raise Exception('Oh no! Bug happened!')
    return a / b
```

Luckily, `deal` follows the core idea of this article and ships tests with itself. To run them all we need to do is write just a single test case:

```python
import deal

from my_lib import div


@deal.cases(div)  # That's all we have to do to test deal-based functions!
def test_div(case: deal.TestCase) -> None:
    case()
```

Here's what the output would be like:

```
» pytest test_deal.py
============================= test session starts ==============================
platform darwin -- Python 3.8.6, pytest-6.2.2, py-1.10.0, pluggy-0.13.1
rootdir: /Users/sobolev/Documents/github/sobolevn.github.io
plugins: hypothesis-6.3.4, typeguard-2.11.1
collected 1 item

test_deal.py F                                                            [100%]

=================================== FAILURES ===================================
___________________________________ test_div ___________________________________

a = 51, b = 0

    @deal.raises(ZeroDivisionError)
    @deal.pre(lambda a, b: a >= 0 and b >= 0)
    def div(a: int, b: int) -> float:
        if a > 50:
>           raise Exception('Oh no! Bug happened!')
E           Exception: Oh no! Bug happened!

test_deal.py:8: Exception

site-packages/deal/_decorators/raises.py:42: RaisesContractError
---------------------------------- Hypothesis ----------------------------------
You can reproduce this example by temporarily adding
@reproduce_failure('6.3.4', b'AAAAAAAAZg==')
as a decorator on your test case
=========================== short test summary info ============================
FAILED test_deal.py::test_div - deal.RaisesContractError
============================== 1 failed in 0.35s ===============================
```

As you can see our tests did find the bug! But how?

There are a lot of questions to ask:

> Where did the data for the test come from?

It comes from another awesome library called [`hypothesis`](https://github.com/HypothesisWorks/hypothesis). It smartly generates lots of different test data according to some specific rules we define.

In our case, we have two rules:
- Generate two `int` arguments as defined in `def div(a: int, b: int)`
- These integers must be `>= 0` as defined in `@deal.pre(lambda a, b: a >= 0 and b >= 0)`

We can control how many examples would be generated and do other small tweaks.
More about it is in the [docs](https://deal.readthedocs.io/basic/tests.html).

> Why `ZeroDivisionError` didn't break the test while raw `Exception` did?

Because that's how contracts work: you clearly define all possible cases. If something strange happens - the contract is violated. In our example, `ZeroDivisionError` is a part of the contract via `deal.raises` decorator. So, we know that it can (and will) happen. That's why we don't treat it as a test failure, while raw `Exception` is not a part of our contract and we treat it as a failure.

> Will it find all bugs in my code?

That's the most interesting question. And the answer is **no**. Sad, but true.
There are endless use-cases, logic, combitations, and bugs in them. And I know for sure that it is impossible to catch all bugs your app has.

But, in reality, it will catch **a lot** of bugs. In my opinion, it is still worth it.

We can even go one step further and represent our contracts as [Theorems to be proved](https://github.com/Z3Prover/z3).
For example, `deal` has an ongoing research companion project - [`deal-solver`](https://github.com/orsinium-labs/deal-solver) - that can help with that. But, this is a subject for another article of its own, so let's move on for now.


## dry-python/returns

[`dry-python/returns`](https://github.com/dry-python/returns) is a library with primitives that make typed functional programming in Python easier.

Inside we have a bunch of interfaces that our users can extend for their own primitives/objects. In the recent article about [Higher Kinded Types](https://sobolevn.me/2020/10/higher-kinded-types-in-python) I have shown how this can be done in a type-safe way.

Now, I am going to show that it is not enough on its own. And most likely you will need some extra laws on how your objects should behave.

We call this feature "Monad laws as values".

### Identity laws

Let's start from the easiest Higher Kinded Interface we have: [`Equable`](https://github.com/dry-python/returns/blob/master/returns/interfaces/equable.py). It is an interface that allows type-safe equality checks. Because you can use `==` for everything in Python. But, our `.equals()` method will allow us to only check the object of the same type which has real values inside.

For example:

```python
from returns.io import IO

IO(1) == 1  # type-checks, but pointless, always false

IO(1).equals(1)  # does not type-check at all
# error: Argument 1 has incompatible type "int";
# expected "KindN[IO[Any], Any, Any, Any]"

other: IO[int]
IO(1).equals(other)  # ok, might be true or false
```

Here's how it looks like at the moment:

```python
_EqualType = TypeVar('_EqualType', bound='Equable')

class Equable(object):
    @abstractmethod
    def equals(self: _EqualType, other: _EqualType) -> bool:
        """Type-safe equality check for values of the same type."""
```

Let's say we want to create a bad implementation for this interface (because of science):

```python
from returns.interfaces.equable import Equable

class Example(Equable):
    def __init__(self, inner_value: int) -> None:
        self._inner_value = inner_value

    def equals(self, other: 'Example') -> bool:
        return False  # it breaks how `.equals` is supposed to be used!
```

It is clearly wrong because it always returns `False` without actually checking the `inner_value` of an object. But, it still satisfies the interface definition: it will type-check. That's how we can tell that just the interface is not enough. We need to test the implementation as well.

But, equality has known laws from math to catch cases like this:
- Reflexive law: a value must be equal to itself
- Symmetry law: `a.equals(b) == b.equals(a)`
- Transitivity law: if `a` equals `b` and `b` equals `c`, then `a` equals `c`

We can create a test that will ensure that our implementation holds these laws. Or we might forget about it. Or make a mistake in our test logic.

That's why it is important for library authors to think about their users and ship tests with their apps.

For example, we encode laws into the interface definition itself:

```python
from abc import abstractmethod
from typing import ClassVar, Sequence, TypeVar

from typing_extensions import final

from returns.primitives.laws import (
    Law,
    Law1,
    Law2,
    Law3,
    Lawful,
    LawSpecDef,
    law_definition,
)

_EqualType = TypeVar('_EqualType', bound='Equable')


@final
class _LawSpec(LawSpecDef):  # LOOKATME: our laws def!
    @law_definition
    def reflexive_law(
        first: _EqualType,
    ) -> None:
        """Value should be equal to itself."""
        assert first.equals(first)

    @law_definition
    def symmetry_law(
        first: _EqualType,
        second: _EqualType,
    ) -> None:
        """If ``A == B`` then ``B == A``."""
        assert first.equals(second) == second.equals(first)

    @law_definition
    def transitivity_law(
        first: _EqualType,
        second: _EqualType,
        third: _EqualType,
    ) -> None:
        """If ``A == B`` and ``B == C`` then ``A == C``."""
        if first.equals(second) and second.equals(third):
            assert first.equals(third)


class Equable(Lawful['Equable']):
    _laws: ClassVar[Sequence[Law]] = (
        Law1(_LawSpec.reflexive_law),
        Law2(_LawSpec.symmetry_law),
        Law3(_LawSpec.transitivity_law),
    )

    @abstractmethod
    def equals(self: _EqualType, other: _EqualType) -> bool:
        """Type-safe equality check for values of the same type."""
```

That's what I call "making tests a part of your app"!

Now, when we have laws in place, the only thing left to do is to enforce them. But, we need some data to do that. Luckily, we have `hypothesis` that can generate lots of random data for us.

So, here's what we are going to do:
1. We will pass a class definition that has `_laws` property defined
2. `hypothesis` will get all its laws
3. For each law we will generate a unique test case
4. For each test case we will generate lots of input data to be sure that the law holds for any possible input

[Source code](https://github.com/dry-python/returns/blob/master/returns/contrib/hypothesis/laws.py) for ones who are interested in the implementation details.

And we should provide a simple API for an end-user to do all these in one function call! That's what we came up with:

```python
# test_bad_example.py
from returns.contrib.hypothesis.laws import check_all_laws
from your_app import Example

check_all_laws(Example, use_init=True)
```

And here's the result:

```
» pytest test_bad_example.py
============================ test session starts ===============================
platform darwin -- Python 3.7.7, pytest-6.1.1, py-1.9.0, pluggy-0.13.1
rootdir: /example/returns, configfile: setup.cfg
plugins: returns-0.14.0
collected 3 items

test_bad_example.py .F.                                                   [100%]

=================================== FAILURES ===================================
____________________ test_Example_equable_reflexive_law _____________________
first = <ex.Example object at 0x104d61b90>

    @law_definition
    def reflexive_law(
        first: _EqualType,
    ) -> None:
        """Value should be equal to itself."""
>       assert first.equals(first)
E       AssertionError

returns/interfaces/equable.py:32: AssertionError
=========================== short test summary info ============================
FAILED test_bad_example::test_Example_equable_reflexive_law - AssertionError
========================= 1 failed, 2 passed in 0.22s ==========================
```

As we can see `test_Example_equable_reflexive_law` fails, because `equals` always returns `False` in our `Example` class. And `reflexive_law` which states `(a == a) is True` does not hold.

We can refactor `Example` to use the correct logic with actually checking `inner_value`:

```python
class Example(Equable):
    def __init__(self, inner_value: int) -> None:
        self._inner_value = inner_value

    def equals(self, other: 'Example') -> bool:
        return self._inner_value == other._inner_value  # no we are talking!
```

And run our tests once again:

```
» pytest test_bad_example.py
============================= test session starts ==============================
platform darwin -- Python 3.7.7, pytest-6.1.1, py-1.9.0, pluggy-0.13.1
rootdir: /example/returns, configfile: setup.cfg
plugins: returns-0.14.0
collected 3 items

test_bad_example.py ...                                                   [100%]

============================== 3 passed in 1.57s ===============================
```

But, we didn't actually write a single test for `Example`. Instead, we wrote laws once and for all future implementations! That's how caring about users looks like.

And again, awesome `hypothesis` helps us by generating random data to feed it into our tests (that's why the package is called `returns.contrib.hypothesis.laws`).

### Other functional laws

Of course, `Equable` is not the only interface we have in `dry-python/returns`, we have [lots of them](https://github.com/dry-python/returns/tree/master/returns/interfaces), covering most of the traditional functional instances, read our [docs](https://returns.readthedocs.io/en/latest/pages/interfaces.html) if you are interested.

These interfaces will help people if they are wondering what `Monad` actually is and what laws it has.

Most of them have laws attached to the definition. This helps our users to be sure that their implementations are correct with as few steps as possible.


## Conclusion

Shipping tests with your app might be a very cool feature in some use-cases.

And use-cases are really-really different! As I have shown, they can vary from Web frameworks to architecture tools and math-ish libraries.

I would love to see more of this in the future. I hope that I have shown possible benefits for current and future library authors.
