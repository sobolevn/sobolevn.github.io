---
layout: post
title: Typed functional Dependency Injection in Python
description: "Dependency injection is a controversial topic. There are known problems, hacks, and even whole methodologies on how to work with DI frameworks. It is not the case when using functional approach: which is simple and explicit."
date: 2020-02-02
tags: python
writing_time:
 writing: "2:40"
 proofreading: "1:00"
 decorating: "0:10"
republished:
  - resource: dev.to
    link: https://dev.to/wemake-services/typed-functional-dependency-injection-in-python-4e7b
    language: us
translated: []
---

![Cover image](https://dev-to-uploads.s3.amazonaws.com/i/icaf8zy973836hf4dh8j.png)

Dependency injection is a controversial topic. There are known problems, hacks, and even whole methodologies on how to work with DI frameworks.

A lot of people asked me: how can you use a lot of typed functional concepts together with [traditional object-oriented dependency injection](https://sobolevn.me/2019/03/enforcing-srp)?

And this question makes a lot of sense. Because functional programming is all about composition. And dependency injection is just magic. You get some almost random objects injected into some places of your code. Moreover, the whole container to be injected later is magically assembled from the separate parts at runtime.

This leads to a serious contradiction between functional declarative style and "OMG, where did this class come from?"

![DI meme](https://dev-to-uploads.s3.amazonaws.com/i/it0fk0jbqphcgecnpbq7.jpg)

Today we are going to solve this problem with a good-old functional way.


## Regular functions

Imagine that you have a `django` based game, where you award users with points for each guessed letter in a word (unguessed letters are marked as `'.'`):

```python
from django.http import HttpRequest, HttpResponse
from words_app.logic import calculate_points

def view(request: HttpRequest) -> HttpResponse:
    user_word: str = request.POST['word']  # just an example
    points = calculate_points(user_word)
    ...  # later you show the result to user somehow
```

And here's your business logic:

```python
# Somewhere in your `words_app/logic.py`:

def calculate_points(word: str) -> int:
    guessed_letters_count = len([letter for letter in word if letter != '.'])
    return _award_points_for_letters(guessed_letters_count)

def _award_points_for_letters(guessed: int) -> int:
    return 0 if guessed < 5 else guessed  # minimum 6 points possible!
```

This is a pretty simple app: users try to guess some word and in the meantime, we award points for each guessed letter. But, we have a threshold. We only award 6 or more points for 6 or more guessed letters. That's it. We have our framework layer in place and our beautiful pure logic. This code is really simple to read and modify.

Or is it? Let's try to modify it to find out. Let's say we want to make our game more challenging by making the points threshold configurable. How can we do that?


## Naive attempt

Ok, let's make `_award_points_for_letters` accept the second argument `threshold: int`:

```python
def _award_points_for_letters(guessed: int, threshold: int) -> int:
    return 0 if guessed < threshold else guessed
```

And now your code won't type-check. Because that's how our caller looks like:

```python
def calculate_points(word: str) -> int:
    # ...
    return _award_points_for_letters(guessed_letters_count)
```

To fix this ``calculate_points`` function (and all other upper caller functions) will have to accept ``threshold: int`` as a parameter and pass it to ``_award_points_for_letters``, like so:

```python
def calculate_points(word: str, threshold: int) -> int:
    # ...
    return _award_points_for_letters(guessed_letters_count, threshold)
```

It also affects our `views.py`:

```python
from django.conf import settings
from django.http import HttpRequest, HttpResponse
from words_app.logic import calculate_points

def view(request: HttpRequest) -> HttpResponse:
    user_word: str = request.POST['word']  # just an example
    points = calculate_points(user_word, settings.WORD_THRESHOLD)
    ...  # later you show the result to user somehow
```

As we can see it is doable. But, it requires to change the whole call stack for a single parameter. Which leads us to some evident problems:

- If our call stack is big, we will have to modify lots of layers to achieve the place where we really need this value
- All our functions and classes will be infected with the values we pass. This would have several effects: you won't be able to understand which functions and classes really need passed values and which are just work as a transport layer (like `calculate_points` in our example). And of course, people would start using these passed values where they need them. And this will implicitly increase the coupling of your code and environment.
- It would be hard to compose your functions and classes together. This extra parameter will always get in the way. Arities of your functions would not match.

All in all: this is working, but not a scalable solution. But, I would probably do this myself for a small app.


## Frameworks

A lot of Django people right now might ask: why not just importing settings and using it like `django` docs teaches us?

Because this is **ugly**!

For now, we have framework-independent business logic. It is a great thing. It is resistant to any framework-specific changes. And it also does not implicitly bring all the framework complexity with it. Let's remember how `django.conf.settings` works:

1. We need to set `DJANGO_SETTINGS_MODULE` env variable to find the settings module
2. Somewhere deep inside the framework `django.setup()` will happen
3. `django` will import this module
4. This module might contain [settings-dependent logic](https://sobolevn.me/2017/04/managing-djangos-settings)
5. Settings will also access environment, files, maybe even cloud providers for some specific values
6. Then `django` will have almost-immutable singleton object that you can import from any place in your code
7. You will have to mock settings in your tests to simply pass other value to your function. Or multiple (and many more) values if you heavily rely on settings module (which will probably be the case in any app)

Is it worth it? Maybe. Sometimes `django.settings` is good enough. You can possibly have just a couple of primitive values to be injected. And this way allows to do it very fast.

But, I would not recommend anyone to go this way if you really want to build a large app with clearly defined boundaries and comprehensive domain logic. I would even recommend using [`import-linter`](https://import-linter.readthedocs.io/) to forbid to import anything from `django` in your logic.

So, how in a world I am going to pass this troublesome value into the function if nothing really works? Parameters are too noisy, containers are too magic and hard to work with, and global settings are just pure evil in the form of a singleton?


## Composition

Functional programmers are smart people. Really. They can do literally everything with just pure functions.

[![Functional patterns](https://dev-to-uploads.s3.amazonaws.com/i/e0kjtxmcsotbgj3plqok.gif)](https://vimeo.com/113588389)

They have also solved the dependencies problem with elegance while maintaining simplicity. The core idea of dependency injection in a functional way is that we don't call things that rely on the context we don't have. Instead, we schedule them to be called later. Let's see how our original logic will change after adapting this idea:

```python
from typing import Callable
from typing_extensions import Protocol

class _Deps(Protocol):  # we rely on abstractions, not direct values or types
    WORD_THRESHOLD: int

def calculate_points(word: str) -> Callable[[_Deps], int]:
    guessed_letters_count = len([letter for letter in word if letter != '.'])
    return _award_points_for_letters(guessed_letters_count)

def _award_points_for_letters(guessed: int) -> Callable[[_Deps], int]:
    def factory(deps: _Deps):
        return 0 if guessed < deps.WORD_THRESHOLD else guessed
    return factory
```

Please, notice how we are now passing `factory` function to the top level of our app. Also, pay extra attention to our new `_Deps` [protocol](https://mypy.readthedocs.io/en/stable/protocols.html): it allows us to use structural subtyping to define the required API. In other words, all objects with `WORD_THRESHOLD` `int` attribute would pass the check (to enforce the `django` settings typecheck use [`django-stubs`](https://github.com/typeddjango/django-stubs)).

The only thing left is to call our returned `factory` function from the very top:

```python
from django.conf import settings
from django.http import HttpRequest, HttpResponse
from words_app.logic import calculate_points

def view(request: HttpRequest) -> HttpResponse:
    user_word: str = request.POST['word']  # just an example
    points = calculate_points(user_words)(settings)  # passing the dependencies and calling
    ...  # later you show the result to user somehow
```

Looks easy! All our requirements are satisfied:

1. We don't have any magic, literally zero
2. Everything is typed properly
3. Our logic is still pure and is independent from the framework

The only problem we now have is that our logic does not compose well. Let me illustrate my point with a new requirement. During the holiday season our game might award one extra point to the final score randomly. And here's how we can adapt our source code to meet the new requirement:

```python
def calculate_points(word: str) -> Callable[[_Deps], int]:
    guessed_letters_count = len([letter for letter in word if letter != '.'])
    awarded_points = _award_points_for_letters(guessed_letters_count)
    return _maybe_add_extra_holiday_point(awarded_points)  # won't work :(

def _maybe_add_extra_holiday_point(awarded_points: int) -> int:
    return awarded_points + 1 if random.choice([True, False]) else awarded_points
```

But, oops, `awarded_points` has type `Callable[[_Deps], int]` it cannot be easily composed with this new function. Of course we can create a new function inside `_maybe_add_extra_holiday_point` just for the sake of composition:

```python
def _maybe_add_extra_holiday_point(awarded_points: Callable[[_Deps], int]) -> Callable[[_Deps], int]:
    def factory(deps: _Deps) -> int:
        points = awarded_points(deps)
        return points + 1 if random.choice([True, False]) else points
    return factory
```

But is it pleasant to work with? I hope most people will agree with me that it is not.

Let's remember that functional programmers are smart people. They can do literally everything with just pure functions. And composition helpers. That's why they came up with the `Reader` monad (or as we call it [`RequiresContext` container](https://returns.readthedocs.io/en/latest/pages/context.html) to not scare people to death in Python land): it is a composition helper for this exact situation. Let's refactor our code once again to see how it works:

```python
import random
from typing_extensions import Protocol
from returns.context import RequiresContext

class _Deps(Protocol):  # we rely on abstractions, not direct values or types
    WORD_THRESHOLD: int

def calculate_points(word: str) -> RequiresContext[_Deps, int]:
    guessed_letters_count = len([letter for letter in word if letter != '.'])
    awarded_points = _award_points_for_letters(guessed_letters_count)
    return awarded_points.map(_maybe_add_extra_holiday_point)

def _award_points_for_letters(guessed: int) -> RequiresContext[_Deps, int]:
    def factory(deps: _Deps):
        return 0 if guessed < deps.WORD_THRESHOLD else guessed
    return RequiresContext(factory)

def _maybe_add_extra_holiday_point(awarded_points: int) -> int:
    return awarded_points + 1 if random.choice([True, False]) else awarded_points
```

We have changed the return type of the functions and we have also added `awarded_points.map(_maybe_add_extra_holiday_point)`. Which is another way of saying "compose `RequiresContext` container with this pure function `_maybe_add_extra_holiday_point`". We don't change our framework layer at all.

How does it work?

1. When we call `calculate_points(user_words)` it does not actually start to do anything, it only returns `RequiresContext` container to be called later
2. The container is smart enough to understand the `.map` method. It remembers that after its execution it will need to call `_maybe_add_extra_holiday_point` function
3. When we add the context to the container in a form of `calculate_points(user_words)(settings)` our `def factory(deps: _Deps)` executes and returns the long-awaited value
4. Then `_maybe_add_extra_holiday_point` actually executes and returns the final value

That's it. No mess, no magic, no framework internals. But typing, composition, and simplicity.


## Transparent dependencies

What if you want to also change the symbol that indicates unguessed letter (currently `.`), to be configurable? Some users prefer `.`, some `_`. Ok, we can do that, cannot we?

A little confusion can happen to functional newcomers at this step. Because we only have `deps` available inside `_award_points_for_letters` and not inside `calculate_points`. And composition again is the answer. We have a special composition helper for this case: [`Context.ask()`](https://returns.readthedocs.io/en/latest/pages/context.html#returns.context.requires_context.Context.ask) which fetches the dependencies from the current context and allows us to explicitly use it whenever we want:

```python
from returns.context import Context, RequiresContext

class _Deps(Protocol):  # we rely on abstractions, not direct values or types
    WORD_THRESSHOLD: int
    UNGUESSED_CHAR: str  # new value!

def calculate_points(word: str) -> RequiresContext[_Deps, int]:
    def factory(deps: _Deps) -> RequiresContext[_Deps, int]:
        guessed_letters_count = len([
            letter for letter in word if letter != deps.UNGUESSED_CHAR
        ])
        awarded_points = _award_points_for_letters(guessed_letters_count)
        return awarded_points.map(_maybe_add_extra_holiday_point)

    return Context[_Deps].ask().bind(factory)

# ...
```

Two things to mention here:

1. `Context.ask()` requires to be explicitly annotated with `_Deps`, because `mypy` cannot infer the type here
2. `.bind` method is also a composition utility. In contrast to `.map` which composes a container with a pure function, `.bind` allows us to compose a container with a function that also returns a container of the same type

Now we can share the same immutable read-only context for all our code.


## Static typing

Static typing is much more than accidentally trying to add a string to an integer. It is about your architecture and rules that each piece of this complex system has.

And many readers might already found one trap that I have left in this example. Let's reveal the ugly truth: `_maybe_add_extra_holiday_point` is not pure. We won't be able to test it without a mock on `random`. And because it is impure, its type is `Callable[[int], IO[int]]`.

Wait, what is it? [`IO`](https://returns.readthedocs.io/en/latest/pages/io.html) is your best friend when we talk about good architecture and high-quality composition rules. It is an explicit marker that your function is not pure. Without this type, we are free to write an ugly, untestable code where we want it. We don't have any contracts to respect. We can just pray for the reigning chaos.

And also, don't forget that some functions may end up with successful execution and may also fail. [Throwing exceptions](https://sobolevn.me/2019/02/python-exceptions-considered-an-antipattern) inside your business logic is ugly. And it also removes the explicit contract from your architecture. That's a barbarian practice. If something can go wrong, we have to be prepared for it. That's why many people use [`Result`](https://returns.readthedocs.io/en/latest/pages/result.html) to indicate that things can (and will!) go wrong.

All these two types are heavily related to our `RequiresContext` container. Because its return type can be tricky:

- `RequiresContext[EnvType, ReturnType]` indicates that we work with a pure function that cannot fail (like in our example without `random`)
- `RequiresContext[EnvType, Result[ValueType, ErrorType]]` indicates that we work with a pure function that can fail (for example when we use `/` math operator and `0` as a delimiter or any logical failures)
- `RequiresContext[EnvType, IO[ReturnType]]` indicates that we work with an impure function that cannot fail (like our example with `random`)
- `RequiresContext[EnvType, IO[Result[ValueType, ErrorType]]]` indicates that we work with an impure function that can fail (like HTTP, filesystem, or database calls)

It does not look fun to compose, yeah? That's why we also ship useful combinators with [`returns`](https://github.com/dry-python/returns) like:

- [`RequireContextResult`](https://returns.readthedocs.io/en/latest/pages/context.html#requirescontextresult-container) to easily work with `RequiresContext` which has `Result` as the return type
- [`RequiresContextIOResult`](https://returns.readthedocs.io/en/latest/pages/context.html#requirescontextioresult-container) to easily work with `RequiresContext` which has `IO[Result]` as the return type

This way `returns` library takes all the hacky composition rules on itself and provides nice API for our end users.


## DI containers

"So, are you saying that I should not use any DI frameworks at all?" one may ask after reading this article. And it is an interesting question indeed.

I have spent a lot of time thinking about this very topic myself. And my answer is: you can (and probably should) use a dependency injection container framework on the framework level.

And here's why: in real-world apps your `_Deps` class with soon become really big. It would have lots of stuff inside:

- Repositories and database-related utilities
- HTTP services and API integrations
- Permission and authentication helpers
- Caching layer
- Async tasks and utilities to work with them
- And probably more!

To handle all this stuff you would need to import a lot of other stuff.
And you will need to create this monstrous object somehow. That's where DI frameworks can help you. A lot.

With their magic creating this context might be a lot easier and safer. You need complex tools to fight real complexity.

That's why tools like [`dependencies`](https://github.com/dry-python/dependencies) are required for every complex system: both functional and imperative.


## Conclusion

Let's sum up things we have learned today:

1. Different applications require different levels of architecture and have different requirements on dependency injection
2. If you are scared from magic DI containers have, use typed functional composition: `RequiresContext` can help you to provide the required context from the top level to the very bottom and to define nice composition API
3. When writing high-level code think about your architecture and explicitly define your contracts as types. Use `IO` and `Result` to indicate possible failure and impurity
4. Use composition helpers when in doubt
5. Use DI containers on the very top level of your app, when complexity gets out of your control

Functional programming is fun and easy! Feel free to [star our repo](https://github.com/dry-python/returns) if you liked the concepts above. Or go to [the docs](https://returns.readthedocs.io/en/latest/index.html) to learn more new things.

Very special thanks to [Nikolay Fominykh](https://www.facebook.com/nikolay.fominykh) and [Artem](https://github.com/supadrupa) for reviewing this article.
