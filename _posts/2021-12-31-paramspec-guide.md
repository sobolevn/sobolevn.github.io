---
layout: post
title: "Python ParamSpec guide"
description: "Newly released feature in PEP612 allows you do a lot of advanced typing things with functions and their signatures"
date: 2021-12-31
tags: python
writing_time:
  writing: "0:30"
  proofreading: "0:10"
  decorating: "0:05"
republished: []
translated: []
---

Before `ParamSpec` ([PEP612](https://www.python.org/dev/peps/pep-0612/)) was released in Python3.10 and `typing_extensions`,
there was a big problem in typing decorators that change a function's signature.

Let's start with a basic example. How one can type a decorator function that does not change anything?

```python
from typing import Callable, TypeVar

C = TypeVar('C', bound=Callable)

def logger(function: C) -> C:
    def decorator(*args, **kwargs):
        print('Function called!')
        return function(*args, **kwargs)
    return decorator
```

Notice the most important part here: `C = TypeVar('C', bound=Callable)`

What does it mean? It means that we take any callable in and return the exact same callable.

This allows you to decorate any function and preserve its signature:

```python
@logger
def example(arg: int, other: str) -> tuple[int, str]:
    return arg, other

reveal_type(example)  # (arg: int, other: str) -> tuple[int, str]
```

But, there's a problem when a function does want to change something.
Imagine, that some decorator might also add `None` as a return value in some cases:

```python
def catch_exception(function):
    def decorator(*args, **kwargs):
        try:
            return function(*args, **kwargs)
        except Exception:
            return None
    return decorator
```

This is a perfectly valid Python code.
But how can we type it? Note that we cannot use `TypeVar('C', bound=Callable)` anymore, since we are changing the return type now.

Initially, I've tried something like:

```python
def catch_exception(function: Callable[..., T]) -> Callable[..., Optional[T]]:
    ...
```

But, this means a different thing: it turns all function's arguments into `*args: Any, **kwargs: Any`, but, the return type will be correct. Generally, this is not what we need when it comes to type-safety.

The second way to do that in a type-safe way is adding a custom Mypy plugin.
Here's our example from [`dry-python/returns`](https://github.com/dry-python/returns) to support decorators that [were changing return types](https://github.com/dry-python/returns/blob/0.17.0/returns/contrib/mypy/_features/decorators.py). But, plugins are quite hard to write (you need to learn a bit of Mypy's API), they are not universal (for example, Pyright does not understand Mypy plugins), and they require to be [explicitly installed](https://returns.readthedocs.io/en/latest/pages/contrib/mypy_plugins.html) by the end user.

That's why `ParamSpec` was added. Here's how it can be used in this case:

```python
from typing import Callable, TypeVar, Optional
from typing_extensions import ParamSpec  # or `typing` for `python>=3.10`

T = TypeVar('T')
P = ParamSpec('P')

def catch_exception(function: Callable[P, T]) -> Callable[P, Optional[T]]:
    def decorator(*args: P.args, **kwargs: P.kwargs) -> Optional[T]:
        try:
            return function(*args, **kwargs)
        except Exception:
            return None
    return decorator
```

Now, all decorated functions will preserve their argument types and change their return type to include `None`:

```python
@catch_exception
def div(arg: int) -> float:
    return arg / arg

reveal_type(div)  # (arg: int) -> Optional[float]

@catch_exception
def plus(arg: int, other: int) -> int:
    return arg + other

reveal_type(plus)  # (arg: int, other: int) -> Optional[int]:
```

The recent release of Mypy 0.930 with `ParamSpec` support allowed us to remove our custom Mypy plugin and use a well-defined primitive. Here's [a commit to show](https://github.com/dry-python/returns/commit/32aa73f852ef2ffb5ff4664b0d6e0ac2ebd71017) how easy our transition was. It was even released today in [`returns@0.18.0`](https://github.com/dry-python/returns/releases/tag/0.18.0), check it out!

## What's next? Concatenate

But, that's not all! Because some decorators modify argument types, PEP612 also adds the `Concatenate` type that allows prepending, appending, transforming, or removing function arguments.

Unfortunately, Mypy does not support `Concatenate` just yet, but I can show you some examples from PEP itself. Here's how it is going to work.

Let's start with some basic definitions:

```python
from typing_extensions import ParamSpec, Concatenate  # or `typing` for `python>=3.10`

P = ParamSpec('P')

def bar(x: int, *args: bool) -> int: ...
```

We are going to change the type of `bar` function with the help of `P` parameter specification. First, let's prepend an `str` argument to this function:

```python
def add(x: Callable[P, int]) -> Callable[Concatenate[str, P], int]: ...

add(bar)  # (str, /, x: int, *args: bool) -> int
```

Notice that a positional-only `str` argument is added to the return type of `add(bar)`.
Now, let's try removing an argument:

```python
def remove(x: Callable[Concatenate[int, P], int]) -> Callable[P, int]: ...

remove(bar)  # (*args: bool) -> int
```

Because we use `P` and `Concatenate` in the argument type, the return type will not have an `int` argument anymore.

And finally, let's change an argument type from `int` to `str` and return type from `int` to `bool`:

```python
def transform(
    x: Callable[Concatenate[int, P], int]
) -> Callable[Concatenate[str, P], bool]: ...

transform(bar)  # (str, /, *args: bool) -> bool
```

Looking forward to new Mypy release with `Concatenate` support. I totally know some places where it will be useful.

## Conclusion

PEP612 adds two very powerful abstractions that allow us to better type our functions and decorators, which play a very important role in Python's world.

Complex projects (like [Django](https://github.com/typeddjango/django-stubs)) or simple type-safe scripts can highly benefit from this new typing feature. And I hope you will!

Happy New Year!
