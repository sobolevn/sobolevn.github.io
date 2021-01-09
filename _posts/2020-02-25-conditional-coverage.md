---
layout: post
title: "Conditional coverage"
description: "Sometimes your code has to take different paths based on the external environment. Make sure that your coverage follows it smoothly."
date: 2020-02-25
tags: python
writing_time:
  writing: "1:00"
  proofreading: "0:20"
  decorating: "0:10"
republished:
  - link: https://dev.to/wemake-services/cover-the-tricky-parts-of-your-code-24m6
    language: us
---

![Cover image](https://dev-to-uploads.s3.amazonaws.com/i/c8c6rwydi6jnjs54vixi.png)

Recently I had to add `python3.8` for our Python linter (the strictest one in existence): [`wemake-python-styleguide`](https://github.com/wemake-services/wemake-python-styleguide). And during this straight-forward (at first look) task, I have found several problems with test coverage that were not solved in Python community at all.

Let's dig into it.


## Environment-based logic

The thing about this update was that `python3.8` introduced a new API.
Previously we had `visit_Num`, `visit_Str`, `visit_NameConstant` methods (we don't really care about what they do, only names are important), but now we have to use `visit_Constant` method instead.

Well, we will have to write some compatibility layer in our app to support both new `python3.8`, previous `python3.6`, and `python3.7` releases.

My first attempt was to create a `route_visit` function to do the correct thing for all releases. To make it work I also had to define `PY38` constant like so:

```python
import sys

PY38 = sys.version_info >= (3, 8)

if PY38:
    route_visit = ...  # new logic: 3.8+
else:
    route_visit = ...  # old logic: 3.6, 3.7
```

And it worked pretty well. I was able to run my tests successfully. The only thing broken was coverage. We use `pytest` and `pytest-cov` to measure coverage in our apps, we also enforce `--cov-branch` and `--cov-fail-under=100` policies. Which enforce us to cover all our code and all branches inside it.

Here's the problem with my solution: I was either covering `if PY38:` branch on `python3.8` build or `else:` branch on other releases. I was never covering 100% of my program. Because it is literally impossible.


## Common pitfalls

Open-source libraries usually face this problem. They are required to work with different python versions, 3rd party API changes, backward compatibility, etc. Here are some examples that you probably have already seen somewhere:

```python
try:
    import django
    HAS_DJANGO = True
except ImportError:
    HAS_DJANGO = False
```

Or this was a popular hack during `2` / `3` days:

```python
try:
    range_ = xrange  # python2
except NameError:
    range_ = range  # python3
```

With all these examples in mind, one can be sure that 100% of coverage is not possible.
The common scenario to still achieve a feeling of 100% coverage for these cases was:

1. Using [`# pragma: no cover`](https://coverage.readthedocs.io/en/stable/excluding.html) magic comment to exclude a single line or a whole block from coverage
2. Or writing every compatibility related check in a special `compat.py` that were later [omitted](https://coverage.readthedocs.io/en/stable/source.html#execution) from coverage

Here's how the first way looks like:

```python
try:  # pragma: no cover
    import django
    HAS_DJANGO = True
except ImportError:  # pragma: no cover
    HAS_DJANGO = False
```

Let's be honest: these solutions are dirty hacks. But, they do work. And I personally used both of them countless times in my life.

Here's the interesting thing: aren't we supposed to test these complex integrational parts with the most precision and observability? Because that's where our application breaks the most: integration parts. And currently, we are just ignoring them from coverage and pretending that this problem does not exist.

And for this reason, this time I felt like I am not going to simply exclude my compatibility logic. I got an idea for a new project.


## Conditional coverage

My idea was that `# pragma` comments can have more information inside them. Not just `no cover`, but `no cover when?`. That's how [`coverage-conditional-plugin`](https://github.com/wemake-services/coverage-conditional-plugin) was born. Let's use it and see how it works!

First, we would need to install it:

```bash
pip install coverage-conditional-plugin  # pip works, but I prefer poetry
```

And then we would have to [configure](https://coverage.readthedocs.io/en/coverage-5.0.3/config.html) `coverage` and the plugin itself:

```yaml
[coverage:run]
# Here we specify plugins for coverage to be used:
plugins =
  coverage_conditional_plugin

[coverage:coverage_conditional_plugin]
# Here we specify our pragma rules:
rules = # we are going to define them later.
```

Notice this `rules` key. It is the most important thing here. The rule (in this context) is some predicate that tells: should we include lines behind this specific `pragma` in our coverage or not. Here are some examples:

```yaml
[coverage:coverage_conditional_plugin]
# Here we specify our pragma rules:
rules =
  "sys_version_info >= (3, 8)": py-gte-38
  "sys_version_info < (3, 8)": py-lt-38
  "is_installed('django')": has-django
  "not is_installed('django')": has-no-django
```

It is pretty clear what we are doing here: we are defining pairs of predicates to include this code if some condition is true and another code in the opposite case.

Here's how our previous examples would look like with these magic comments:

```python
import sys

PY38 = sys.version_info >= (3, 8)

if PY38:  # pragma: py-lt-38
    route_visit = ...  # new logic: 3.8+
else:  # pragma: py-gte-38
    route_visit = ...  # old logic: 3.6, 3.7
```

What does it say? If we are running on `py-lt-38` ignore `if PY38:` part. But, cover `else:` case. Because it is going to be executed and we know it. And we need to know how good did we cover it. On the other hand, if we are running on `py-gte-38` then cover `if PY38:` case and leave `else:` alone.

And we can test that everything works correctly. Let's add some nonsense into our `PY38` branch to see if it is going to be covered by `python3.8` build:

![PY38 Covered](https://dev-to-uploads.s3.amazonaws.com/i/ul5t9zxjc5omzvu16qxn.png)

As we can see: green signs show which lines were fully covered, the yellow line indicates that branch coverage was not full, and the red line indicates that the line was not covered at all. And here's an example of grey or ignored lines under the opposed condition:

![py-lt-38 ignored](https://dev-to-uploads.s3.amazonaws.com/i/ebcok1i4wgmxftez0sjy.png)

[Here](https://github.com/wemake-services/wemake-python-styleguide/blob/master/wemake_python_styleguide/compat/routing.py) you can find the full real-life source code for this sample.

And here's one more example with `django` to show you how external packages can be handled:

```python
try:  # pragma: has-no-django
    import django
    HAS_DJANGO = True
except ImportError:  # pragma: has-django
    HAS_DJANGO = False
```

We use the same logic here. Do we have `django` installed during tests (we have a little helper function `is_installed` to tell us)? If so, cover `try:`. If not, cover `except ImportError:` branch. But always cover *something*.


## Conclusion

I hope you got the idea. Conditional coverage allows you to add or ignore lines based on predicates and collecting required bits of coverage from every run, not just ignoring complex conditions and keeping our eyes wide shut. Remember, that the code we need to cover the most!

By the way, we have all kinds of helpers to query your environment:

- `os_environ` for env variables
- `patform_release` and `platform_version` for OS-based values
- `pkg_version` that returns package version information (as its name says)
- and many others!

This little plugin is going to be really helpful for library authors that have to deal with compatibility and unfixed environments. And `coverage-conditional-plugin` will surely *cover* their backs! [Give it a star](https://github.com/wemake-services/coverage-conditional-plugin) on Github if you like this idea. And read the project docs to learn more.
