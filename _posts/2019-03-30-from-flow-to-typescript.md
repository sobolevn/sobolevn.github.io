---
layout: post
title: From Flow to Typescript. Why?
description: "We have moved wemake-vue-template from Flow to TypeScript. Everyone, jump on the hype train!"
date: 2019-03-30
tags: javascript
writing_time:
  writing: "2:00"
  proofreading: "0:30"
  decorating: "0:30"
republished:
  - link: https://dev.to/wemake-services/from-flow-to-typescript-why-1k7m
    language: us
---

![Article logo](https://thepracticaldev.s3.amazonaws.com/i/xkai9z2i7pgsu2jktkdf.png)

It all started almost two years ago. I was sick with constant silly javascript mistakes like `undefined is not a function` in my apps. So, I have decided to add optional static typing.

Two years ago the javascript land was completely different. Both `Flow` and `TypeScript` had a lot of disadvantages: poor libraries support, from none to almost none IDE support, type issues, and limitations. I have chosen `Flow` just because it was easier to start with. Plug it into your [`.babelrc`](https://github.com/wemake-services/wemake-vue-template/blob/9dc664c36f30c610ee5bdaecfb586968a3ed57bf/template/.babelrc#L8) and start working.

Almost 6 months ago I have made a decision to move all our frontend projects from `Flow` to `TypeScript`. It was a tough battle inside my head. So, I have decided to write it down to help other people to choose the right tool. And not to make my mistakes.

These tools are quite similar, both providing type-safety to plain javascript. And this article is [not about types](https://github.com/niieani/typescript-vs-flowtype) or differences between structural and nominal subtyping. It more about the current state of these tools.

You rarely change typing tools because of types.

## Hype

I will start with the most important aspect of all technical decisions. Yes, it is about hype-driven-development.

![Hype ORLY](https://thepracticaldev.s3.amazonaws.com/i/8lx11zrlckdw8vltbv8j.jpeg)

Please, do not make your face like this. I will explain how it works, and possibly you will change your mind.

I quite often [speak](https://sobolevn.me/talks/) about our stack, write articles about it, etc. And every time I said that we were using `Flow` other developers asked me: "But why not `TypeScript`"? And every time I had to explain my choice. Going deep into details, history, and tooling. Sometimes even explaining the state of current projects and our workflow. This was not a pleasant experience when you are not advocating for something. I was just a user. I do not really prefer one to another. And it felt really strange to had this conversation over and over again.

Moreover, we make services for our clients, and [we hire](https://wemake.services/meta/rsdp/job-application/) other developers. And some of them literally wants to work with `TypeScript` and does not want to work with `Flow`. Why? Because they heard about `TypeScript` and how awesome it is. While the hype train around `Flow` is not so massive.

> Me: Hi, we use X, Y, Z, and `Flow` for this project

> Dev: `Flow`? Why not `TypeScript`?

> Me: Oh, are you kidding me? :facepalm:

If you do not want to fight this hype train but make it work for you it is better to step aside and use whatever is hyped. Keeping in mind that there's no massive change for your current workflow.

## Infrastructure

[Vue 3.0 will support](https://medium.com/the-vue-point/plans-for-the-next-iteration-of-vue-js-777ffea6fabf) `TypeScript` out of the box, Nuxt already supports `TypeScript`. There are a lot of projects that ship types together with the source code. `axios`, `vuex`, `vue-router`, `lodash` to name a few.

What about `Flow` support? Vue currently uses `Flow` for typing (switching to `TypeScript` starting from 3.0), but these types are development only. You cannot take them and use in your own projects.

Maybe there are different types? Yes, `Flow` has its own repository for types. The problem is that installing types is a whole new extra step. You have to configure `postinstall` hook to make sure that types are also rebased after each `npm install` call (yes, they use `git rebase`).

When you will dig into `flow-typed` packages you will find that it is mostly React oriented. `Flow` even has a lot of React primitives in the standard library. Which I find really strange.

But what about Vue specific types (since we use Vue a lot)? Yes, you can find [`@vue-flow-type` package](https://github.com/sobolevn/vue-flow-typed) maintained by a single person. The sad thing is that I am this single person. I am really tired of maintaining types for several popular projects. And as you can imagine there are bugs, type changes, new releases, etc.

`TypeScript` wins this one for me. Its distribution system does not force me to do extra work. Just install something and it will work. Because `types/` subfolder is shipped together with the source code via `npm`. No extra steps are required. Library authors maintain `types/` folder together with the rest of codebase. They can be sure that everything works correctly.

## IDE

Let's discuss IDE support for `Flow` projects. Or I would say "no IDE support".

That's not a big thing, I can write my code using just `nano`. But I spend a lot of my life inside [text editors](https://github.com/sobolevn/dotfiles) and I want them to be friendly. Sadly, `Flow` plugins for all major IDEs (and text editors) are buggy and unreliable. For example, [VSCode plugin](https://github.com/flowtype/flow-for-vscode) does not work at all.

And at the same time, VSCode is known for its first-class `TypeScript` support. With intellisense, type-checking, and autocomplete out of the box.

![vetur plugin for vscode](https://cloud.githubusercontent.com/assets/4033249/25200022/ea76fef4-251a-11e7-9e18-348b76b97424.png)

Have a look at our [VSCode + TS + Vue](https://github.com/wemake-services/wemake-vue-template/blob/master/template/.vscode/settings.json) setup.

With this simple feature, your development workflow starts to feel more responsive, and the feedback loop time is significantly decreased.

## Unfixed bugs

The other thing that was ruining my `Flow` experience is the number of unfixed bugs in `Flow` itself.

For example, when you install `Vuex` all `Vue` components are extended with an extra property which can be accessed with `this.$store`. The thing is there's no way to tell `Flow` that `Vuex` was added. And [this bug](https://github.com/facebook/flow/issues/396) is opened since 2015, for 4 years now!

Of course, you can still write your own types:

```js
// @flow

import Vue from 'vue'
import type { Store } from 'vuex'

import type { State } from '~/types/vuex'

/**
* Represents our extended Vue instance.
*
* We just use the annotations here, since properties are already injected.
* You will need to add new annotations in case you will extend Vue with new
* plugins.
*/
export default class CustomVue extends Vue {
  $store: Store<State>
}
```

But now you have to maintain your own types by yourself. Do you want to add `this.$router` property? Please, add it yourself. Nuxt specific types? You are on your own.

Compare it with [the standard](https://github.com/vuejs/vuex/blob/dev/types/vue.d.ts) `TypeScript` approach:

```typescript
import Vue, { ComponentOptions } from "vue";
import { Store } from "./index";

declare module "vue/types/options" {
  interface ComponentOptions<V extends Vue> {
    store?: Store<any>;
  }
}

declare module "vue/types/vue" {
  interface Vue {
    $store: Store<any>;
  }
}
```

Existing types can be extended with special declarations. And library authors do that for you. Remember what I said about types distribution? This feature makes the distribution even better.

The [second well-known bug](https://github.com/facebook/flow/issues/452) from 2015 is that you cannot annotate `this` even if you have to. Some libraries have strange APIs. With `Flow` you just cannot do anything, typing is lost there. But with `TypeScript` you can annotate what `this` means in every context. And it is great for a lot of use-cases.

Why these bugs are not fixed? I don't know. They brought a lot of attention during the years. A lot of people wanted these things, but `Flow` team does not share their vision on the project. And they release things that they want, not the community.

## Releases

Talking about releases I must mention their policy: "just release things and make users fix their code". Here's [the release history](https://github.com/wemake-services/wemake-vue-template/pulls?utf8=%E2%9C%93&q=is%3Apr+flow-bin) and what it has done to my project. Almost every release breaks my code. Considering that it is a template with almost no code – it is really scary.

By the way, `Flow` team does not follow SemVer, they just release incrementally. After one release `jsx` inside `.vue` files stopped working. I was not able to fix it ever again on new versions. I took the lazy path: pinned the version and just ignored the updates after this incident.

`TypeScript` has [clear release policy](https://github.com/Microsoft/TypeScript/wiki/Roadmap), SemVer, and wide attention to the community. It is much better to maintain in the long run.

## Conclusion

We have made our choice and [said "Good bye"](https://github.com/wemake-services/wemake-vue-template/releases/tag/end-of-flow) to `Flow`. Now all our projects and our project template supports `TypeScript`. And we regret nothing!

By the way, our template is truly awesome. It supports:

- Nuxt for server-side rendering and boilerplate isolation
- TypeScript everywhere: code, tests, configuration
- Jest for unit tests, TestCafe for E2E tests
- Docker for development and production
- [Awesome documentation](https://wemake-services.gitbook.io/wemake-vue-template/) that covers every aspect of the project

[Try it out](https://github.com/wemake-services/wemake-vue-template)!
