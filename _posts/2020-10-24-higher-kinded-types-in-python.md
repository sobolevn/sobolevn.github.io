---
layout: post
title: "Higher Kinded Types in Python"
description: "This post will guide newcomers through the high waters of Higher Kinded Types and explain how they work and how they can be used."
date: 2020-10-24
tags: python
writing_time:
  writing: "3:00"
  proofreading: "0:30"
  decorating: "0:10"
republished:
  - link: https://dev.to/wemake-services/higher-kinded-types-in-python-51n8
    language: us
translated: []
---

![Cover image](https://dev-to-uploads.s3.amazonaws.com/i/73uvh47fvxfveqpz2xgi.png)

`dry-python/returns@0.15` is [released](https://github.com/dry-python/returns/releases/tag/0.15.0)! And it means that now anyone can use our Higher Kinded Types emulation in their projects.

In this post I will explain:
- What Higher Kinded Types (HKTs) are and why they are useful
- How they are implemented and what limitations there are
- How can you use them in your own projects

Without further ado, let's talk about typing!


## Simple types

Typing is layered. Like a good cake. There are at least three layers that we are going to cover.

Simple (or flat) typing, like `x: int = 1`. This allows us to express simple types and their transformations. Like `int -> str`:

```python
def stringify(arg: int) -> str:
    return str(arg)
```


A lot of languages like `go` and `php` do not go beyond this line. And they still work pretty well! These types are also sometimes called `*`-kinded. It can be understood as "a place for just a single type argument".


## Generic

Generic level is required to express "nested" types. For example, you have a list of integers. In Python we annotate it as `List[int]` or [`list[int]`](https://www.python.org/dev/peps/pep-0585/) in Python `3.9`. This allows us to have types with other types as arguments. `List` can receive `int` or `str` or even another `List` as the type argument. This way we can nest type and types start to have their own structure.

Generics are much more interesting than simple types. And they can have multiple type arguments:
- List has one: for values, so it has a kind of `* -> *`. It can be understood as a type transformation `List -> T = List[T]`
- Dict has two: for keys and values, so it has a kind of `* -> * -> *`. It can be understood as a type transformation `Dict -> K -> V = Dict[K, V]`
- And so on!

This would be very helpful for us in the future, I promise.

We can also write transformations for generic types:

```python
def stringify_list_items(arg: List[int]) -> List[str]:
    return [str(item) for item in arg]
```

But, that is where things begin to be quite complicated.

How can this function work with other iterables like `set`, `frozenset`, `tuple`?
We can express this in Python as easy as:

```python
def stringify_iterable_items(arg):
    return type(arg)(str(item) for item in arg)
```

But the typing part would be quite challenging. Let's try several things.


### Common interface

The first obvious thing to try is `Iterable` protocol. It is builtin into Python and does what we need.

```python
from typing import Iterable

def stringify_iterable_items(arg: Iterable[int]) -> Iterable[str]:
    return type(arg)(str(item) for item in arg)
```

Let's try it out:

```python
reveal_type(stringify_iterable_items([1, 2, 3]))
# Revealed type is 'typing.Iterable[builtins.str]'

reveal_type(stringify_iterable_items({1, 2, 3}))
#  Revealed type is 'typing.Iterable[builtins.str]'

reveal_type(stringify_iterable_items((1, 2, 3)))
#  Revealed type is 'typing.Iterable[builtins.str]'
```

You can see that a part of our typing information is lost. We pass `List` or `Set` or `Tuple` and always get the `Iterable` back.

Sometimes - this is ok. But, in some cases, this is not enough. Let's try some other technique!


### Methods

One can say: we are all using Object-Oriented Programming! Why cannot we just create a new method for each type we need? And specify the exact return type there!

Well, it is a possible solution. But, there are some reasonable problems:

- You cannot add methods to existing types and extend them with this approach. Only create new ones, probably via subtyping, and add new methods there. In our example you would have to create your own versions of `List`, `Set`, and `Tuple`. Which is not desirable in most situations
- It really starts to be messy if you have a lot of methods to add. A type with more than `X` (choose the number yourself) methods starts to be really complex to read, understand, and use. Instead, using separate functions is much easier, because we don't have to put everything into a single namespace

Let's try something else.


### overloads

Another solution that might solve our problem is using the ``@overload`` decorator with proper types for each required case.

```python
from typing import List, Set, overload

@overload
def stringify_iterable_items(arg: List[int]) -> List[str]:
    ...

@overload
def stringify_iterable_items(arg: Set[int]) -> Set[str]:
    ...

def stringify_iterable_items(arg):
    return type(arg)(str(item) for item in arg)
```

Let's test it:

```python
reveal_type(stringify_iterable_items([1, 2]))
# Revealed type is 'builtins.list[builtins.str]'

reveal_type(stringify_iterable_items({1, 2}))
# Revealed type is 'builtins.set[builtins.str]'
```

Awesome! Looks like we've achieved our goal, haven't we? But, there's a new problem. We have to manually list all possible cases in a function's signature. This works for cases when all possible arguments and outcomes are known in advance. But, not in this case. In Python `Iterable` is a protocol. We can use this function with any type with `__iter__` method defined: with both builtin and custom types. So, the number of possible arguments and outcomes is endless.

To illustrate the problem, let's see what happens for `Tuple` which is not listed in the function's overloads:

```python
reveal_type(stringify_iterable_items((1, 2, 3)))
# error: No overload variant of "stringify_iterable_items" matches argument type "Tuple[int, int, int]"
```

We, in `dry-python` [used this technique](https://github.com/dry-python/returns/blob/0.14.0/returns/_generated/converters/flatten.pyi) with `@overload` decorator for our previous versions. This allowed us to write correct definitions of functions working with generic types. But, they were limited to the pre-defined set of our own types. And we wanted to allow our users to create their custom types based on our interfaces. With the full existing code reuse.


## Higher Kinded Types

That's where the idea of Higher Kinded Types becomes useful. We need HKTs when we want to change the inner structure of generics with full type information preserving and openness to the extension. In theory, you can write something like:

```python
from typing import Iterable

T = TypeVar('T', bound=Iterable)

def stringify_iterable_items(arg: T[int]) -> T[str]:
    return type(arg)(str(item) for item in arg)
```

And this would solve our problem! What happens here is that we abstract away the `Iterable` type itself. And then ask `mypy` to figure this out for us.

This way we can potentially have `stringify_iterable_items` working for any `Iterable` type, but with the exact same type returned back without any information lost. And it would work for all types.

```python
reveal_type(stringify_iterable_items([1, 2]))
# Revealed type is 'builtins.list[builtins.str]'

reveal_type(stringify_iterable_items({1, 2}))
# Revealed type is 'builtins.set[builtins.str]'

reveal_type(stringify_iterable_items(MyCustomIterable(1, 2)))
# Revealed type is 'my_module.MyCustomIterable[builtins.str]'
```

Unfortunately, [it is not supported](https://github.com/python/typing/issues/548) at the moment.


### Emulation

Turns out we are not alone in this situation. There are multiple languages where Higher Kinded Types are not natively supported yet. But, they can be emulated:

- [TypeScript](https://github.com/gcanti/fp-ts/blob/master/docs/guides/HKT.md)
- [Swift](https://bow-swift.io/docs/fp-concepts/higher-kinded-types/)
- [Kotlin](https://arrow-kt.io/docs/0.10/patterns/glossary/#higher-kinds)

And now with [Python](https://returns.readthedocs.io/en/latest/pages/hkt.html) too!

There's also [an original whitepaper](https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf) for ones who are interested.

The core idea of HKT emulation is that we can write types the other way around: not like `T[int]`, but rather like `Kind[T, int]` (which is absolutely the same thing).

This way we can transform the inner structure of generics, but maintain the simple context without reinventing `TypeVar` with type arguments. And our function's type signature will look like: `Kind[T, int] -> Kind[T, str]`.

Let's see the implementation.


## Implementation

**TLDR**: here's [the final working code](https://gist.github.com/sobolevn/7f8ffd885aec70e55dd47928a1fb3e61) with all the logic, all the hacks, and everything. In this article, we going to write and explain it step by step.

We would need a better example to test our implementation. Let's build two types: a `Box` and a `Bag`. `Box` is defined by its size, while a `Bag` is an item of fashion: it has a brand name and a model name (I have a wife, I know this stuff!).

```python
from dataclasses import dataclass
from typing import Callable, Generic, TypeVar

_ValueType = TypeVar('_ValueType')
_NewValueType = TypeVar('_NewValueType')

@dataclass
class Box(Generic[_ValueType]):
    value: _ValueType
    length: int
    width: int
    height: int

@dataclass
class Bag(Generic[_ValueType]):
    value: _ValueType
    brand: str
    model: str
```

And we can create `Box`es and `Bag`s of different types, because we can put different things inside them:

```python
box = Box(value=10, length=1, width=2, height=3)  # Box[int]
bag = Bag(value=5, brand='Fancy', model='Baggy')  # Bag[int]
```

Now, we need a function with a type transformation. Let's say we want to apply a function to the value inside boxes and bags. Let's use fake `BoxOrBag` type for now to illustrate our intent:

```python
from typing import Callable

_NewValueType = TypeVar('_NewValueType')

def apply_function(
    instance: BoxOrBag[_ValueType],  # fake type for now
    callback: Callable[[_ValueType], _NewValueType],
) -> BoxOrBag[_NewValueType]:  # fake type for now
    ...
```

It is going to work like so:

```python
assert apply_function(box, str) == Box(value='10', length=1, width=2, height=3)
assert apply_function(bag, bool) == Bag(value=True, brand='Fancy', model='Baggy')
```

We only need to change current fake `BoxOrBag` type to a real HKT. We would need to define a new `Kind` type to make the emulation:

```python
_InstanceType = TypeVar('_InstanceType', covariant=True)
_FirstTypeArgType = TypeVar('_FirstTypeArgType', covariant=True)

class Kind(Generic[_InstanceType, _FirstTypeArgType]):
    """Used for HKT emulation."""
```

One pro-tip about `Kind`: it will not exist during runtime. Only during type-checking.

Now, let's change `apply_function` to use `Kind`:

```python
_InstanceKind = TypeVar('_InstanceKind')

def apply_function(
    instance: Kind[_InstanceKind, _ValueType],
    callback: Callable[[_ValueType], _NewValueType],
) -> Kind[_InstanceKind, _NewValueType]:
    ...
```

And last, but not least: we need an implementation for `apply_function`!

```python
def apply_function(
    instance: Kind[_InstanceKind, _ValueType],
    callback: Callable[[_ValueType], _NewValueType],
) -> Kind[_InstanceKind, _NewValueType]:
    new_value = callback(instance.value)  # creating new value
    return instance.with_value(new_value)  # creating a new instance from it
```

If we try to run this code, we would see something like:

```
error: "_InstanceKind" has no attribute "value"
error: "_InstanceKind" has no attribute "with_value"
```

This happens because `_InstanceKind` does not know anything about an interface we are working with right now. We need to bind it to something. And we also need an interface to work with:

```python
import abc

_InstanceKind = TypeVar('_InstanceKind', bound='HasValue')

class HasValue(Generic[_ValueType]):
    @abc.abstractmethod
    @property
    def value(self) -> _ValueType:
        """Returns a value property."""

    @abc.abstractmethod
    def with_value(
        self: _InstanceKind,
        new_value: _NewValueType,
    ) -> Kind1[_InstanceKind, _NewValueType]:
        """Creates a new instance with a changed value."""
```

Take an extra look at the abstract `with_value` definition: it is also Higher Kinded Typed. Because the interface knows that we are dealing with the internal structure change of a generic type. We would also need to subclass `HasValue` and implement the `with_value` method for both `Bag` and `Box` types. The good thing about subclassing `HasValue` is that HKTs as well as regular types will protect us from defining incompatible methods and properties.

Let's review what we have done so far:

```python
import abc
import dataclasses
from typing import Callable, Generic, TypeVar

_InstanceType = TypeVar('_InstanceType', covariant=True)
_FirstTypeArgType = TypeVar('_FirstTypeArgType', covariant=True)

class Kind(Generic[_InstanceType, _FirstTypeArgType]):
    """Used for HKT emulation."""

_ValueType = TypeVar('_ValueType')
_NewValueType = TypeVar('_NewValueType')
_InstanceKind = TypeVar('_InstanceKind', bound='HasValue')

class HasValue(Generic[_ValueType]):
    @abc.abstractmethod
    @property
    def value(self) -> _ValueType:
        """Returns a value property."""

    @abc.abstractmethod
    def with_value(
        self: _InstanceKind,
        new_value: _NewValueType,
    ) -> Kind[_InstanceKind, _NewValueType]:
        """Creates a new instance with a changed value."""

@dataclasses.dataclass
class Box(Generic[_ValueType], HasValue[_ValueType]):
    value: _ValueType
    length: int
    width: int
    height: int

    def with_value(self, new_value: _NewValueType) -> 'Box[_NewValueType]':
        return Box(new_value, self.length, self.width, self.height)

@dataclasses.dataclass
class Bag(Generic[_ValueType], HasValue[_ValueType]):
    value: _ValueType
    brand: str
    model: str

    def with_value(self, new_value: _NewValueType) -> 'Bag[_NewValueType]':
        return Bag(new_value, self.brand, self.model)

def apply_function(
    instance: Kind[_InstanceKind, _ValueType],
    callback: Callable[[_ValueType], _NewValueType],
) -> Kind[_InstanceKind, _NewValueType]:
    new_value = callback(instance.value)
    return instance.with_value(new_value)
```

That's pretty much it! I can proudly call this "unhacked" version. In an ideal world, our HKT emulation would *just work*. But, in our real-life world - we still need some hacks to make this possible.


## Hacks

First of all, let's try to type-check our code to see what will happen:

```bash
» mypy ex.py
ex.py:57: error: "Kind[_InstanceKind, _ValueType]" has no attribute "value"
ex.py:58: error: Returning Any from function declared to return "Kind[_InstanceKind, _NewValueType]"
ex.py:58: error: "Kind[_InstanceKind, _ValueType]" has no attribute "with_value"
Found 3 errors in 1 file (checked 1 source file)
```

Let's think about it for a moment. Why `"Kind[_InstanceKind, _ValueType]"` does not have attribute `"value"`?


### getattr hook

This happens because we wrote exactly that in `apply_function`:

```python
instance: Kind[_InstanceKind, _ValueType]  # Kind has 0 methods and props

instance.value  # this errors, because, again, Kind has 0 methods and values
instance.with_value  # the same
```

We need to build something that understands our intention: when we use dot access on `Kind` - in reality, we want to dot access its `_InstanceKind` type.

Since it can take quite a lot of time, I am going to skip re-implementing this part and give links to the original source code here:
1. Add [`__getattr__` method](https://github.com/dry-python/returns/blob/0.15.0/returns/primitives/hkt.py#L92-L99) to `Kind`
2. Write [a custom `mypy` plugin](https://github.com/dry-python/returns/blob/0.15.0/returns/contrib/mypy/_features/kind.py#L22-L67) to catch and modify attribute access on `Kind`

In the result we would have a working type inference:

```python
def apply_function(
    instance: Kind[_InstanceKind, _ValueType],
    callback: Callable[[_ValueType], _NewValueType],
) -> Kind[_InstanceKind, _NewValueType]:
    reveal_type(instance.value)
    # Revealed type is '_ValueType`-2'
    reveal_type(instance.with_value)
    # Revealed type is 'def [_NewValueType] (new_value: _NewValueType`6) -> Kind[_InstanceKind`-1, _NewValueType`6]'
    new_value = callback(instance.value)
    return instance.with_value(new_value)
```


### SupportsKind

There are two more things to solve.

First, since `Kind` is a type and `mypy` uses nominal inheritance to check subtyping (I have tried to make `Kind` a `Protocol` several times, but it does not work this way for now) it won't be happy that we declare `Kind` as a return type, but return `Bag` or `Box` instead. Since these two types are unrelated in `mypy`'s opinion - we would need to fix that with a direct inheritance from `Kind`.

```python
@dataclasses.dataclass
class Bag(Kind['Bag', _ValueType], HasValue[_ValueType]):
    ...

@dataclasses.dataclass
class Box(Kind['Box', _ValueType], HasValue[_ValueType]):
    ...
```

Now `Box` and `Bag` are both nominal subtypes of `Kind` and `mypy` will be happy with that.

Also, notice this notation `Kind['Box', _ValueType]`: what it means is that we inherit from `Kind` and pass not-yet-defined `Box` type inside as type argument. Sometimes it is also called the `URI` parameter.

Second, since `Kind` defines `__getattr__` we would end up with catching all dot access behaviour during type-checking. For example, `box.missing_attr` won't raise a type error anymore. But, would still fail during execution. We need to fix that! We can create a intermediate layer called `SupportsKind` with removed `__getattr__` method:

```python
class SupportsKind(KindN[_InstanceType, _FirstTypeArgType]):
    __getattr__: None  # type: ignore
```

Yes, this is a bit ugly, but we have to only define it once and then just use it:

```python
@dataclasses.dataclass
class Bag(SupportsKind['Bag', _ValueType], HasValue[_ValueType]):
    ...

@dataclasses.dataclass
class Box(SupportsKind['Box', _ValueType], HasValue[_ValueType]):
    ...
```

Now, we have `box.missing_attr` fixed!


### kinded

And the last hack we need is to translate `Kind[_InstanceKind, _NewValueType]` to `_InstanceKind[_NewValueType]` in the function's return type. Let's see how it works right now without this transformation:

```python
box = Box(value=10, length=1, width=2, height=3)
bag = Bag(value=5, brand='Fancy', model='Baggy')

reveal_type(apply_function(box, str))
# Revealed type is 'ex.Kind[ex.Box[Any], builtins.str*]'
reveal_type(apply_function(bag, str))
# Revealed type is 'ex.Kind[ex.Bag[Any], builtins.str*]'
```

Almost what we need!

We can use [a `@kinded` decorator](https://github.com/dry-python/returns/blob/0.15.0/returns/primitives/hkt.py#L208) for that together with [one more custom `mypy` plugin](https://github.com/dry-python/returns/blob/0.15.0/returns/contrib/mypy/_features/kind.py#L116-L130). The idea of this hack is that we catch all calls of functions decorated with `@kinded` and transform their return type from `Kind[I, T]` into `I[T]`.

The final iteration of `apply_function` will look like this:

```python
@kinded
def apply_function(
    instance: Kind[_InstanceKind, _ValueType],
    callback: Callable[[_ValueType], _NewValueType],
) -> Kind[_InstanceKind, _NewValueType]:
    new_value = callback(instance.value)
    return instance.with_value(new_value)
```

And would work as we want:

```python
reveal_type(apply_function(box, str))
# Revealed type is 'ex.Box[builtins.str*]'
reveal_type(apply_function(bag, str))
# Revealed type is 'ex.Bag[builtins.str*]'
```

Let's discuss the future of this hacks. Because, we don't want them to stay!


## Limitations

The main limitation, for now, is that `Kind` uses nominal inheritance and is a custom type. So, for now, it is impossible to work with 1st or 3rd party generics like `List`, `Set`, etc. We can only work with types who directly inherit from `Kind` for now.

The second limitation comes from the fact we can have generics with a different number of type arguments, as I have shown you before:
- `List` has a kind of `* -> *`
- `Dict` has a kind of `* -> * -> *`

So, we would need several [`Kind` alises](https://github.com/dry-python/returns/blob/master/returns/primitives/hkt.py#L26) to work with different amount of type arguments. It would also have a reasonable limit of three type arguments:

```python
class KindN(
    Generic[_InstanceType, _TypeArgType1, _TypeArgType2, _TypeArgType3],
):
    ...

#: Type alias for kinds with one type argument.
Kind1 = KindN[_InstanceType, _TypeArgType1, Any, Any]

#: Type alias for kinds with two type arguments.
Kind2 = KindN[_InstanceType, _TypeArgType1, _TypeArgType2, Any]

#: Type alias for kinds with three type arguments.
Kind3 = KindN[_InstanceType, _TypeArgType1, _TypeArgType2, _TypeArgType3]
```

A lot of readers might be shocked by the number of hacks we have to apply to make this work. I guess it is time for me to explain what hacks are temporary and which are going to stay with us.

The good news, **all** hacks can be solved in the future.

Most of the hacks come from the fact that `mypy` does not know what `Kind` is. Possibly, in the future, it can be built into `mypy`. And `@kinded`, `__getattr__`, and `SupportsKind` hacks would go away. Together with the fact that `Kind` needs to be a direct supertype of types we want to represent as HKTs.

Variadic generics are also in-the-work right now. You can have a look at the [PEP draft](https://mail.python.org/archives/list/typing-sig@python.org/thread/SQVTQYWIOI4TIO7NNBTFFWFMSMS2TA4J/). So, in the future `KindN`, `Kind1`, and `Kind2` would hopefully go away.


## Real life use-case

I am going to finish this article with an example [I have promised you in my previous article](https://sobolevn.me/2020/06/how-async-should-have-been) (it took almost half a year of hard work to fulfill!).

Last time we talked about making a fully typed function that can work with sync and async HTTP clients with the same API.

And here it is:

```python
from typing import Callable, TypeVar

import anyio
import httpx

from returns.future import future_safe
from returns.interfaces.specific.ioresult import IOResultLike2
from returns.io import impure_safe
from returns.primitives.hkt import Kind2, kinded

_IOKind = TypeVar('_IOKind', bound=IOResultLike2)

@kinded
def fetch_resource_size(
    client_get: Callable[[str], Kind2[_IOKind, httpx.Response, Exception]],
    url: str,
) -> Kind2[_IOKind, int, Exception]:
    return client_get(url).map(
        lambda response: len(response.content),
    )
```

When used with sync [`IO`](https://returns.readthedocs.io/en/latest/pages/io.html) type, it would work as a regular function.
But, it can also work with async [`Future`](https://returns.readthedocs.io/en/latest/pages/future.html) type.

```python
# Sync:
print(fetch_resource_size(
    impure_safe(httpx.get),
    'https://sobolevn.me',
))
# => <IOResult: <Success: 27972>>

# Async:
page_size = fetch_resource_size(
    future_safe(httpx.AsyncClient().get),
    'https://sobolevn.me',
)
print(page_size)
print(anyio.run(page_size.awaitable))
# => <FutureResult: <coroutine object async_map at 0x10b17c320>>
# => <IOResult: <Success: 27972>>
```

The possibilities with Higher Kinded Types are endless! It shines with:
- Functional programming, like we do in `dry-python`
- Computational libraries, when people type things like `Tensor` or `Matrix` or `Array`


## Conclusion

Wow, it was a cool ride! I hope you have enjoyed it as much as I did! Working on Higher Kinded Types was super fun and I am excited for you to try it.

- Docs: <https://returns.readthedocs.io/en/latest/index.html>
- Repository: <https://github.com/dry-python/returns> Don't forget to star it!

P.S. Does your company want corporate training on using types in Python with `mypy`? We, in [DryLabs](https://drylabs.io/) can help! Drop us a line.


### Special thanks

To [Pablo Aguilar](https://github.com/thepabloaguilar) for working on this release and reviewing this post!
