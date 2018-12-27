---
layout: post
title: Using better CLIs
description: Don't stick to the default CLIs, there are better alternatives!
date: 2017-10-09
tags: bash python
republished:
  dev.to: https://dev.to/sobolevn/using-better-clis-6o8
---

For people who spend half of their lives in a terminal user experience and functionality is highly important. Making you a happier person.

Here are some very good alternatives to some default command line applications.


## TLDR

My full setup includes all the stuff discussed in this article and even more. Check it out: https://github.com/sobolevn/dotfiles


## Git

### hub

When working with open-source (and Github) projects frequently sometimes `git` is not enough. So, Github created a tool called [`hub`](https://hub.github.com/).

It allows to fetch from remote forks, browse issues, and create pull requests with ease!

```
# Open the current project's issues page
$ git browse -- issues
  → open https://github.com/github/hub/issues

# Fetch from multiple forks, even if they don't yet exist as remotes:
$ git fetch user1,fork2

# Browse issues:
$ git browse -- issues
  → open https://github.com/github/hub/issues

# Create a pull request:
$ git pull-request -F message-template.md
```

### tig

Let's face it. `git log` sucks. It allows browsing commits history, but when you want to look inside a specific commit for its changesets or tree structure, well ... You will have to memorize all these commands or use a lot of external plugins.

`tig` solves it all. Firstly, it allows to browse commits history. Then you can dive inside! Browse changesets, file trees, blames, and even blobs!

![tig](https://i.imgur.com/0EVZxQb.png)


## Utils

### postgres (and mysql too!)

When working with `postgres` we have to use `psql`. And it is quite good. It has history, some basic autocomplete and commands that are easy to remember. But, there is a better tool called [`pgcli`](https://github.com/dbcli/pgcli).

![pgcli](https://raw.githubusercontent.com/dbcli/pgcli/7c720a07652d705376af6bf4fcfe6a65e0df3ddc/screenshots/pgcli.gif)

Features:
- smart autocomplete
- syntax highlighting
- pretty prints of tabular data

It also has a version for `mysql` called [`mycli`](https://github.com/dbcli/mycli).

By the way, yesterday a new [10th version](https://www.postgresql.org/about/news/1786/) of `postgres` was released. :tada:

### glances

System monitoring is a common task for every developer. Standard tools like `top` and `htop` are fine and trusted software. But look at this beauty, [`glances`](https://github.com/nicolargo/glances):

![glances](https://raw.githubusercontent.com/nicolargo/glances/develop/docs/_static/glances-summary.png)

`glances` has a lot of plugins to monitor almost everything: https://github.com/nicolargo/glances#requirements

It also has a web interface and a pre-build `docker`-container to integrate it easily. My top list of plugins:
- `docker`
- `gpu` (very useful for miners and coins-folks!)
- `bottle` (web-interface)
- `netifaces` (IPs)

Create [your own](https://github.com/nicolargo/glances/wiki/How-to-create-a-new-Glances-plugin-%3F) if you want to!

## httpie

`curl` and `wget` are well-known and widely used. But are they user-friendly? I don't think so. `httpie` **is** user-friendly and can do everything these tools can:

![httpie](https://httpie.org/static/img/httpie2.png?v=72661be530fde9d07e03be9df60312da)

And even [more](https://httpie.org/doc#main-features). I don't regret a single minute using it instead of `curl`.

### jq

[`jq`](https://stedolan.github.io/jq/manual/) is like `sed` for `json`. It is useful in automation, configuration reading, and making requests.

You can try it [online](https://jqplay.org/).

### doitlive

Sometimes you have to do something live: a screencast, a gif, a talk. But everything can go wrong. You can make a typo, or misspell a word. That's where [`doitlive`](https://github.com/sloria/doitlive) comes to the rescue.

Just create a file called `session.sh` with command that needs to be executed and then run:

```
doitlive play session.sh
```

Now you are a command line magician.


## Python

I do a lot of `python` development. So, here are my tools to make it better.

### pipsi

[`pipsi`](https://github.com/mitsuhiko/pipsi) = `pip` Script Installer. It creates a `virtualenv` for every script and symlinks it into your `/usr/local/bin`. So it won't pollute your global environment.

### pipenv

[`pipenv`](http://pipenv.org) is a tool that aims to bring the best of all packaging worlds (bundler, composer, npm, cargo, yarn, etc.) to the Python world.

![pipenv](https://camo.githubusercontent.com/2287c881cb3a045f4f70f20f0326ec4ef1474ccd/687474703a2f2f6d656469612e6b656e6e657468726569747a2e636f6d2e73332e616d617a6f6e6177732e636f6d2f706970656e762e676966)

The problems that Pipenv seeks to solve are multi-faceted:

- You no longer need to use pip and virtualenv separately. They work together.
- Managing a requirements.txt file can be problematic, so Pipenv uses the upcoming Pipfile and Pipfile.lock instead, which is superior for basic use cases.
- Hashes are used everywhere, always. Security. Automatically expose security vulnerabilities.
- Give you insight into your dependency graph (e.g. `$ pipenv graph`).
- Streamline development workflow by loading `.env` files.

### ipython

[`ipython`](https://ipython.org/) = Interactive `python`.

`ipython` brings autocomplete, nice history, and multiline editing to the `python` shell. It integrates into `django` and `flask` nicely without any configuration.
It is a must for all of my projects. If you like it, also check out [`jupyter`](https://jupyter.org/).


## Previous series

- [Instant 100% command line productivity boost](https://dev.to/sobolevn/instant-100-command-line-productivity-boost)
