---
layout: post
title: Instant +100% command line productivity boost
description: Brief overview of some awesome command line utilities to increase your productivity and make you a happier developer
date: 2017-08-23
tags: bash python
republished:
  dev.to: https://dev.to/sobolevn/testing-bash-scripts
---

Being productive is fun.

There are a lot of fields to improve your productivity. Today I am going to share some command line tips and tricks to make your life easier.


## TLDR

My full setup includes all the stuff discussed in this article and even more.
Check it out: [https://github.com/sobolevn/dotfiles](https://github.com/sobolevn/dotfiles)


## Shell

Using a good, helping, and the stable shell is the key to your command line productivity. While there are many choices, I prefer `zsh` coupled with `oh-my-zsh`. It is amazing for several reasons:

- Autocomplete nearly everything
- Tons of plugins
- Really helping and customizable `PROMPT`

You can follow these steps to install this setup:

1. Install [`zsh`](https://github.com/robbyrussell/oh-my-zsh/wiki/Installing-ZSH)
2. Install [`oh-my-zsh`](http://ohmyz.sh/)
3. Choose [plugins](https://github.com/robbyrussell/oh-my-zsh/wiki/Plugins) that might be useful for you

You may also want to tweak your settings to [turn off case sensitive autocomplete](https://github.com/sobolevn/dotfiles/blob/master/config/zshrc#L12). Or change how your [history works](https://github.com/sobolevn/dotfiles/blob/master/config/zshrc#L24).

That's it. You will gain instant +50% productivity. Now hit tab as much as you can!


## Theme

Choosing theme is quite important as well since you see it all the time. It has to be functional and pretty. I also prefer minimalistic themes, since it does not contain a lot of visual noise and unused information.

Your theme should show you:

- current folder
- current branch
- current repository status: clean or dirty
- error codes if any

I also prefer my theme to have new commands on a new line, so there is enough space to read and write it.

I personally use [`sobole`](https://github.com/sobolevn/sobole-zsh-theme). It looks pretty awesome. It has two modes.

Light:

![sobole.zsh-theme](https://raw.githubusercontent.com/sobolevn/sobole-zsh-theme/master/showcases/env-and-user.png)

And dark:

![sobole.zsh-theme](https://raw.githubusercontent.com/sobolevn/sobole-zsh-theme/master/showcases/ls-colors-dark.png)

Get your another +15% boost. And an awesome-looking theme.


## Syntax highlighting

For me, it is very important to have enough visual information from my shell to make right decisions. Like "does this command have any typos in its name" or "do I have paired scopes in this command"? And I really make tpyos all the time.

So, [`zsh-syntax-highlighting`](https://github.com/zsh-users/zsh-syntax-highlighting) was a big finding for me. It comes with reasonable defaults, but you can [change anything you want](https://github.com/zsh-users/zsh-syntax-highlighting/blob/master/docs/highlighters.md).

These steps brings us extra +5%.


## Working with files

I travel inside my directories a lot. Like *a lot*. And I do all the things there:

- navigating back and forwards
- listing files and directories
- printing files' contents

I prefer to use [`z`](https://github.com/rupa/z) to navigate to the folders I have already been to. This tool is awesome. It uses 'frecency' method to turn your `.dot TAB` into `~/dev/shell/config/.dotfiles`. Really nice!

When printing files you want usually to know several things:

- file names
- permissions
- owner
- git status of the file
- modified date
- size in human readable form

You also probably what to show hidden files to show up by default as well. So, I use [`exa`](https://github.com/ogham/exa) as the replacement for standard `ls`. Why? Because it has a lot of stuff enabled by default:

![exa](https://raw.githubusercontent.com/ogham/exa/master/screenshots.png)

To print the file contents I use standard `cat` or if I want to see to proper syntax highlighting I use a custom alias:

```
# exa:
alias la="exa -abghl --git --color=automatic"

# `cat` with beautiful colors. requires: pip install -U Pygments
alias c='pygmentize -O style=borland -f console256 -g'
```

Now you have mastered the navigation. Get your +15% productivity boost.


## Searching

When searching in a source code of your applications you don't want to include folders like `node_modules` or `bower_components` into your results by default. You also want your search to be fast and smooth.

Here's a good replacement for the built in search methods: [`the_silver_searcher`](https://github.com/ggreer/the_silver_searcher).

It is written in pure `C` and uses a lot of smart logic to work fast.

Using `ctrl` + `R` for [reverse search](https://unix.stackexchange.com/questions/73498/how-to-cycle-through-reverse-i-search-in-bash) in `history` is very useful. But have you ever found yourself in a situation when I can quite remember a command?  What if there were a tool that makes this search even greater enabling fuzzy searching and a nice UI?

There is such a tool, actually. It is called `fzf`:

 ![fzf](https://thepracticaldev.s3.amazonaws.com/i/erts5tffgo5i0rpi8q3r.png)

It can be used to fuzzy-find anything, not just history. But it requires [some configuration](https://github.com/sobolevn/dotfiles/blob/master/shell/.external#L19).

You are now a search ninja with +15% productivity bonus.


## Conclusion

Following these simple steps, you can dramatically increase your command line productivity, like +100% (numbers are approximate).

There are other tools and hacks I will cover in the next articles.


## Further reading

[Using better CLIs](https://dev.to/sobolevn/using-better-clis-6o8)
