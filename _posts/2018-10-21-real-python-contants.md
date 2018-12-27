---
layout: post
title: 1-minute guide to real constants in Python
description: How to use final types to make your API better
date: 2018-07-08
tags: python
republished:
  dev.to: https://dev.to/wemake-services/1-minute-guide-to-real-constants-in-python-2bpk
---

<img src="https://thepracticaldev.s3.amazonaws.com/i/ncjggvghwfosu0wjdhbw.png" width="66%">

Many languages like `java` and `php` share a concept of `final` entities.
`final` entity is something that can not be changed.

We did not have this feature in `python`. Until two events happened recently:

1. I have released [`final-class` package](https://github.com/moscow-python-beer/final-class)
2. `python` core team [has released](https://github.com/python/mypy/pull/5522) official `final` support in `typing` module

Now we truly have a new *shiny* language feature! Let's dig into how it works and why it's so awesome.

## Declaring constants

First of all, you will need to install `mypy` and `type_extensions`:

```bash
» pip install mypy typing_extensions
```

Then we can start to use it:

```python
from typing_extensions import Final

DAYS_IN_A_WEEK: Final = 7
```

That's it! But, what will happen if we try to modify this constant?


```python
from typing_extensions import Final

DAYS_IN_A_WEEK: Final = 7
DAYS_IN_A_WEEK = 8  # I really want more days in a week!
```

Really, nothing. This is just good old `python` where you can do bizarre things with no payback. It just does not care about type annotation.

All the magic happens only when we run `mypy` type checker:

```
» mypy --python-version=3.6 --strict week.py
week.py:4: error: Cannot assign to final name "DAYS_IN_A_WEEK"
```

Boom! We have a constant here!

See how `Final` type deals with underlying types. You don't have to manually tell the type checker what the type actually is. It will [figure it out](https://en.wikipedia.org/wiki/Type_inference) all by itself. In other words, type checker will know that `DAYS_IN_A_WEEK` is `int`.

## Interfaces

And it goes beyond just declaring constants. You can declare your interface parts like attributes and methods that should not be changed:


```python
from typing_extensions import Final, final

class BaseAPIDeclaration(object):
     namespace: Final = 'api'

     @final
     def resolve(self) -> dict:
         return {'namespace': self.namespace, 'base': True}
```

Now all subclasses of this imaginary class won't be able to redefine both `namespace` and `resolve()`. But, let's try to hack them to see what happens:

```python
class ConcreteAPI(BaseAPIDeclaration):
    namespace = 'custom-api'

    def resolve(self) -> dict:
        return {'hacking': True}
```

`mypy` will back us up. Here's what the output will look like:

```
» mypy --python-version=3.6 --strict api.py
api.py:12: error: Cannot assign to final name "namespace"
api.py:14: error: Cannot override final attribute "resolve" (previously declared in base class "BaseAPIDeclaration")
```

## Classes

And even classes can be `final`. This way we can explicitly forbid to subclass classes not designed to be subclassed:

```python
from typing_extensions import final

@final
class HRBusinessUnit(AbstractBusinessUnit):
    def grant_permissions(self) -> None:
        self.api.do_some_hr_stuff()
```

What does `@final` decorator bring you? Confidence that nothing will break this contract:

```python
class SubHRBusinessUnit(HRBusinessUnit):
    def grant_permissions(self) -> None:
        self.api.do_some_it_stuff()
```

This code will make `mypy` quite unhappy (please, do not abuse robots!):

```
» mypy --python-version=3.6 --strict units.py
units.py:9: error: Cannot inherit from final class "HRBusinessUnit"
```

Now we can reason about why you should use it in your project.

## Conclusion

Creating new restrictions is good for you: it makes your code cleaner, more readable, and increases its quality.

Strong points:

0. it is clear from the definition what is a constant or a concrete realization and what is not
1. our users will have strict API boundaries that can not be violated
2. we can build closed systems that are not tolerant of breaking the rules
3. it is easier to understand what happens inside your application
4. it enforces [composition over inheritance](https://en.wikipedia.org/wiki/Composition_over_inheritance), which is a well-known best practice

Weak points: none! Write a comment if you can find any disadvantages.

Use types, create nice APIs, keep hacking!
