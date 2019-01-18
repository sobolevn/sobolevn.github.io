---
layout: post
title: "Is Yarn still a thing?"
description: "When npm@5 was just released this question was the first one I have googled. No doubts it comes to mind since new npm version introduced a lot of yarn’s features. In other words: should I still use yarn after installing npm@5?"
date: 2017-06-12
tags: javascript
republished:
  medium.com: https://medium.com/wemake-services/is-yarn-still-a-thing-3c6886410c83
---

When `npm@5` was just released this question was the first one I have googled.
No doubts it comes to mind since new npm version introduced a lot of yarn’s features.
In other words: should I still use yarn after installing npm@5?

### Yarn features

Why do people use yarn in the first place? `npm` had some known issues.
Well, we all have been there: downloading and installing packages for hours, resolution hell, not using essential `--save` and `--save-dev` by default, and many others.

When yarn was [first released](https://code.facebook.com/posts/1840075619545360) it solved many of these issues completely. It offered multiple improvements:

1. `yarn add` saves a package not only to `node_modules` but also adds it to the list of dependencies in `package.json`. Think of it like `yarn` does not install a package into `node_modules` directory, it [adds a package](https://yarnpkg.com/en/docs/managing-dependencies) to your project

2. `yarn install` worked in average from 2 to 3 times faster than `npm install`. `yarn` changes how packages are downloaded and installed, that’s why it is so blazingly fast

3. `yarn install` also checks for `yarn.lock` (or creates it), a special file where every single version is locked into a known state, what makes dependency resolution process deterministic

4. `yarn` utilizes cache to make the installation process even faster. It is even possible to reinstall everything without internet connection when the cache is alive (saved me once)

This set of advantages at some point predetermined how the js package manager should look like. `npm` had to take the pace.

### npm@5 breaks in

Keeping all that in mind the npm core team made a huge step towards the competitor. When the 5th major release was out a lot of people asked this question: should we still use yarn? The [changelog](http://blog.npmjs.org/post/161081169345/v500) for this release is inspiring indeed.

What are the key features that npm@5 brings to us?

**Speed up:** it is now competing with yarn and other package managers.
[Here’s a nice gif of the speed up](https://twitter.com/maybekatz/status/855362606713851904), brought to you by one of the `npm`'s core members.


**Determinism**: npm now enforces the same workflow as `yarn` (and many other package managers). It generates `package-lock.json` to know what exact versions your project uses. It is worth mentioning that algorithms in `yarn` and `npm` differ. And `npm` has a solid advantage since it [has better hoisting position across npm versions](https://yarnpkg.com/blog/2017/05/31/determinism/) than `yarn` has across different version of `yarn`.

**Sane defaults**: `--save` is now enabled by default. No more problems with that.

**Cache**: it was completely [rewritten](https://github.com/npm/npm/pull/15666). `cacache` and `pacote` living inside the new realization are fast and reliable. You can run this command to see it yourself:

```bash
git clone https://github.com/zkat/cacache && cd cacache && npm i && npm run benchmarks
```

**Default tool**: `npm` is the default. Everyone uses it. Earlier it was like `IE`: a browser to download another browser. Jokes aside, this point is strong. You don’t need to have this one extra custom package manager.

### But, really, is yarn still a thing?

The answer is: it depends.

My first attempt to install something with npm@5 was with my the most favorite [wemake-vue-template](https://github.com/wemake-services/wemake-vue-template) which has around 850 packages to download. `npm`'s time was not bad at all with 42 seconds at the fresh run. When the cache is ready, it takes only 30 seconds to install everything.

Compared to `yarn`: 35 seconds without cache and 20 seconds with the cache in place. For me, this time gap was important enough to still use `yarn` as a primary tool.

But. **Do not use both tools inside one team**. It will lead to a disaster with package resolution and pollute your repository with extra files. Stick to something and use it.

### Finale

`npm` is moving in a right direction (say hi to pip).
It is pretty great already, but soon it will be even cooler.
