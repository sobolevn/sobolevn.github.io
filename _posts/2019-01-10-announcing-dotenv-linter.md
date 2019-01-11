---
layout: post
title: "Announcing dotenv-linter"
description: Simple linter for `.env` files. While `.env` files are pretty straight-forward it is required to keep them consistent. This tool offers a wide range of consistency rules and best practices. And it integrates perfectly into any existing workflow.
date: 2019-01-10
tags: python
republished:
  dev.to: https://dev.to/wemake-services/announcing-dotenv-linter-a-tool-to-lint-your-env-files-3m1g
---

I happy to announce a simple yet very useful tool to lint your `.env` files.

![dotenv-linter logo](https://thepracticaldev.s3.amazonaws.com/i/untiw080ajgmz84m9857.png)


## Background

As a part of our ["not blaming but fixing" corporate culture](https://sobolevn.me/2018/12/blameless-environment) we build a lot of tools that prevent us from making the same mistakes over and over again.

[`dotenv-linter`](https://github.com/wemake-services/dotenv-linter) is one of these tools.

Some time ago we had several problems with `.env` files:

- Some developers used `CONSTANT_CASE` for variable names and some developers used `snake_case` for that. While this is not a technical issue, but it is not very practical to mix these two cases and then think: what case I have used for this particular variable? Consistency is important!
- We also had a problem with quotes and extra spaces. Some developers used `KEY=VALUE` and some used `KEY = "VALUE"` while in fact, these two examples will resolve in exactly the same thing - we prefer to have one-- and preferably only one --obvious way to do it. So, we now stick to `KEY=VALUE` notation
- We also once had a duplicate key that ruined my day. [I have spent several hours](https://sobolevn.me/2018/03/mediocre-developer) debugging my app because of this simple issue. That was a turning point for me and I have decided: let's automate it!


## Installation

You can install it via `pip` (or any other similar tool):

```terminal
$ pip install dotenv-linter
```

Why `pip`? Because `python` is present almost on all Linux setups. And we try to make this tool as portable as possible.


## Usage

Usage is really simple:

```terminal
$ dotenv-linter path/to/your/.env even/multiple/files/are/fine/.env
```


## Real-life examples

If you are interested in how we use it real life applications you can have a look at (and even try!) our [`django` template](https://github.com/wemake-services/wemake-django-template). Here's the [line](https://github.com/wemake-services/wemake-django-template/blob/master/%7B%7Bcookiecutter.project_name%7D%7D/docker/ci.sh#L55) that invokes it.

We also have a full list of [linting rules in our docs](https://dotenv-linter.readthedocs.io/en/latest/pages/violations/index.html), check it out.


## Conclusion

I hope this simple tool will save you some time, make your project more consistent, and your life slightly better. [Add me on github](https://github.com/sobolevn) to stay informed about the tools I am building!
