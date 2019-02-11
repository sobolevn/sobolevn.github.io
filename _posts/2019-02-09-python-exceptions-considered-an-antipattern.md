---
layout: post
title: Python exceptions considered an anti-pattern
description: "You might be wondering how do exceptions are an anti-pattern and how does this relate to typing at all? Well, let's find out!"
date: 2019-02-09
tags: python
republished:
  - resource: dev.to
    link: https://dev.to/wemake-services/python-exceptions-considered-an-anti-pattern-17o9
    language: us
---

![Article logo](https://thepracticaldev.s3.amazonaws.com/i/hikrr2fhv3os6b816n3w.png)

What are exceptions? Judging by their name it is an entity representing some exceptional situation that happens inside your program.

You might be wondering how do exceptions are an anti-pattern and how does this relate to typing at all? Well, let's find out!

## Problems with exceptions

First, we have to prove that exceptions have drawbacks. Well, it is usually hard to find "issues" in things you use every day because they start to look like "features" to you at some point.

Let's have a fresh look.

### Exceptions are hard to notice

There are two types of exceptions: "explicit" that are created with `raise` keyword right inside the code you are reading and "wrapped" that are wrapped inside some other functions/classes/methods that you are using.

The problem is: it is really hard to notice all this "wrapped" exceptions.
I will illustrate my point with this pure function:

```python
def divide(first: float, second: float) -> float:
     return first / second
```

All it does is dividing two numbers. Always returning `float`. It is type safe and can be used like so:

```python
result = divide(1, 0)
print('x / y = ', result)
```

Wait, did you get it? `print` will never be actually executed. Because `1 / 0` is an impossible operation and `ZeroDivisionError` will be raised. So, despite your code is type safe it is not safe to be used.

You still need to have a solid experience to spot these potential problems in a perfectly readable and typed code. Almost everything in `python` can fail with different types of exceptions: division, function calls, `int`, `str`, generators, iterables in `for` loops, attribute access, key access, even `raise something()` itself may fail. I am not even covering IO operations here. And [checked exceptions won't be supported](https://github.com/python/typing/issues/71) in the nearest future.

### Restoring normal behavior in-place is impossible

Hey, but we always have `except` cases just for this kind of situations. Let's just handle `ZeroDivisionError` and we will be safe!

```python
def divide(first: float, second: float) -> float:
     try:
         return first / second
     except ZeroDivisionError:
         return 0.0
```

Now we are safe! But why do we return `0`? Why not `1`? Why not `None`? And while `None` in most cases is as bad (or even worse) than the exceptions, turns out we should heavily rely on business logic and use-cases of this function.

What exactly do we divide? Arbitrary numbers? Some specific units? Money? Not all cases can be covered and easily restored. And sometimes when we will reuse this function for different use-cases we will find out that it requires different restore logic.

So, the sad conclusion is: **all problems must be resolved individually** depending on a specific usage context. There's no silver bullet to resolve all `ZeroDivisionError`s once and for all. And again, I am not even covering complex IO flows with retry policies and expotential timeouts.

Maybe we should not even handle exceptions in-place at all? Maybe we should throw it further in the execution flow and someone will later handle it somehow.

### Execution flow is unclear

Ok, now we will hope that someone else will catch this exception and possibly handle it. For example, the system might notify the user to change the input, because we can not divide by `0`. Which is clearly not a responsibility of the `divide` function.

Now we just need to check where this exception is actually caught. By the way, how can we tell where exactly it will be handled? Can we navigate to this point in the code? Turns out, we can not do that.

There's no way to tell which line of code will be executed after the exception is thrown. Different exception types might be handled by different `except` cases, some exceptions may be [`suppress`ed](https://docs.python.org/3/library/contextlib.html#contextlib.suppress). And you might also accidentally break your program in random spots by introducing new `except` cases in a different module. And remember that almost any line can raise.

We have two independent flows in our app: regular flow that goes from top to bottom and exceptional one that goes however it wants. How can we consciously read code like this?

Only with a debugger turned on. With "catch all exceptions" policy enabled.

![IDE debugger](https://thepracticaldev.s3.amazonaws.com/i/838vfxwo8cdbankvb8x5.png)

Exceptions are just like notorious `goto` statements that torn the fabric of our programs.

### Exceptions are not exceptional

Let's look at another example, a typical code to access remote HTTP API:

```python
import requests

def fetch_user_profile(user_id: int) -> 'UserProfile':
    """Fetches UserProfile dict from foreign API."""
    response = requests.get('/api/users/{0}'.format(user_id))
    response.raise_for_status()
    return response.json()
```

Literally, everything in this example can go wrong. Here's an incomplete list of all possible errors that might occur:

1. Your network might be down, so request won't happen at all
2. The server might be down
3. The server might be too busy and you will face a timeout
4. The server might require an authentication
5. API endpoint might not exist
6. The user might not exist
7. You might not have enough permissions to view it
8. The server might fail with an internal error while processing your request
9. The server might return an invalid or corrupted response
10. The server might return invalid `json`, so the parsing will fail

And the list goes on and on! There are so maybe potential problems with these three lines of code, that it is easier to say that it only **accidentally** works. And normally it fails with the exception.


## How to be safe?

Now we got that exceptions are harmful to your code. Let's learn how to get read off them. There are different patterns to write the exception-free code:

0. Write [`except Exception: pass`](https://wemake-python-styleguide.readthedocs.io/en/latest/pages/violations/best_practices.html#wemake_python_styleguide.violations.best_practices.WrongKeywordViolation) everywhere. That's as bad as you can imagine. Don't do it.
1. Return `None`. That's evil too! You either will end up with `if something is not None:` on almost every line and global pollution of your logic by type-checking conditionals, or will suffer from `TypeError` every day. Not a pleasant choice.
2. Write special-case classes. For example, you will have `User` base class with multiple error-subclasses like `UserNotFound(User)` and `MissingUser(User)`. It might be used for some specific situations, like [`AnonymousUser`](https://docs.djangoproject.com/en/2.1/ref/contrib/auth/#anonymoususer-object) in `django`, but it is not possible to wrap all your possible errors in special-case classes. It will require too much work from a developer. And over-complicate your domain model.
3. You can use container values, that wraps actual success or error value into a thin wrapper with utility methods to work with this value. That's exactly why we have created [`@dry-python/returns`](https://github.com/dry-python/returns) project. So you can make your functions return something meaningful, typed, and safe.

Let's start with the same number dividing example, which returns `0` when the error happens. Maybe instead we can indicate that the result was not successful without any explicit numerical value?

```python
from returns.result import Result, Success, Failure

def divide(first: float, second: float) -> Result[float, ZeroDivisionError]:
    try:
        return Success(first / second)
    except ZeroDivisionError as exc:
        return Failure(exc)
```

Now we wrap our values in one of two wrappers: `Success` or `Failure`. These two classes inherit from `Result` base class. And we can specify types of wrapped values in a function return annotation, for example `Result[float, ZeroDivisionError]` returns either `Success[float]` or `Failure[ZeroDivisionError]`.

What does it mean to us? It means, that **exceptions are not exceptional, they represent expectable problems**. But, we also wrap them in `Failure` to solve the second problem: **spotting potential exceptions is hard**.

```python
1 + divide(1, 0)
# => mypy error: Unsupported operand types for + ("int" and "Result[float, ZeroDivisionError]")
```

Now you can easily spot them! The rule is: if you see a `Result` it means that this function can throw an exception. And you even know its type in advance.

Moreover, `returns` library is fully typed and [PEP561 compatible](https://www.python.org/dev/peps/pep-0561/). It means that `mypy` will warn you if you try to return something that violates declared type contract.

```python
from returns.result import Result, Success, Failure

def divide(first: float, second: float) -> Result[float, ZeroDivisionError]:
    try:
        return Success('Done')
        # => error: incompatible type "str"; expected "float"
    except ZeroDivisionError as exc:
        return Failure(0)
        # => error: incompatible type "int"; expected "ZeroDivisionError"
```

### How to work with wrapped values?

There are two methods [two work with these wrapped values](https://returns.readthedocs.io/en/latest/pages/container.html#working-with-containers):

- `map` works with functions that return regular values
- `bind` works with functions that return other containers

```python
Success(4).bind(lambda number: Success(number / 2))
# => Success(2)

Success(4).map(lambda number: number + 1)
# => Success(5)
```

The thing is: you will be safe from failed scenarios. Since `.bind` and `.map` will  not execute for `Failure` containers:

```python
Failure(4).bind(lambda number: Success(number / 2))
# => Failure(4)

Failure(4).map(lambda number: number / 2)
# => Failure(2)
```

Now you can just concentrate on correct execution flow and be sure that failed state won't break your program in random places.

And you can always [take care of a failed state and even fix it](https://returns.readthedocs.io/en/latest/pages/container.html#returning-execution-to-the-right-track) and return to the right track if you want to.

```python
Failure(4).rescue(lambda number: Success(number + 1))
# => Success(5)

Failure(4).fix(lambda number: number / 2)
# => Success(2)
```

It means that "**all problems must be resolved individually**" practice is the only way to go and "**execution flow is now clear**". Enjoy your railway programming!

### But how to unwrap values from containers?

Yes, indeed, you really need raw values when dealing with functions that actually accept these raw values. You can use [`.unwrap()` or `.value_or()`](https://returns.readthedocs.io/en/latest/pages/container.html#unwrapping-values) methods:

```python
Success(1).unwrap()
# => 1

Success(0).value_or(None)
# => 0

Failure(0).value_or(None)
# => None

Failure(1).unwrap()
# => Raises UnwrapFailedError()
```

*Wait, what?* You have promised to save me from exceptions and now you are telling me that all my `.unwrap()` calls can result in one more exception!

### How not to care about these UnwrapFailedErrors?

Ok, let's see how to live with these new exceptions. Consider this example: we need to validate the user's input, then create two models in a database. And every step might fail with the exception, so we have wrapped all methods into the `Result` wrapper:

```python
from returns.result import Result, Success, Failure

class CreateAccountAndUser(object):
    """Creates new Account-User pair."""

    # TODO: we need to create a pipeline of these methods somehow...

    def _validate_user(
        self, username: str, email: str,
    ) -> Result['UserSchema', str]:
        """Returns an UserSchema for valid input, otherwise a Failure."""

    def _create_account(
        self, user_schema: 'UserSchema',
    ) -> Result['Account', str]:
        """Creates an Account for valid UserSchema's. Or returns a Failure."""

    def _create_user(
        self, account: 'Account',
    ) -> Result['User', str]:
        """Create an User instance. If user already exists returns Failure."""
```

First of all, you can not unwrap any values while writing your own business logic:

```python
class CreateAccountAndUser(object):
    """Creates new Account-User pair."""

    def __call__(self, username: str, email: str) -> Result['User', str]:
        """Can return a Success(user) or Failure(str_reason)."""
        return self._validate_user(
            username, email,
        ).bind(
            self._create_account,
        ).bind(
            self._create_user,
        )

   # ...
```

And this will work without any problems. It won't raise any exceptions, because `.unwrap()` is not used. But, is it easy to read code like this? **No**, it is not. What alternative can we provide? `@pipeline`!

```python
from result.functions import pipeline

class CreateAccountAndUser(object):
    """Creates new Account-User pair."""

    @pipeline
    def __call__(self, username: str, email: str) -> Result['User', str]:
        """Can return a Success(user) or Failure(str_reason)."""
        user_schema = self._validate_user(username, email).unwrap()
        account = self._create_account(user_schema).unwrap()
        return self._create_user(account)

   # ...
```

Now it is perfectly readable. That's how `.unwrap()` and `@pipeline` synergy works: whenever any `.unwrap()` method will fail on `Failure[str]` instance `@pipeline` decorator will catch it and return `Failure[str]` as a result value. That's how we can eliminate all the exceptions from our code and make it truly type-safe.

## Wrapping all together

Now, let's solve this `requests` example with all the new tools we have. Remember, that each line could raise an exception? And there's no way to make them return `Result` container. But you can use [`@safe` decorator](https://returns.readthedocs.io/en/latest/pages/functions.html#safe) to wrap unsafe functions and make them safe. These two examples are identical:

```python
from returns.functions import safe

@safe
def divide(first: float, second: float) -> float:
     return first / second


# is the same as:

def divide(first: float, second: float) -> Result[float, ZeroDivisionError]:
    try:
        return Success(first / second)
    except ZeroDivisionError as exc:
        return Failure(exc)
```

And we can see that the first one with `@safe` is way more readable and simple.

That's the last thing we needed to solve our `requests` problem. That's how our result code will look like in the end:

```python
import requests
from returns.functions import pipeline, safe
from returns.result import Result

class FetchUserProfile(object):
    """Single responsibility callable object that fetches user profile."""

    #: You can later use dependency injection to replace `requests`
    #: with any other http library (or even a custom service).
    _http = requests

    @pipeline
    def __call__(self, user_id: int) -> Result['UserProfile', Exception]:
        """Fetches UserProfile dict from foreign API."""
        response = self._make_request(user_id).unwrap()
        return self._parse_json(response)

    @safe
    def _make_request(self, user_id: int) -> requests.Response:
        response = self._http.get('/api/users/{0}'.format(user_id))
        response.raise_for_status()
        return response

    @safe
    def _parse_json(self, response: requests.Response) -> 'UserProfile':
        return response.json()
```

Things to recap:
1. We use `@safe` for all methods that can raise an exception, it will change the return type of the function to `Result[OldReturnType, Exception]`
2. We use `Result` as a container for wrapping values and errors in a simple abstraction
3. We use `.unwrap()` to unwrap raw value from the container
4. We use `@pipeline` to make sequences of `.unwrap` calls readable

This is a perfectly readable and safe way to do the exact same thing as we previously did with the unsafe function. It eliminates all the problems we had with exceptions:

1. "Exceptions are hard to notice". Now, they are wrapped with a typed `Result` container, which makes them crystal clear.
2.  "Restoring normal behavior in-place is impossible". We now can safely delegate the restoration process to the caller. We provide `.fix()` and `.rescue()` methods for this specific use-case.
3. "Execution flow is unclear". Now it is the same as a regular business flow. From top to bottom.
4. "Exceptions are not exceptional". And we know it! We expect things to go wrong and are ready for it.

## Use-cases and limitations

Obviously, you can not write all your code this way. It is just **too** safe for the most situations and incompatible with other libraries/frameworks. But, you should definitely write the most important parts of your business logic as I have shown above. It will increase the maintainability and correctness of your system.
