---
layout: post
title: Testing mypy stubs, plugins, and types
description: "Have you ever wanted to test type reveal in python? In case you do you would probably need pytest-mypy-plugins for that."
date: 2019-08-25
tags: python
writing_time:
  writing: "2:00"
  proofreading: "0:10"
  decorating: "0:30"
republished:
  - resource: dev.to
    link: https://dev.to/wemake-services/testing-mypy-stubs-plugins-and-types-1b71
    language: us
---

![Post logo](https://i.imgur.com/xcEfEGA.png)

Have you ever tried to:

- Create complex generic types in your own project?
- Write [distributable stubs](https://www.python.org/dev/peps/pep-0561/) for your library?
- Create [custom `mypy` plugin](https://mypy.readthedocs.io/en/latest/extending_mypy.html)?

In case you try to do any of these, you will soon find out that you need to test your types. Wait, what? Let me explain this paradox in detail.


## The first tests for types in Python

Let's start with a history lesson.
The first time I got interested in `mypy`, I found their testing technique unique and interesting. That's how it [looks](https://github.com/python/mypy/blob/master/test-data/unit/check-lists.test) like:

```
[case testNestedListAssignmentToTuple]
from typing import List
a, b, c = None, None, None # type: (A, B, C)

a, b = [a, b]
a, b = [a]  # E: Need more than 1 value to unpack (2 expected)
a, b = [a, b, c]  # E: Too many values to unpack (2 expected, 3 provided)
```

This looks familiar:
- `[case]` defines a new test, like `def test_` does
- The contents inside are raw `python` source code lines that are processed with `mypy`
- `# E:` comments are `assert` statements that tell what `mypy` output is expected at each line

So, we can write this kind of tests for our libraries as well, right? That was the question when I started writing [`returns`](https://github.com/dry-python/returns) library (which is a typed monad implementation in Python). So, I needed to test what is going on inside and what types are revealed by `mypy`. Then I tried to reuse this test cases from `mypy`.

Long story short, it is impossible. This little helper is builtin inside `mypy` source code and cannot be reused. So, I started to look for other solutions.


## Modern approach

I stumbled on [`pytest-mypy-plugins`](https://github.com/typeddjango/pytest-mypy-plugins) package. It was originally created to make sure that types for `django` works fine in [`TypedDjango`](https://github.com/typeddjango) project. Check out [my previous post](https://sobolevn.me/2019/08/typechecking-django-and-drf) about it.

To install `pytest-mypy-plugins` in your project run:

```bash
pip install pytest-mypy-plugins
```

It works similar to `mypy`'s own test cases, but with a slightly different design. Let's create a `yaml` file and place it as `./typesafety/test_compose.yml`:

```yaml
# ./typesafety/test_compose.yml
- case: compose_two_functions
  main: |
    from myapp import first, second

    reveal_type(second(first(1)))  # N: Revealed type is 'builtins.str*'
  files:
    - path: myapp.py
      content: |
        def first(num: int) -> float:
            return float(num)

        def second(num: float) -> str:
            return str(num)
```

What do we have here?

- `case` definition, this is basically a test's name
- `main` section that contains `python` source code that is required for the test
- `# N:` comment that indicates a note from `mypy`
- `files` section where you can create temporary helper files to be used in this test

Nice! How can we run it? Since `pytest-mypy-plugins` is a `pytest` plugin, we only need to run `pytest` as usual and to specify our `mypy` configuration file (defaults to `mypy.ini`):

```bash
pytest --mypy-ini-file=setup.cfg
```

You can have two `mypy` configurations: one for your project, one for tests. Just saying. Let's have a look at our `setup.cfg` contents:

```ini
[mypy]
check_untyped_defs = True
ignore_errors = False
ignore_missing_imports = True
strict_optional = True
```

That's the invokation result:

```
» pytest --mypy-ini-file=setup.cfg
================================ test session starts =================================
platform darwin -- Python 3.7.4, pytest-5.1.1, py-1.8.0, pluggy-0.12.0
rootdir: /code/, inifile: setup.cfg
plugins: mypy-plugins-1.0.3
collected 1 item

typesafety/test_compose.yml .                                                  [100%]

================================= 1 passed in 2.00s ==================================
```

It works! Let's complicate our example a little bit.


## Checking for errors

We can also use `pytest-mypy-plugins` to enforce and check constraints on our complex type specs. Let's imagine you have a type definition with complex generics and you want to make sure that it works correctly.

That's actually very helpful, because you can check for success cases with raw `mypy` checks, while you cannot tell `mypy` to expect an error for a specific expression or call.

Let's begin with our complex type definition:

```python
# returns/functions.py
from typing import Callable, TypeVar

# Aliases:
_FirstType = TypeVar('_FirstType')
_SecondType = TypeVar('_SecondType')
_ThirdType = TypeVar('_ThirdType')

def compose(
    first: Callable[[_FirstType], _SecondType],
    second: Callable[[_SecondType], _ThirdType],
) -> Callable[[_FirstType], _ThirdType]:
    """Allows typed function composition."""
    return lambda argument: second(first(argument))
```

This code takes two function and checks that their types match, so they can be composed. Let's test it:

```yaml
# ./typesafety/test_compose.yml
- case: compose_two_wrong_functions
  main: |
    from returns.functions import compose

    def first(num: int) -> float:
        return float(num)

    def second(num: str) -> str:
        return str(num)

    reveal_type(compose(first, second))
  out: |
    main:9: error: Cannot infer type argument 2 of "compose"
    main:9: note: Revealed type is 'def (Any) -> Any'
```

In this example I changed how we make a type assertion: `out` is easier for multi-line output than inline comments.

Now we have two passing tests:

```
» pytest --mypy-ini-file=setup.cfg
================================ test session starts =================================
platform darwin -- Python 3.7.4, pytest-5.1.1, py-1.8.0, pluggy-0.12.0
rootdir: /code, inifile: setup.cfg
plugins: mypy-plugins-1.0.3
collected 2 items

typesafety/test_compose.yml ..                                                 [100%]

================================= 2 passed in 2.65s ==================================
```

Let's test one more complex case.


## Extra mypy settings

We can change `mypy` configuration on per-test bases. Let's add some new values to the existing configuration:

```yml
- case: compose_optional_functions
  mypy_config:  # appends options for this test
    no_implicit_optional = True
  main: |
    from returns.functions import compose

    def first(num: int = None) -> float:
        return float(num)

    def second(num: float) -> str:
        return str(num)

    reveal_type(compose(first, second))
  out: |
    main:3: error: Incompatible default for argument "num" (default has type "None", argument has type "int")
    main:9: note: Revealed type is 'def (builtins.int*) -> builtins.str*'
```

We added [`no_implicit_optional`](https://mypy.readthedocs.io/en/latest/command_line.html#none-and-optional-handling) configuration option that requires to add explicit `Optional[]` type to arguments where we set `None` as a default value. And our test got it from the `mypy_config` section that appends options to the base `mypy` settings from `--mypy-ini-file` setting.


## Custom DSL

`pytest-mypy-plugins` also allows to create custom `yaml`-based `DSL`s to make your testing process easier and test cases shorter.

Imagine, that we want to have `reveal_type` as a top-level key. It will just reveal a type of a source code line that is passed to it. Like so:

```yaml
-   case: reveal_type_extension_is_loaded
    main: |
      def my_function(arg: int) -> float:
          return float(arg)
    reveal_type: my_function
    out: |
      main:4: note: Revealed type is 'def (arg: builtins.int) -> builtins.float'
```

Let's have a look at what it takes to achieve it:

```python
# reveal_type_hook.py
from pytest_mypy.item import YamlTestItem

def hook(item: YamlTestItem) -> None:
    parsed_test_data = item.parsed_test_data
    main_source = parsed_test_data['main']
    obj_to_reveal = parsed_test_data.get('reveal_type')
    if obj_to_reveal:
        for file in item.files:
            if file.path.endswith('main.py'):
                file.content = f'{main_source}\nreveal_type({obj_to_reveal})'
```

What do we do here?
1. We get the source code from the `main:` key
2. Then append `reveal_type()` call from the `reveal_type:` key

As a result, we have a custom `DSL` that fulfills our initial idea.

Running:

```
» pytest --mypy-ini-file=setup.cfg --mypy-extension-hook=reveal_type_hook.hook
================================ test session starts =================================
platform darwin -- Python 3.7.4, pytest-5.1.1, py-1.8.0, pluggy-0.12.0
rootdir: /code, inifile: setup.cfg
plugins: mypy-plugins-1.0.3
collected 1 item

typesafety/test_hook.yml .                                                     [100%]

================================= 1 passed in 0.87s ==================================
```

We pass a new flag: `--mypy-extension-hook` which points to our own `DSL` implementation. And it works perfectly! That's how one can reuse a large amounts of code in `yaml`-based tests.


## Conlusion

`pytest-mypy-plugins` is an absolute must for people who work a lot with types or `mypy` plugins in `python`. It simplifies the process of refactoring and distributing types.

You can have a look at the real world example usage of these tests in:

- [TypedDjango/django-stubs](https://github.com/typeddjango/django-stubs/tree/master/test-data)
- [dry-python/returns](https://github.com/dry-python/returns/tree/master/typesafety)

Share what your use-cases are! We are still in a pretty early stage of this project and we would like to find out what our users are thinking.
