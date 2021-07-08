---
layout: post
title: "Typeclasses in Python"
description: "Typeclasses is a new (but familiar) idea of how you can organize behavior around your types"
date: 2021-06-30
tags: python
writing_time:
  writing: "8:00"
  proofreading: "1:00"
  decorating: "0:05"
republished:
  - link: https://dev.to/wemake-services/typeclasses-in-python-3ma6
    language: us
translated: []
---

Today I am going to introduce a new concept for Python developers: typeclasses.
It is a concept behind our new `dry-python` library called [`classes`](https://github.com/dry-python/classes/).

I will tell you in advance, that it will look very familiar to what you already know and possibly even use. Moreover, we reuse a lot of existing code from Python's standard library. So, you can call this approach "native" and "pythonic". And it is still going to be interesting: I am showing examples in 4 different languages!

But, before discussing typeclasses themselves, let's discuss what problem they do solve.


## Some functions must behave differently

Ok, this one is a familiar problem to all of the devs out there.
How can we write a function that will behave differently for different types?

Let's create an example. We want to `greet` different types differently (yes, "hello world" examples, here we go).
We want to `greet`:
- `str` instances as `Hello, {string_content}!`
- `MyUser` instances as `Hello again, {username}`

Note, that `greet` as a simple example does not really make much "business" sense, but more complicated things like `to_json`, `from_json`, `to_sql`, `from_sql`, and `to_binary` do make a lot of sense and can be found in almost any project.
But, for the sake of implementation simplicity, I'm going to stick to our `greet` example.

The first approach that comes to our minds is to use `isinstance()` checks inside the function itself.
And it can work in some cases! The only requirement is that we **must** know all the types we will work with in advance.

Here's how it would look like:

```python
@dataclass
class MyUser(object):
    name: str

def greet(instance: str | MyUser) -> str:
    if isinstance(instance, str):
        return 'Hello, "{0}"!'.format(instance)
    elif isinstance(instance, MyUser):
        return 'Hello again, {0}'.format(instance.name)
    raise NotImplementedError(
        'Cannot greet "{0}" type'.format(type(instance)),
    )
```

The main limitation is that we cannot extend this function for other type easily (we can use wrapper function, but I consiser this a redefinition).

But, in some cases - `isinstance` won't be enough, because we need extendability. We need to support other types, which are unknown in advance.
Our users might need to `greet` their custom types.

And that's the part where things begin to get interesting.

All programming languages address this problem differently.
Let's start with Python's traditional OOP approach.


## OOP extendability and over-abstraction problems

So, how does Python solve this problem?

We all know that Python has magic methods for some builtin functions like `len()` and `__len__`, it solves exactly the same problem.

Let's say we want to greet a user:

```python
@dataclass
class MyUser(object):
    name: str

    def greet(self) -> str:
        return 'Hello again, {0}'.format(self.name)
```

You can use this method directly or you can create a helper with [`typing.Protocol`](https://www.python.org/dev/peps/pep-0544/):

```python
from typing_extensions import Protocol

class CanGreet(Protocol):
    def greet(self) -> str:
        """
        It will match any object that has the ``greet`` method.

        Mypy will also check that ``greet`` must return ``str``.
        """

def greet(instance: CanGreet) -> str:
    return instance.greet()
```

And then we can use it:

```python
print(greet(MyUser(name='example')))
# Hello again, example
```

So, it works? *Not really*.

There are several problems.

**First**, some classes do not want to know some details about themselves to maintain abstraction integrity.
For example:

```python
class Person(object):
    def become_friends(self, friend: 'Person') -> None:
         ...

    def is_friend_of(self, person: 'Person') -> bool:
        ...

    def get_pets(self) -> Sequence['Pet']:
        ...
```

Does this `Person` (pun intended) deserve to know that some `to_json` conversion exists that can turn this poor `Person` into textual data? What about binary pickling?
Of course not, these details should not be added to a business-level abstraction, this is called a [leaky abstraction](https://en.wikipedia.org/wiki/Leaky_abstraction) when you do otherwise.

Moreover, I think that mixing structure and behavior into a single abstraction is bad. Why? Because you cannot tell in advance what behavior you would need from a given structure.

For abstractions on this level, it is way easier to have behavior near the structure, not inside it. Mixing these two only makes sense when we work on a higher level like [services](https://en.wikipedia.org/wiki/Service-oriented_architecture) or [processes](https://en.wikipedia.org/wiki/Open_Telecom_Platform).

**Second**, it only works for custom types. [Existing types are hard to extend](https://en.wikipedia.org/wiki/Expression_problem).
For example, how would you add the `greet` method to the `str` type?

You can create `str` subtype with `greet` method in it:

```python
class MyStr(str):
    def greet(self) -> str:
        return 'Hello, {0}!'.format(self)
```

But, this would require a change in our usage:

```python
print(greet(MyStr('world')))
# Hello, world!

print(greet('world'))
# fails with TypeError
```

### Monkey-patching

Some might suggest that we can just insert the needed methods directly into an object / type.
Some dynamically typed languages went on this path: `JavaScript` (in 2000s and early 2010s, mostly popularized by `jQuery` plugins) and `Ruby` ([still happening right now](https://guides.rubyonrails.org/active_support_core_extensions.html)). Here's how it looks:

```js
String.prototype.greet = function (string) {
    return `Hello, ${string}!`
}
```

It is quite obvious, that it is not going to work for anything complex. [Why](https://en.wikipedia.org/wiki/Monkey_patch#Pitfalls)?
- Different parts of your program might use monkey-patching of methods with the same name, but with different functionality. And nothing will work
- It is hard to read because the original source does not contain the patched method and the patching location might be hidden deeply in other files
- It is hard to type, for example, `mypy` does not support it at all
- Python community is not used to this style, it would be rather hard to persuade them to write their code like this (and that's a good thing!)

I hope that it is clear: we won't fall into this trap. Let's consider another alternative.

### Extra abstractions

People familiar with things like `django-rest-framework` might recommend to add [special abstractions](https://www.django-rest-framework.org/api-guide/serializers/) to `greet` different types:

```python
import abc
from typing import Generic, TypeVar

_Wrapped = TypeVar('_Wrapped')

class BaseGreet(Generic[_Wrapped]):
    """Abstract class of all other """

    def __init__(self, wrapped: _Wrapped) -> None:
        self._wrapped = wrapped

    @abc.abstractmethod
    def greet(self) -> str:
        raise NotImplementedError

class StrGreet(BaseGreet[str]):
    """Wrapped instance of built-in type ``str``."""

    def greet(self) -> str:
        return 'Hello, {0}!'.format(self._wrapped)

# Our custom type:

@dataclass
class MyUser(object):
    name: str

class MyUserGreet(BaseGreet[MyUser]):
    def greet(self) -> str:
        return 'Hello again, {0}'.format(self._wrapped.name)
```

And we can use it like so:

```python
print(greet(MyStrGreet('world')))
# Hello, world!

print(greet(MyUserGreet(MyUser(name='example'))))
# Hello again, example
```

But, now we have a different problem: we have a gap between real types and their wrappers. There's no easy way to wrap a type into its wrapper. How can we match them? We have to do it either by hand or use some kind of registry like `Dict[type, Type[BaseGreet]]`.

And it is still not enough, there will be runtime errors! In practice, it ends up like `<X> is not json-serializable` as many of us might have seen it with `drf`'s serializers when trying to serialize a custom unregistered type.


## Typeclasses and similar concepts

Let's look at how functional languages (and `Rust`, people still [argue](https://www.fpcomplete.com/blog/2018/10/is-rust-functional/) whether it is functional or not) handle this problem.

Some common knowledge:
- All these languages don't have `class` concept as we know it in Python and, of course, there's no subclassing
- All the languages below don't have `object`s as we do in Python, they don't mix behavior and structure (however, `Elixir` has Alan Kay's [real objects](https://www.quora.com/What-does-Alan-Kay-think-about-Joe-Armstrong-claiming-that-Erlang-might-be-the-only-object-oriented-language-and-also-his-thesis-supervisor-s-claim-that-Erlang-is-extremely-object-oriented))
- Instead, these languages use [ad-hoc polymorphism](https://en.wikipedia.org/wiki/Ad_hoc_polymorphism) to make functions behave differently for different types via overloading
- And, of course, you don't have to know any of the languages below to understand what is going on

### Elixir

Let's start with one of my favorites.
`Elixir` has [`Protocol`s](https://elixir-lang.org/getting-started/protocols.html) to achieve what we want:

```elixir
@doc "Our custom protocol"
defprotocol Greet do
  # This is an abstract function,
  # that will behave differently for each type.
  def greet(data)
end

@doc "Enhancing built-in type"
defimpl Greet, for: BitString do
  def greet(string), do: "Hello, #{string}!"
end

@doc "Custom data type"
defmodule MyUser do
  defstruct [:name]
end

@doc "Enhancing our own type"
defimpl Greet, for: MyUser do
  def greet(user), do: "Hello again, #{user.name}"
end
```

I am pretty sure that my readers were able to read and understand `Elixir` even if they are not familiar with this language. That's what I call beauty!

Usage of the code above:

```elixir
# Using our `Greet.greet` function with both our data types:
IO.puts(Greet.greet("world"))
# Hello, world!
IO.puts(Greet.greet(%MyUser{name: "example"}))
# Hello again, example
```

The thing with `Elixir`'s `Protocol`s is that it is [not currently possible](https://github.com/elixir-lang/elixir/issues/7541) to express that some type does support our `Greet.greet` for `Elixir`'s [type checker](https://github.com/jeremyjh/dialyxir).
But, this is not a big deal for `Elixir`, which is 100% dynamically typed.

Protocols are very widely used, they power lots of the language's features.
Here are some real-life examples:
- [`Enumerable`](https://hexdocs.pm/elixir/1.11.0/Enumerable.html) allows to work with collections: counting elements, finding members, reducing, and slicing
- [`String.Chars`](https://hexdocs.pm/elixir/1.11.0/String.Chars.html) is something like `__str__` in Python, it converts structures to human-readable format

### Rust

`Rust` has [`Trait`s](https://doc.rust-lang.org/book/ch10-02-traits.html). The concept is pretty similar to `Protocol`s in `Elixir`:

```rust
// Our custom trait
trait Greet {
    fn greet(&self) -> String;
}

// Enhancing built-in type
impl Greet for String {
    fn greet(&self) -> String {
        return format!("Hello, {}!", &self);
    }
}

// Defining our own type
struct MyUser {
    name: String,
}

// Enhancing it
impl Greet for MyUser {
    fn greet(&self) -> String {
        return format!("Hello again, {}", self.name);
    }
}
```

And of course, due to `Rust`'s static typing, we can express that some function's argument supports the trait we have just defined:

```rust
// We can express that `greet` function only accepts types
// that implement `Greet` trait:
fn greet(instance: &dyn Greet) -> String {
    return instance.greet();
}

pub fn main() {
    // Using our `greet` function with both our data types:
    println!("{}", greet(&"world".to_string()));
    // Hello, world!
    println!("{}", greet(&MyUser { name: "example".to_string() }));
    // Hello again, example
}
```

See? The idea is so similar, that it uses almost the same syntax as `Elixir`.

Notable real-life examples of how `Rust` uses its `Trait`s:
- [`Copy`](https://doc.rust-lang.org/std/marker/trait.Copy.html) and [`Clone`](https://doc.rust-lang.org/std/clone/trait.Clone.html) - duplicating objects
- [`Debug`](https://doc.rust-lang.org/std/fmt/trait.Debug.html) to show better `repr` of an object, again like `__str__` in Python

Basically, `Trait`s are the core of this language, it is widely used in cases when you need to define any shared behavior.

### Haskell

`Haskell` has [typeclasses](http://learnyouahaskell.com/making-our-own-types-and-typeclasses) to do almost the same thing.

So, what's a typeclass?
Typeclass is a group of types, all of which satisfy some common contract.
It is also a form of ad-hoc polymorphism that is mostly used for overloading.

I am a bit sorry for the `Haskell` syntax below, it might be not very pleasant and clear to read, especially for people who are not familiar with this brilliant language, but we have what we have:

```haskell
{-# LANGUAGE FlexibleInstances #-}

-- Our custom typeclass
class Greet instance where
  greet :: instance -> String

-- Enhancing built-in type with it
instance Greet String where
  greet str = "Hello, " ++ str ++ "!"

-- Defining our own type
data MyUser = MyUser { name :: String }

-- Enhancing it
instance Greet MyUser where
  greet user = "Hello again, " ++ (name user)
```

Basically, we do the same thing as we have already done for `Rust` and `Elixir`:
1. We define a `Greet` typeclass that has a single function to implement: `greet`
2. Then we define instance implementation for `String` type, which is a built-in (alias for `[Char]`)
3. Then we define custom `MyUser` type with `name` field of `String` type
4. Implementing the `Greet` typeclass for `MyUser` is the last thing we do

Then we can use our new `greet` function:

```haskell
-- Here you can see that we can use `Greet` typeclass to annotate our types.
-- I have made this alias entirely for this annotation demo,
-- in real life we would just use `greet` directly:
greetAlias :: Greet instance => instance -> String
greetAlias = greet

main = do
  print $ greetAlias "world"
  -- Hello, world!
  print $ greetAlias MyUser { name="example" }
  -- Hello again, example
```

Some real-life examples of typeclasses:
- [`Show`](https://hackage.haskell.org/package/base-4.15.0.0/docs/Text-Show.html#t:Show) to convert things into user-readable representations
- [`Functor`](https://wiki.haskell.org/Functor), [`Applicate`](https://hackage.haskell.org/package/base-4.10.1.0/docs/Control-Applicative.html#t:Applicative), and [`Monad`](https://wiki.haskell.org/Monad) are all typeclasses

I would say that among our three examples, `Haskell` relies on its typeclasses the heaviest.

It is important to note that typeclasses from `Haskell` and traits from `Rust` [are a bit different](https://stackoverflow.com/questions/28123453/what-is-the-difference-between-traits-in-rust-and-typeclasses-in-haskell), but we won't go into these details to keep this article rather short.

But, what about Python?


## dry-python/classes

There's an awesome function in the Python standard library called [`singledispatch`](https://docs.python.org/3/library/functools.html#functools.singledispatch).

It does exactly what we need. Do you still remember that we are finding a way to change the function's behavior based on the input type?

Let's have a look!

```python
from functools import singledispatch

@singledispatch
def greet(instance) -> str:
    """Default case."""
    raise NotImplementedError

@greet.register
def _greet_str(instance: str) -> str:
    return 'Hello, {0}!'.format(instance)

# Custom type

@dataclass
class MyUser(object):
    name: str

@greet.register
def _greet_myuser(instance: MyUser) -> str:
    return 'Hello again, {0}'.format(instance.name)
```

Looks cool, moreover, it is in standard lib, you even don't have to install anything!

And we can use it like a normal function:

```python
print(greet('world'))
# Hello, world!
print(greet(MyUser(name='example')))
# Hello again, example
```

So, what's the point in writing a completely different library like we did with `dry-python/classes`?

We even reuse some parts of `singledispatch` implementation,
but there are several key differences.

### Better typing

With `singledispatch` you cannot be sure that everything will work, because it is not supported by `mypy`.

For example, you can pass unsupported types:

```python
greet(1)  # mypy is ok with that :(
# runtime will raise `NotImplementedError`
```

In `dry-python/classes` we have fixed that.
You can only pass types that are supported:

```python
from classes import typeclass

@typeclass
def greet(instance) -> str:
    ...

@greet.instance(str)
def _greet_str(instance: str) -> str:
    return 'Iterable!'

greet(1)
# Argument 1 to "greet" has incompatible type "int"; expected "str"
```

Or you can break the `@singledispatch` signature contract:

```python
@greet.register
def _greet_dict(instance: dict, key: str) -> int:
    return instance[key]  # still no mypy error
```

But, not with `dry-python/classes`:

```python
@greet.instance(dict)
def _greet_dict(instance: dict, key: str) -> int:
    ...
# Instance callback is incompatible
# "def (instance: builtins.dict[Any, Any], key: builtins.str) -> builtins.int";
# expected
# "def (instance: builtins.dict[Any, Any]) -> builtins.str"
```

`@singledispatch` also does not allow defining generic functions:

```python
@singledispatch
def copy(instance: X) -> X:
    """Default case."""
    raise NotImplementedError

@copy.register
def _copy_int(instance: int) -> int:
    return instance
# Argument 1 to "register" of "_SingleDispatchCallable"
# has incompatible type "Callable[[int], int]";
# expected "Callable[..., X]"

reveal_type(copy(1))
# Revealed type is "X`-1"
# Should be: `int`
```

Which is, again, possible with `dry-python/classes`, we fully support [generic functions](https://classes.readthedocs.io/en/latest/pages/generics.html):

```python
from typing import TypeVar
from classes import typeclass

X = TypeVar('X')

@typeclass
def copy(instance: X) -> X:
    ...

@copy.instance(int)
def _copy_int(instance: int) -> int:
    ...  # ok

reveal_type(copy(1))  # int
```

And you cannot [restrict](https://classes.readthedocs.io/en/latest/pages/concept.html#type-restrictions) `@singledispatch` to work with only subtypes of specific types, even if you want to.

### Protocols are unsupported

Protocols are an important part of Python. Sadly, they are not supported by `@singledispatch`:

```python
@greet.register
def _greet_iterable(instance: Iterable) -> str:
    return 'Iterable!'
# TypeError: Invalid annotation for 'instance'.
# typing.Iterable is not a class
```

[Protocols](https://classes.readthedocs.io/en/latest/pages/concept.html#protocols) support is also solved with `dry-python/classes`:

```python
from typing import Iterable
from classes import typeclass

@typeclass
def greet(instance) -> str:
    ...

@greet.instance(Iterable, is_protocol=True)
def _greet_str(instance: Iterable) -> str:
    return 'Iterable!'

print(greet([1, 2, 3]))
# Iterable!
```

### No way to annotate types

Let's say you want to write a function and annotate one of its arguments that it must support the `greet` function. Something like:

```python
def greet_and_print(instance: '???') -> None:
    print(greet(instance))
```

It is impossible with `@singledispatch`.
But, you can do it with `dry-python/classes`:

```python
from classes import AssociatedType, Supports, typeclass

class Greet(AssociatedType):
    """Special type to represent that some instance can `greet`."""

@typeclass(Greet)
def greet(instance) -> str:
    """No implementation needed."""

@greet.instance(str)
def _greet_str(instance: str) -> str:
    return 'Hello, {0}!'.format(instance)

def greet_and_print(instance: Supports[Greet]) -> None:
    print(greet(instance))

greet_and_print('world')  # ok
greet_and_print(1)  # type error with mypy, exception in runtime
# Argument 1 to "greet_and_print" has incompatible type "int";
# expected "Supports[Greet]"
```


## Conclusion

We have come a long way, from basic stacked `isinstance()` conditions - through OOP - to typeclasses.

I have shown, that this native and pythonic idea deserves wider recognition and usage. And our extra features in `dry-python/classes` can save you from lots of mistakes and help to write more expressive and safe business logic.

As a result of using typeclasses, you will untangle your structures from behavior, which will allow you to get rid of useless and complex abstractions and write dead-simple typesafe code. You will have your behavior near the structures, not inside them. This will also solve the extendability problem of OOP.

Combine it with other `dry-python` libraries for extra effect!


## Future work

What do we plan for the future?

There are several key aspects to improve:
1. Our `Supports` should take any amount of type arguments: `Supports[A, B, C]`. This type will represent a type that supports all three typeclasses `A`, `B`, and `C` [at the same time](https://github.com/dry-python/classes/issues/206)
2. We don't [support concrete generics](https://github.com/dry-python/classes/issues/24) just yet. So, for example, it is impossible to define different cases for `List[int]` and `List[str]`. This might require adding runtime typecheker to `dry-python/classes`
3. I am planning [to make tests a part of this app](https://sobolevn.me/2021/02/make-tests-a-part-of-your-app) as well! We will ship a [hypothesis plugin](https://github.com/dry-python/classes/issues/234) to test users' typeclasses in a single line of code

Stay tuned!

If you like this article you can:
1. Donate to future `dry-python` development on [GitHub](https://github.com/sponsors/dry-python)
2. [Star our `classes` repo](https://github.com/dry-python/classes/stargazers)
3. [Subscribe](https://sobolevn.me/subscribe/) to my blog for more content!
