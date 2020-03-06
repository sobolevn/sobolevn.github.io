---
layout: post
title: Complexity Waterfall
description: "The thing about complexity is that it comes out of nowhere. One day you start your fairly simple project, the other day you find it in ruins."
date: 2019-10-13
tags: python
writing_time:
  writing: "3:00"
  proofreading: "2:00"
  decorating: "0:20"
republished:
  - resource: habr.com
    link: https://habr.com/ru/post/472876/
    language: us
---

![Logo](https://imgur.com/r6SwSFy.png)

When talking about "bad code" people almost certainly mean "complex code" among other popular problems. The thing about complexity is that it comes out of nowhere. You start your fairly simple project, then one day you find it in ruins. And no one knows how and when it happened.

But, this ultimately happens for a reason! Code complexity enters your codebase in two possible ways: with big chunks and incremental additions. And people are bad at reviewing and finding both of them.

When a big chunk of code comes in, the reviewer will be challenged to find the exact location where the code is complex and what to do about it. Then, the reviewer will have to prove the point: why this code is complex in the first place. And other developers might disagree. We all know these kinds of code reviews!

![Number of lines for review and comments ratio](https://imgur.com/c4HYCAi.png)

The second way of complexity getting into your code is incremental addition: when you submit one or two lines to the existing function. And it is extremely hard to notice that your function was alright one commit ago, but now it is too complex. It takes a good portion of concentration, reviewing skill, and good code navigation practice to actually spot it. Most people (like me!) lack these skills and allow complexity to enter the codebase regularly.

So, what can be done to prevent your code from getting complex? We need to use automation! Let's make a deep dive into the code complexity and ways to find and finally solve it.

In this article, I will guide you through places where complexity lives and how to fight it there. Then we will discuss how well written simple code and automation enable an opportunity of "Continous Refactoring" and "Architecture on Demand" development styles.


## Complexity explained

One may ask: what exactly "code complexity" is? And while it sounds familiar, there are hidden obstacles in understanding the exact complexity location. Let's start with the most primitive parts and then move to higher-level entities.

Remember, that this article is named "Complexity Waterfall"? I will show you how complexity from the simplest primitives overflows into the highest abstractions.

I will use `python` as the main language for my examples and [`wemake-python-styleguide`](https://github.com/wemake-services/wemake-python-styleguide) as the main linting tool to find the violations in my code and illustrate my point.

### Expressions

All your code consists of simple expressions like `a + 1` and `print(x)`. While expressions themself are simple, they might unnoticeably overflow your code with complexity at some point. Example: imagine that you have a dictionary that represents some `User` model and you use it like so:

```python
def format_username(user) -> str:
    if not user['username']:
        return user['email']
    elif len(user['username']) > 12:
        return user['username'][:12] + '...'
    return '@' + user['username']
```

It looks pretty simple, doesn't it? In fact, it contains two expression-based complexity issues. It [overuses `'username'` string](https://wemake-python-stylegui.de/en/latest/pages/usage/violations/complexity.html#wemake_python_styleguide.violations.complexity.OverusedStringViolation)  and uses [magic number](https://wemake-python-stylegui.de/en/latest/pages/usage/violations/best_practices.html#wemake_python_styleguide.violations.best_practices.MagicNumberViolation) `12` (why do we use this number in the first place, why not `13` or `10`?). It is hard to find these kinds of things all by yourself. Here's how the better version would look like:

```python
#: That's how many chars fit in the preview box.
LENGTH_LIMIT: Final = 12

def format_username(user) -> str:
    username = user['username']

    if not username:
        return user['email']
    elif len(username) > LENGTH_LIMIT:  # See? It is now documented
        return username[:LENGTH_LIMIT] + '...'
    return '@' + username
```

There are other problems with expressions as well. We can also have [overused expressions](https://wemake-python-stylegui.de/en/latest/pages/usage/violations/complexity.html#wemake_python_styleguide.violations.complexity.OverusedExpressionViolation): when you use `some_object.some_attr` attribute everywhere instead of creating a new local variable. We can also have [too complex logic conditions](https://wemake-python-stylegui.de/en/latest/pages/usage/violations/complexity.html#wemake_python_styleguide.violations.complexity.TooManyConditionsViolation) or [too deep dot access](https://wemake-python-stylegui.de/en/latest/pages/usage/violations/complexity.html#wemake_python_styleguide.violations.complexity.TooDeepAccessViolation).

**Solution**: create new variables, arguments, or constants. Create and use new utility functions or methods if you have to.

### Lines

Expressions form code lines (please, do not confuse lines with statements: a single statement can take multiple lines and multiple statements might be located on a single line).

The first and the most obvious complexity metric for a line is its length. Yes, you heard it correctly. That's why we (programmers) prefer to stick to the `80` chars-per-line rule and not because it was [previously used](https://en.wikipedia.org/wiki/Characters_per_line) in teletypewriters. There are a lot of rumors about it lately, saying that it does not make any sense to use `80` chars for your code in 2k19. But, that's obviously not true.

The idea is simple. You can have twice as much logic in a line with `160` chars as in a line with only `80` chars. That's why this limit should be set and enforced. Remember, this is *not a stylistic choice*. It is a complexity metric!

The second main line complexity metric is less known and less used. It is called [Jones Complexity](https://wemake-python-stylegui.de/en/latest/pages/usage/violations/complexity.html#wemake_python_styleguide.violations.complexity.LineComplexityViolation). The idea behind it is simple: we count code (or `ast`) nodes in a single line to get its complexity. Let's have a look at an example. These two lines are fundamentally different in terms of complexity but have the exact same width in chars:

```python
print(first_long_name_with_meaning, second_very_long_name_with_meaning, third)
print(first * 5 + math.pi * 2, matrix.trans(*matrix), display.show(matrix, 2))
```

Let's count the nodes in the first one: one call, three names. Four nodes in total. The second one has twenty-one `ast` nodes. Well, the difference is clear. That's why we use the Jones Complexity metric to allow the first long line and disallow the second one based on internal complexity, not just on raw length.

What to do with lines with a high Jones Complexity score?

**Solution**: Split them into several lines or create new intermediate variables, utility functions, new classes, etc.

```python
print(
    first * 5 + math.pi * 2,
    matrix.trans(*matrix),
    display.show(matrix, 2),
)
```

Now it is way more readable!

### Structures

The next step is analyzing language structures like `if`, `for`, `with`, etc., that are formed from lines and expressions. I have to say that this point is very language-specific. I'll showcase several rules from this category using `python` as well.

We'll start with `if`. What could be easier than a good old `if`? Actually, `if` starts to get tricky really fast. Here's an example of how one can [reimplement `switch`](https://wemake-python-stylegui.de/en/latest/pages/usage/violations/complexity.html#wemake_python_styleguide.violations.complexity.TooManyElifsViolation) with `if`:

```python
if isinstance(some, int):
    ...
elif isinstance(some, float):
    ...
elif isinstance(some, complex):
    ...
elif isinstance(some, str):
    ...
elif isinstance(some, bytes):
    ...
elif isinstance(some, list):
    ...
```

What's the problem with this code? Well, imagine that we have tens of data types that should be covered including custom ones that we are not aware of yet. Then this complex code is an indicator that we are choosing the wrong pattern here. We need to refactor our code to fix this problem. For example, one can use [`typeclass`es](https://github.com/thejohnfreeman/python-typeclasses) or [`singledispatch`](https://docs.python.org/3/library/functools.html#functools.singledispatch). They do the same job, but nicer.

`python` never ceases to amaze us. For example, you can write `with` with [an arbitrary number of cases](https://wemake-python-stylegui.de/en/latest/pages/usage/violations/consistency.html#wemake_python_styleguide.violations.consistency.MultipleContextManagerAssignmentsViolation), which is too mentally complex and confusing:

```python
with first(), second(), third(), fourth():
    ...
```

You can also write comprehensions with any number of [`if`](https://wemake-python-stylegui.de/en/latest/pages/usage/violations/consistency.html#wemake_python_styleguide.violations.consistency.MultipleIfsInComprehensionViolation) and [`for`](https://wemake-python-stylegui.de/en/latest/pages/usage/violations/complexity.html#wemake_python_styleguide.violations.complexity.TooManyForsInComprehensionViolation) expressions, which can lead to complex, unreadable code:

```python
[
    (x, y, z)
    for x in x_coords
    for y in y_coords
    for z in z_coords
    if x > 0
    if y > 0
    if z > 0
    if x + y <= z
    if x + z <= y
    if y + z <= x
]
```

Compare it with the simple and readable version:

```python
[
    (x, y, z)
    for x, y, x in itertools.product(x_coords, y_coords, z_coords)
    if valid_coordinates(x, y, z)
]
```

You can also accidentally include [multiple statements inside a `try`](https://wemake-python-stylegui.de/en/latest/pages/usage/violations/complexity.html#wemake_python_styleguide.violations.complexity.TooLongTryBodyViolation) case, which is unsafe because it can raise and handle an exception in an unexpected place:

```python
try:
    user = fetch_user()  # Can also fail, but don't expect that
    log.save_user_operation(user.email)  # Can fail, and we know it
except MyCustomException as exc:
    ...
```

And that's not even 10% of cases that can and will go wrong with your `python` code. There are many, many [more edge cases](https://wemake-python-stylegui.de/en/latest/pages/usage/violations/complexity.html#summary) that should be tracked and analyzed.

**Solution**: The only possible solution is to use [a good linter](https://wemake-python-stylegui.de) for the language of your choice. And refactor complex places that this linter highlights. Otherwise, you will have to reinvent the wheel and set custom policies for the exact same problems.

### Functions

Expressions, statements, and structures form functions. Complexity from these entities flows into functions. And that's where things start to get intriguing. Because functions have literally dozens of complexity metrics: both good and bad.

We will start with the most known ones: [cyclomatic complexity](https://en.wikipedia.org/wiki/Cyclomatic_complexity) and a function's length measured in code lines. Cyclomatic complexity indicates how many turns your execution flow can take: it is almost equal to the number of unit tests that are required to fully cover the source code. It is a good metric because it respects the semantics and helps the developer to do the refactoring. On the other hand, a function's length is a bad metric. It conflicts with the previously explained Jones Complexity metric since we already know: multiple lines are easier to read than one big line with everything inside. We will concentrate on good metrics only and ignore bad ones.

Based on my experience, multiple useful complexity metrics should be counted instead of regular function's length:

- Number of function decorators; lower is better
- Number of arguments; lower is better
- Number of annotations; higher is better
- Number of local variables; lower is better
- Number of returns, yields, awaits; lower is better
- Number of statements and expressions; lower is better

The combination of all these checks really allows you to write simple functions (all rules are also applied to methods as well).

When you try to do some nasty things with your function, you will surely break at least one metric. And this will disappoint our linter and blow your build. As a result, your function will be saved.

**Solution**: when one function is too complex, the only solution you have is to split this function into multiple ones.

### Classes

The next level of abstraction after functions are classes. And as you already guessed they are even more complex and fluid than functions. Because classes might contain multiple functions inside (that are called methods) and have other unique features like inheritance and mixins, class-level attributes, and class-level decorators. So, we have to check all methods as functions and the class body itself.

For classes we have to measure the following metrics:

- Number of class-level decorators; lower is better
- Number of base classes; lower is better
- Number of class-level public attributes; lower is better
- Number of instance-level public attributes; lower is better
- Number of methods; lower is better

When any of these is overly complicated - we have to ring the alarm and fail the build!

**Solution**: refactor your failed class! Split one existing complex class into several simple ones or create new utility functions and use composition.

Notable mention: one can also track [cohesion](https://github.com/mschwager/cohesion) and coupling [metrics](https://stackoverflow.com/questions/3085285/difference-between-cohesion-and-coupling) to validate the complexity of your OOP design.

### Modules

Modules do contain multiple statements, functions, and classes. And as we might have already mentioned we usually advise to split functions and classes into new ones. That's why we have to keep an eye on module complexity: it literally flows into modules from classes and functions.

To analyze the complexity of the module we have to check:

- The number of imports and imported names; lower is better
- The number of classes and functions; lower is better
- The average complexity of functions and classes inside; lower is better

What do we do in the case of a complex module?

**Solution**: yes, you got it right. We split one module into several.

### Packages

Packages contain multiple modules. Luckily, that's all they do.

So, the number of modules in a package can soon start to be too large, so you will end up with too many of them. And it is the only complexity that can be found with packages.

**Solution**: you have to split packages into sub-packages and packages of different levels.


## Complexity Waterfall effect

We now have covered almost all possible types of abstractions in your codebase. What have we learned from it? The main takeaway, for now, is that most problems can be solved with ejecting complexity to the same or upper abstraction level.

![Complexity Waterfall](https://imgur.com/OQLTbjV.png)

This leads us to the most important idea of this article: do not let your code be overflowed with the complexity. I will give several examples of how it usually happens.

Imagine that you are implementing a new feature. And that's the only change you make:

```diff
+++ if user.is_active and user.has_sub() and sub.is_due(tz.now() + delta):
--- if user.is_active and user.has_sub():
```

Looks ok, I would pass this code on review. And nothing bad would happen. But, the point I am missing is that complexity overflowed this line! That's what `wemake-python-styleguide` will report:

![wemake-python-styleguide-output](https://imgur.com/qjPTkH5.png)

Ok, we now have to solve this complexity. Let's make a new variable:

```python
class Product(object):
    ...

    def can_be_purchased(self, user_id) -> bool:
        ...

        is_sub_paid = sub.is_due(tz.now() + delta)
        if user.is_active and user.has_sub() and is_sub_paid:
            ...

        ...

...
```

Now, the line complexity is solved. But, wait a minute. What if our function has too many variables now? Because we have created a new variable without checking their number inside the function first. In this case we will have to split this method into several ones like so:

```python
class Product(object):
    ...

    def can_be_purchased(self, user_id) -> bool:
        ...

        if self._has_paid_sub(user, sub, delta):
            ...

        ...

    def _has_paid_sub(self, user, sub, delta) -> bool:
        is_sub_paid = sub.is_due(tz.now() + delta)
        return user.is_active and user.has_sub() and is_sub_paid

...
```

Now we are done! Right? No, because we now have to check the complexity of the `Product` class. Imagine, that it now has too many methods since we have created a new `_has_paid_sub` one.

Ok, we run our linter to check the complexity again. And turns out our `Product` class is indeed too complex right now. Our actions? We split it into several classes!

```python
class Policy(object):
    ...

class SubcsriptionPolicy(Policy):
    ...

    def can_be_purchased(self, user_id) -> bool:
        ...

        if self._has_paid_sub(user, sub, delta):
            ...

        ...

    def _has_paid_sub(self, user, sub, delta) -> bool:
        is_sub_paid = sub.is_due(tz.now() + delta)
        return user.is_active and user.has_sub() and is_sub_paid

class Product(object):
    _purchasing_policy: Policy

    ...

...
```

Please, tell me that it is the last iteration! Well, I am sorry, but we now have to check the module complexity. And guess what? We now have too many module members. So, we have to split modules into separate ones! Then we check the package complexity. And also possibly split it into several sub-packages.

Have you seen it? Because of the well-defined complexity rules our single-line modification turned out to be a huge refactoring session with several new modules and classes. And we haven't made a single decision ourselves: all our refactoring goals were driven by the internal complexity and the linter that reveals it.

That's what I call a "Continuous Refactoring" process. You are forced to do the refactoring. Always.

This process also has one interesting consequence. It allows you to have "Architecture on Demand". Let me explain. With "Architecture on Demand" philosophy you always start small. For example with a single `logic/domains/user.py` file. And you start to put everything `User` related there. Because at this moment you probably don't know what your architecture will look like. And you don't care. You only have like three functions.

Some people fall into architecture vs code complexity trap. They can overly-complicate their architecture from the very start with the full repository/service/domain layers. Or they can overly-complicate the source code with no clear separation. Struggle and live like this for years (if they will be able to live for years with the code like this!).

The "Architecture on Demand" concept solves these problems. You start small, when the time comes - you split and refactor things:

1. You start with `logic/domains/user.py` and put everything in there
2. Later you create `logic/domains/user/repository.py` when you have enough database related stuff
3. Then you split it into `logic/domains/user/repository/queries.py` and `logic/domains/user/repository/commands.py` when the complexity tells you to do so
4. Then you create `logic/domains/user/services.py` with `http` related stuff
5. Then you create a new module called `logic/domains/order.py`
6. And so on and so on

That's it. It is a perfect tool to balance your architecture and code complexity. And get as much architecture as you truly need at the moment.


## Conclusion

A good linter does much more than finding missing commas and bad quotes. A good linter allows you to rely on it with architecture decisions and help you with the refactoring process.

For example, `wemake-python-styleguide` might help you with the `python` source code complexity, it allows you to:

- Successfully fight the complexity at all levels
- Enforce the enormous amount of naming standards, best practices, and consistency checks
- Easily integrate it into a legacy code base with the help of [`diff` option](https://wemake-python-stylegui.de/en/latest/pages/usage/integrations/legacy.html) or [`flakehell`](https://wemake-python-stylegui.de/en/latest/pages/usage/integrations/flakehell.html) tool, so old violation will be forgiven, but new ones won't be allowed
- Enable it into your [CI](), even as a [Github Action](https://github.com/marketplace/actions/wemake-python-styleguide)

Do not let the complexity to overflow your code, [use a good linter](https://github.com/wemake-services/wemake-python-styleguide)!
