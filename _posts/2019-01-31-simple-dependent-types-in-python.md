---
layout: post
title: "Simple dependent types in Python"
description: "Python typing just got a new shiny feature: Literal types. Let's dive in a get familiar with it."
date: 2019-01-31
tags: python django
republished:
  - resource: dev.to
    link: https://dev.to/wemake-services/simple-dependent-types-in-python-4e14
    language: us
---

![Post logo and title](https://thepracticaldev.s3.amazonaws.com/i/d1e3x1c4eom0vy9u8gd9.png)

I am quite excited about this new feature in `python`: simple dependent types.
"Dependent types" might sound complex, but it is not. Instead, it is a useful feature and I am going to show how it works and when you should rely on it.

We are not going to dive deep into the theory and I am not going to provide any kind of math formulas here. As Steven Hawking once said:

> Someone told me that each equation I included in the book would halve the sales. I, therefore, resolved not to have any equations at all. In the end, however, I did put in one equation, Einstein's famous equation, E=mc^2. I hope that this will not scare off half of my potential readers

What is dependent typing? It is a concept when you rely on values of some types, not just raw types.

Consider this example:

```python
from typing import Union

def return_int_or_str(flag: bool) -> Union[str, int]:
    if flag:
        return 'I am a string!'
    return 0
```

We can clearly see that depending on the value of `flag` we can get `str` or `int` values. The result type will be `Union[str, int]`. And every time we call this function with mixed-up-return-type we have to check what type we actually got and what to do with it. This is inconvenient and makes your code more complex.

You might say that this function is just bad, and it should not behave the way it does now. Correct, but there are some real-world use-cases where this is required by design.

Consider [`open` function from the standard library](https://docs.python.org/3/library/functions.html#open). How often did you get runtime errors because you mixed up `str` and `bytes`? It happened a thousand times to me. And I do not want this to happen again! So, we will write type-safe code for this time.

```python
def open_file(filename: str, mode: str):
    return open(filename, mode)
```

What return type do we expect here? `str`? Wait for a second! We can call it like so: `open_file('some.txt', 'rb')` and it will return `bytes`! So, the return type is [`Union[IO[str], IO[bytes]]`](https://mypy.readthedocs.io/en/latest/cheat_sheet_py3.html#miscellaneous). And it really hard to work with it. We will end up with a lot of conditions, unneeded casts, and guards.

Dependent types solve this problem. But, before we will move any further - we have to know some primitives that we are going to use later.

## Literal and @overload

If you don't have `mypy` and `typing_extensions` installed, you need to install the latest version of these packages.

```terminal
» pip install mypy typing_extensions
```

And now we are ready to rewrite our code with the power of `Literal` and `@overload`:

```python
from typing import overload
from typing_extension import Literal
```

A quick side **note**: `typing` is a builtin `python` module where all possible types are defined. And the development speed of this module is limited to the new `python` version releases. And `typing_extensions` is an official package for new types that will be available in the future releases of `python`. So, it does solve all issues with the release speed and frequency of regular `typing` module.

### Literal

`Literal` type represents a specific value of the specific type.

```python
from typing_extensions import Literal

def function(x: Literal[1]) -> Literal[1]:
     return x

function(1)
# => OK!

function(2)
# => Argument has incompatible type "Literal[2]"; expected "Literal[1]"
```

To run this code use: `mypy --python-version=3.6 --strict test.py`. It will remain the same for all examples in this article.

That's awesome! But, what is the difference between `Literal[0]` and `int` type?

```python
from typing_extensions import Literal

def function(x: int = 0, y: Literal[0] = 0) -> int:
    reveal_type(x)
    # => Revealed type is 'builtins.int'
    reveal_type(y)
    # => Revealed type is 'Literal[0]'
    return x
```

Revealed types differ. The only way to get `Literal` type is to annotate is as `Literal`. It is done to save backward compatibility with older versions of `mypy` and not to detect `x: int = 0` as a `Literal` type. Because the value of `x` can later be changed.

You can use `Literal[0]` everywhere where a regular `int` can be used, but not the other way around.

```python
from typing_extensions import Literal

def function(x: int, y: Literal[0]) -> int:
    return x

x1: int = 0
y1: Literal[0] = 0

function(y1, y1)
function(x1, x1)
# => Argument 2 has incompatible type "int"; expected "Literal[0]"
```

See? Since `x1` is a variable - it cannot be used where we expect `Literal`s.
In the first part of this series, I wrote an article about [using real constants in `python`](https://sobolevn.me/2018/07/real-python-contants). Read it if you do not know the difference between variables and constants in `python`.

Will constants help in this case? Yes, they will!

```python
from typing_extensions import Literal, Final

def function(x: int = 0, y: Literal[0] = 0) -> int:
     return x

x: Final = 0
y: Literal[0] = 0

function(y, y)
function(x, x)
```

As you can see, when declaring some value `Final` - we create a constant. That cannot be changed. And it matches what `Literal` is. Source code implementation of these two types is also quite similar.

Why do I constantly call dependent types in `python` simple? Because it is currently limited to simple values: `int`, `str`, `bool`, `float`, `None`. It can not currently work with tuples, lists, dicts, custom types and classes, etc. But, you can track the development progress [in this thread](https://github.com/python/mypy/issues/3062).

Do not forget about [the official docs](https://mypy.readthedocs.io/en/latest/literal_types.html).

### @overload

The next thing we will need is `@overload` decorator. It is required to define multiple function declarations with different input types and results.

Imagine, we have a situation when we need to write a function that decreases a value. It should work with both `str` and `int` inputs. When given `str` it should return all the input characters except the last one, but when given `int` it should return the previous number.

```python
from typing import Union

def decrease(first: Union[str, int]) -> Union[str, int]:
    if isinstance(first, int):
        return first - 1
    return first[:-1]

reveal_type(decrease(1))
# => Revealed type is 'Union[builtins.str, builtins.int]'
reveal_type(decrease('abc'))
# => Revealed type is 'Union[builtins.str, builtins.int]'
```

Not too practical, isn't it? `mypy` still does not know what specific type was returned. We can enhance the typing with `@overload` decorator.

```python
from typing import Union, overload

@overload
def decrease(first: str) -> str:
    """Decreases a string."""

@overload
def decrease(first: int) -> int:
    """Decreases a number."""

def decrease(first: Union[str, int]) -> Union[str, int]:
    if isinstance(first, int):
        return first - 1
    return first[:-1]

reveal_type(decrease(1))
# => Revealed type is 'builtins.int'
reveal_type(decrease('abc'))
# => Revealed type is 'builtins.str'
```

In this case, we define several function heads to give `mypy` enough information about what is going on. And these head functions are only used during the type checking this module. As you can see only one function definition actually contains some logic. You can create as many function heads as you need.

The idea is: whenever `mypy` finds a function with multiple `@overload` heads it tries to match input values to these declarations. When it finds the first match - it returns the result type.

[Official documentation](https://mypy.readthedocs.io/en/latest/more_types.html#function-overloading) might also help you to understand how to use it in your projects.

## Dependent types

Now, we are going to combine our new knowledge about `Literal` and `@overload` together to solve our problem with `open`. At last!

Remember, we need to return `bytes` for `'rb'` mode and `str` for `'r'` mode.
And we need to know the exact return type.

An algorithm will be:

1. Write several `@overload` decorators to match all possible cases
2. Write `Literal[]` types when we expect to get `'r'` or `'rb'`
3. Write function logic in a general case

```python
from typing import IO, Any, Union, overload
from typing_extensions import Literal

@overload
def open_file(filename: str, mode: Literal['r']) -> IO[str]:
    """When 'r' is supplied we return 'str'."""

@overload
def open_file(filename: str, mode: Literal['rb']) -> IO[bytes]:
    """When 'rb' is supplied we return 'bytes' instead of a 'str'."""

@overload
def open_file(filename: str, mode: str) -> IO[Any]:
    """Any other options might return Any-thing!."""

def open_file(filename: str, mode: str) -> IO[Any]:
    return open(filename, mode)

reveal_type(open_file('some.txt', 'r'))
# => Revealed type is 'typing.IO[builtins.str]'
reveal_type(open_file('some.txt', 'rb'))
# => Revealed type is 'typing.IO[builtins.bytes]'
reveal_type(open_file('some.txt', 'other'))
# => Revealed type is 'typing.IO[AnyStr]'

```

What do we have here? Three `@overload` decorators and a function body with logic. First `@overload` decorator declares to return `str` for `'r'` `Literal` parameter, the second one tells to return `bytes` when we use `'rb'` parameter. And the third one is fallback. Whenever we provide another any other mode - we can get both `str` and `bytes`.

Now, our problem is solved. We supply some specific values into the function, we receive some specific type in return. It makes our code easier to read and safer to execute.

Thanks how dependent types work in `python`!

## Conclusion

I hope this little tutorial helped you to understand typing in `python` a little bit better. In the future articles, I will cover more complex topics about `mypy`.
[Follow me on Github](https://github.com/sobolevn) to subscribe to both my blog and a feed of my new open-source projects.
