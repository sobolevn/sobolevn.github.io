---
title: Enforcing Single Responsibility Principle in Python
description:
date: 2019-03-10
tags: docker python
writing_time:
  writing: "6:00"
  proofreading: "3:00"
  decorating: "1:00"
---

![Article logo](https://images.unsplash.com/photo-1516981879613-9f5da904015f?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1334&q=80)

Single Responsibility Principle (or SRP) is one of the most important concepts in software development. The main idea of this concept is: all pieces of software must have only a single responsibility.

Why SRP is important? It is the main idea that stands behind software development. Decompose complex tasks to the set of simple building blocks to compose complex software from them back again. Just like we can compose builtin functions:

```python
print(int(input('Input number: ')))
```

This article will guide you through a complex process of writing simple code. I personally consider this article rather complicated and hard to percept if you do not have a solid background in Python, so it is split into several parts. It is okay to stop after each piece, revise it and to get to the latter one, because it will ensure you get the point, or at least first proofreadings showed so:
1. Definition of simple building block
2. Problems with the functional composition in `python`
3. Introduction to callable objects to solve functional composition problems
4. Dependency injection example that reduces the boilerplate code of callable objects
Please do not hesitate to suggest edits or to ask questions. This topic is not covered so well and I will be glad to clarify anything.

Let’s start with defining what are these "pieces of software" and "simplest building blocks" I am talking about?

The simplest building blocks are usually language's expressions and statements. We can literally compose everything from it. But, we cannot fully rely on them since they are too simple. And we do not want to have repeated code all over the place. So we invent functions to abstract these simplest language constructs into something more meaningful that we can actually work with.

We expect these simplest building blocks (read "functions") to be composable. And to be easily composable they must respect Single Responsibility Principle. Otherwise, we would have troubles. Because you can not compose things that do several things when you only need a part of them.


## Functions can be complex too

Now, let's make sure we can really rely on functions as simple building blocks.

We probably already know that functions can grow complex too and we have all seen functions like [this one](https://github.com/sobolevn/python-code-disasters/blob/7f8c856073e746cb79193df90ba2eb5f2eb144e7/python/create_objects.py#L1):

```python
def create_objects(name, data, send=False, code=None):
    data = [r for r in data if r[0] and r[1]]
    keys = ['{}:{}'.format(*r) for r in data]

    existing_objects = dict(Object.objects.filter(
        name=name, key__in=keys).values_list('key', 'uid'))

    with transaction.commit_on_success():
        for (pid, w, uid), key in izip(data, keys):
            if key not in existing_objects:
                try:
                    if pid.startswith('_'):
                        result = Result.objects.get(pid=pid)
                    else:
                        result = Result.objects.filter(
                            Q(barcode=pid) | Q(oid=pid)).latest('created')
                except Result.DoesNotExist:
                    logger.info("Can't find result [%s] for w [%s]", pid, w)
                    continue

                try:
                    t = Object.objects.get(name=name, w=w, result=result)
                except:
                    if result.container.is_co:
                        code = result.container.co.num
                    else:
                        code = name_code
                    t = Object.objects.create(
                        name=name, w=w, key=key,
                        result=result, uid=uid, name_code=code)

                    reannounce(t)

                    if result.expires_date or (
                          result.registry.is_sending
                          and result.status in [Result.C, Result.W]):
                        Client().Update(result)

                if not result.is_blocked and not result.in_container:
                    if send:
                        if result.status == Result.STATUS1:
                            Result.objects.filter(
                                id=result.id
                            ).update(
                                 status=Result.STATUS2,
                                 on_way_back_date=datetime.now())
                        else:
                            started(result)

            elif uid != existing_objects[key] and uid:
                t = Object.objects.get(name=name, key=key)
                t.uid = uid
                t.name_code = name_code
                t.save()
                reannounce(t)
```

We can say that this function definitely has more than one responsibility and should be refactored. But how do we make this decision?
There are different formal methods to track functions like this, including:

- [Cyclomatic complexity](https://en.wikipedia.org/wiki/Cyclomatic_complexity)
- [Halstead complexity](https://en.wikipedia.org/wiki/Halstead_complexity_measures)
- Arguments, statements, returns count
- Body length limits

After we apply these methods it would be clear to us that this function is too complex. And we won't be able to compose it easily. It is possible (and recommended) to go further and to automate this process. That's how code-quality tools work with [`wemake-python-styleguide`](https://github.com/wemake-services/wemake-python-styleguide) as a notable example.

Here's the less obvious example of a function that does several things and breaks SRP (and, sadly, things like that can not be automated, review your code):

```python
def calculate_price(products: List[Product]) -> Decimal:
    """Returns the final price of all selected products (in rubles)."""
    price = 0
    for product in products:
       price += product.price

    logger.log('Final price is: {0}', price)
    return price
```

Look at this `logger` variable. How did it make its way into the function's body? It is not an argument. It is just a hardcoded behavior. What if I do not want to log this specific price for some reason? Should I disable it with an argument flag?

In case I will try to do that, I will end up with something like this:

```python
def calculate_price(products: List[Product], log: bool = True) -> ...
    ...
```

Congratulations, we now have [a well-known anti-pattern](https://martinfowler.com/bliki/FlagArgument.html) in our code. Do not use boolean flags. They are bad.

Moreover, how do I test this function? Without this `logger.log` call it would be a perfectly testable pure function. Something goes in and I can predict what will go out. And now it is impure. To test that `logger.log` actually works I would have to mock it somehow and assert that log was created.

Such a mess just because of a single line! The problem with this function is that it is hard to notice this double responsibility. If we rename this function from `calculate_price` to proper `calculate_and_log_price` it would become obvious that this function does not respect SRP. And the rule is that simple: if "correct and full" function name contains `and`, `or`, or `then` – it is a good candidate for refactoring.

Ok, this is all scary and stuff, but what to do with this case in general? How can we change the behavior of this function so it will finally respect SRP?

I would say that the only way to achieve SRP is composition: compose different functions together so each of them would do just one thing, but their composition would do all the things we want.

Let's see different patterns that we can use to compose functions in `python`.

### Decorators

We can use the decorator pattern to compose functions together.

```python
@log('Final price is: {0}')
def calculate_price(...) -> ...:
    ...
```

What consequences this pattern has?

1. It not just composes, but glues functions together. This way you won't have an ability to actually run just `calculate_price` without `log`
2. It is static. You can not change things from the calling point. Or you have to pass arguments to the decorator function before actual function parameters
3. It creates visual noise. When the number of decorators will grow – it would pollute our functions with a huge amount of extra lines

All in all, decorators make perfect sense in specific situations while are not suited for others. Good examples are: [`@login_required`](https://docs.djangoproject.com/en/2.1/topics/auth/default/#the-login-required-decorator), [`@contextmanager`](https://docs.python.org/3/library/contextlib.html#contextlib.contextmanager), and friends.

### Functional composition

It is quite similar to the decorator pattern, the only exception is that it is applied in the runtime, not "import" time.

```python
from logger import log

def controller(products: List[Product]):
    final_price = log(calculate_price, message='Price is: {0}')(products)
    ...
```

1. With this approach, we can easily call functions the way we actually want to call them: with our without `log` part
2. On the other hand, it creates more boilerplate and visual noise
3. It is hard to refactor due to the higher amount of the boilerplate and since you delegate composition to the caller instead of the declaration

But, it also works for some cases. For example, I use [`@safe`](https://returns.readthedocs.io/en/latest/pages/functions.html#safe) function all the time:

```python
from returns. functions import safe

user_input = input('Input number: ')

# The next line won't raise any exceptions:
safe_number = safe(int)(user_input)
```

You can read more about [why exceptions might be harmful](https://sobolevn.me/2019/02/python-exceptions-considered-an-antipattern) to your business logic in a separate article. We also provide a utility type-safe [`compose`](https://returns.readthedocs.io/en/latest/pages/functions.html#compose) function in `returns` library that you might use for composing things at runtime.

### Passing arguments

We can always just pass arguments. As easy as that!

```python
def calculate_price(
    products: List[Product],
    callback=Callable[[Decimal], Decimal],
) -> Decimal:
    """Returns the final price of all selected products (in rubles)."""
    price = 0
    for product in products:
       price += product.price

    return callback(price)
```

And then we can invoke it:

```python
from functools import partial

from logger import log

price_log = partial(log, 'Price is: {0}')
calculate_price(products_list, callback=price_log)
```

And it works great. Now our function does not know a thing about logging. It only calculates the price and returns the callback of it. We can now supply any callback, not just `log`. It might be any function that receives one `Decimal` and returns one back:

```python
def make_discount(price: Decimal) -> Decimal:
    return price * 0.95

calculate_price(products_list, callback=make_discount)
```

See? No problem, just compose functions the way you like. The hidden disadvantage of this method is in the nature of function arguments. We must explicitly pass them. And if the call-stack is huge, we need to pass a lot of parameters to different functions. And potentially cover different cases: we need callback `A` in case of `a` and callback `B` in case of `b`.

Of course, we can try to patch them somehow, create more functions that return more functions or pollute our code with `@inject` decorators everywhere, but I think that is ugly.

Unsolved problems:
1. Mixed logic arguments and dependency arguments, because we pass them together at the same time and it hard to tell what is what
2. Explicit arguments that can be hard or impossible to maintain if your call-stack is huge

To fix these problems, let me introduce you to the concept of callable objects.


## Separating logic and dependencies

Before we start discussing callable objects, we need to discuss objects and OOP in general keeping SRP in mind. I see a major problem in OOP just inside its main idea: "Let's combine *data and behavior* together". For me, it is a clear violation of SRP, because objects by design do two things at once: they contain state *and* have some attached behavior. Of course, we will eliminate this flaw with callable objects.

Callable objects look like regular objects with two public methods: `__init__` and `__call__`. And they follow specific rules that make them unique:

1. Handle only dependencies in the constructor
2. Handle only logic arguments in the `__call__` method
3. No mutable state
4. No other public methods or any public attributes
5. No superclasses or subclasses

The straight-forward way to implement a callable object is something like this:

```python
class CalculatePrice(object):
    def __init__(self, callback: Callable[[Decimal], Decimal]) -> None:
        self._callback = callback

    def __call__(self, products: List[Product]) -> Decimal:
        price = 0
        for product in products:
            price += product.price
        return self._callback(price)
```

The main difference between callable objects and functions is that callable objects have an explicit step for passing dependencies, while functions mix regular logic arguments with dependencies together (you can already notice that callable objects are just a special case of a partial function application):

```python
# Regular functions mix regular arguments with dependencies:
calculate_price(products_list, callback=price_log)

# Callable objects first handle dependencies, then regular arguments:
CalculatePrice(price_log)(products_list)
```

But, given example do not follow all rules we impose on callable objects. In particular, they are mutable and can have subclasses. Let's fix that too:

```python
from typing_extensions import final

from attr import dataclass


@final
@dataclass(frozen=True, slots=True)
class CalculatePrice(object):
    _callback: Callable[[Decimal], Decimal]

    def __call__(self, products: List[Product]) -> Decimal:
        ...
```

Now with the addition of [`@final` decorator](https://sobolevn.me/2018/07/real-python-contants) that restricts this class to be subclassed and `@dataclass` decorator with [`frozen`](http://www.attrs.org/en/stable/examples.html#immutability) and [`slots`](http://www.attrs.org/en/stable/examples.html#slots) properties our class respects all the rules we impose in the beginning.

1. Handle only dependencies in the constructor
2. Handle only logic arguments in the `__call__` method
3. No mutable state
4. No other public methods or any public attributes
5. No superclasses or subclasses

1. Handle only dependencies in the constructor. True, we have only declarative dependencies, the constructor is created for us by `attrs`
2. Handle only logic arguments in the `__call__` method. True, by definition
3. No mutable state. True, since we use `frozen` and `slots`
4. No other public methods or any public attributes. Mostly true, we cannot have public attributes by declaring `slots` property and declarative protected instance attributes, but we still can have public methods. Consider using a linter for this
5. No superclasses or subclasses. True, we explicitly inherit from `object` and marking this class `final`, so any subclasses will be restricted

It now may look like an object, but it is surely not a real object. It can not have any state, public methods, or attributes. But, it is great for Single Responsibility Principle. First of all, it does not have data *and* behavior. Just pure behavior. Secondly, it is hard to mess things up this way. You will always have a single method to call in all the objects that you have. And this is what SRP is all about. Just make sure that this method is not too complex and does one thing. Remember, no one stops you from creating protected methods to decompose `__call__` behavior.

However, we have not fixed the second problem of passing dependencies as arguments to functions (or callable object): noisy explicitness.


## Dependency injection

[DI pattern](https://en.wikipedia.org/wiki/Dependency_injection) is widely known and used outside of the `python` world. But, for some reason is not very popular inside it. I think that this is a bug that should be fixed.

Let's see a new example. Imagine that we have postcards sending app. Users create postcards to send them to other users on specific dates: holidays, birthdays, etc. We are also interested in how many of them were sent for analytic purposes. Let's see how this use-case will look like:

```python
from project.postcards.repository import PostcardsForToday
from project.postcards.services import (
   SendPostcardsByEmail,
   CountPostcardsInAnalytics,
)

@final
@dataclass(frozen=True, slots=True)
class SendTodayPostcardsUsecase(object):
    _repository: PostcardsForToday
    _email: SendPostcardsByEmail
    _analytics: CountPostcardInAnalytics

    def __call__(self, today: datetime) -> None:
        postcards = self._repository(today)
        self._email(postcards)
        self._analytics(postcards)
```

Next, we have to invoke this callable class:

```python
# Injecting dependencies:
send_postcards = SendTodayPostcardsUsecase(
    PostcardsForToday(db=Postgres('postgres://...')),
    SendPostcardsByEmail(email=SendGrid('username', 'pass')),
    CountPostcardInAnalytics(source=GoogleAnalytics('google', 'admin')),
)

# Actually invoking postcards send:
send_postcards(datetime.now())
```

The problem is clearly seen in this example. We have a lot of dependencies-related boilerplate. Every time we create an instance of `SendTodayPostcardsUsecase` – we have to create all its dependencies. Going all the way deep.

And all this boilerplate seems redundant. We have already specified all types of expected dependencies in our class. And transitive dependencies in our class's dependencies, and so on. Why do we have to duplicate this code once again?

Actually, we don't have to. We can use some kind of DI framework. I can personally recommend [`dependencies`](https://github.com/dry-python/dependencies) or [`punq`](https://github.com/bobthemighty/punq). Their main difference is in how they resolve dependencies: `dependencies` uses names and `punq` uses types. We would go with `punq` for this example.

Do not forget to install it:

```bash
pip install punq
```

Now our code can be simplified so we won't have to mess with dependencies. We create a single place where all the dependencies are registered:

```python
# project/implemented.py

import punq

container = punq.Container()

# Low level dependencies:
container.register(Postgres)
container.register(SendGrid)
container.register(GoogleAnalytics)

# Intermediate dependencies:
container.register(PostcardsForToday)
container.register(SendPostcardsByEmail)
container.register(CountPostcardInAnalytics)

# End dependencies:
container.register(SendTodayPostcardsUsecase)
```

And then use it everywhere:

```python
from project.implemented import container

send_postcards = container.resolve(SendTodayPostcardsUsecase)
send_postcards(datetime.now())
```

There's literally no repeated boilerplate, readability, and type-safety out-of-the-box. We now do not have to manually wire any dependencies together. They will be wired by annotations by `punq`. Just type your declarative fields in callable objects the way you need, register dependencies in the container, and you are ready to go.

Of course, there are some advanced typing patterns for better Inversion of Control, but it is better covered in [`punq`'s docs](https://punq.readthedocs.io/en/latest/).


## When not to use callable objects

It is quite obvious that all programming concepts have their limitations.
Callable objects should not be used in the infrastructure layer of your application. Since there are too many existing APIs that do not support this kind of classes and API. Use it inside your business logic to make it more readable and maintainable.

Consider adding [`returns`](https://github.com/dry-python/returns) library to the mix, so you can [get rid of exceptions](https://sobolevn.me/2019/02/python-exceptions-considered-an-antipattern) as well.


## Conclusion

We came a long way. From absolutely messy functions that do scary things to simple callable objects with dependency injection that respect Single Responsibility Principle. We have discovered different tools, practices, and patterns along the way.

But did our efforts make a big change? The most important question to ask yourself: is my code better after all this refactoring? My answer is: yes. What do you think? Share your opinion in comments below.

Key takeaways:
1. Use simple building blocks that compose easily
2. To be composable all entities should be responsible for one thing only
3. Use code quality tools to make sure that these blocks are truly "simple"
4. To make high-level things responsible for just one thing – use the composition of simple blocks
5. To handle composition dependencies use callable objects
6. Use dependency injection to reduce the boilerplate of composition

That's it!


