---
layout: post
title: Really typing Vue
description: This is not another "setting up" a new project with Vue and TypeScript tutorial. Let's do some deep dive into more complex topics!
date: 2019-06-29
tags: javascript
writing_time:
  writing: "1:30"
  proofreading: "0:30"
  decorating: "0:10"
republished: []
---

{% raw %}

![Logo](https://thepracticaldev.s3.amazonaws.com/i/paw8ll63hfo6oe5a7pi0.png)

inb4: This is not another "setting up" a new project with Vue and TypeScript tutorial. Let's do some deep dive into more complex topics!

`typescript` is awesome. `Vue` is awesome. No doubt, that a lot of people [try to bundle them together](https://sobolevn.me/2019/03/from-flow-to-typescript). But, due to different reasons, it is hard to **really** type your `Vue` app. Let's find out what are the problems and what can be done to solve them (or at least minimize the impact).


## TLDR

We have [this wonderful template](https://github.com/wemake-services/wemake-vue-template) with `Nuxt`, `Vue`, `Vuex`, and `jest` fully typed. Just install it and everything will be covered for you. Go [to the docs](https://wemake-services.gitbook.io/wemake-vue-template/) to learn more.

And as I said I am not going to guide you through the basic setup for three reasons:

1. There are a lot of existing tutorials about it
2. There are a lot of tools to get started with a single click like `Nuxt` and `vue-cli` with `typescript` plugin
3. We already have [`wemake-vue-template`](https://github.com/wemake-services/wemake-vue-template) where every bit of setup that I going to talk about is already covered


## Component typings

The first broken expectation when you start to work with `Vue` and `typescript` and after you have already typed your class components is that `<template>` and `<style>` tags are still not typed. Let' me show you an example:

```vue
<template>
  <h1 :class="$style.headr">
    Hello, {{ usr }}!
  </h1>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'
import { Prop } from 'vue-property-decorator'

@Component({})
export default class HelloComponent extends Vue {
  @Prop()
  user!: string
}
</script>

<style module>
.header { /* ... */ }
</style>
```

I have made two typos here: `{{ usr }}` instead of `{{ user }}` and `$style.headr` instead of `$style.header`. Will `typescript` save me from these errors? Nope, it won't.

What can be done to fix it? Well, there are several hacks.

### Typing the template

One can use `Vetur` with `vetur.experimental.templateInterpolationService` option to type-check your templates. Yes, this is only an editor-based check and it cannot be used inside the CI yet. But, `Vetur` team is working hard to provide a CLI to allow this. Track [the original issue](https://github.com/vuejs/rfcs/issues/64#issuecomment-505990139) in case you are interested.

![vetur](https://thepracticaldev.s3.amazonaws.com/i/xqhobu1d7td40jxru2gn.png)

The second option is two write snapshot tests with `jest`. It will catch a lot of template-based errors. And it is quite cheap in the maintenance.

So, the combination of these two tools provides you a nice Developer Experience with fast feedback and a reliable way to catch errors inside the CI.

### Typing styles

Typing `css-module`s is also covered by several external tools:
- [typings-for-css-modules-loader](https://github.com/Jimdo/typings-for-css-modules-loader)
- [css-modules-typescript-loader](https://github.com/seek-oss/css-modules-typescript-loader)

The main idea of these tools is to fetch `css-module`s and then create `.d.ts` declaration files out of them. Then your styles will be fully typed. It is still not implemented for `Nuxt` or `Vue`, but you can tract [this issue](https://github.com/nuxt/nuxt.js/issues/5426) for progress.

However, I don't personally use any of these tools in my projects. They might be useful for projects with large code bases and a lot of styles, but I am fine with just snapshots.

Styleguides with visual regression tests also help a lot. [`@storybook/addon-storyshots`](https://www.npmjs.com/package/@storybook/addon-storyshots) is a nice example of this technique.


## Vuex

The next big thing is `Vuex`. It has some built-in by-design complexity for typing:

```ts
const result: Promise<number> = this.$store.dispatch('action_name', { payload: 1 })
```

The problem is that `'action_name'` might no exist, take other arguments, or return a different type. That's not something you expect for a fully-typed app.

What are the existing solutions?

### vuex-class

[`vuex-class`](https://github.com/ktsn/vuex-class) is a set of decorators to allow easy access from your class-based components to the `Vuex` internals.

But, it [is not typed safe](https://github.com/ktsn/vuex-class/issues/2) since it cannot interfere with the types of state, getters, mutations, and actions.

![vuex-class](https://thepracticaldev.s3.amazonaws.com/i/2fd8fpvpta6a7qqar3x5.png)

Of course, you can manually annotate types of properties.

![vuex-class annotated](https://thepracticaldev.s3.amazonaws.com/i/3xcb8k642a2e4lhek6ao.png)

But what are you going to do when the real type of your state, getters, mutations, or actions will change? You will have a hidden type mismatch.


### vuex-simple

That's where `vuex-simple` helps us. It actually offers a completely different way to write your `Vuex` code and that's what makes it type safe. Let's have a look:

```ts
import { Action, Mutation, State, Getter } from 'vuex-simple'

class MyStore {

  // State

  @State()
  public comments: CommentType[] = []

  // Getters

  @Getter()
  public get hasComments (): boolean {
    return Boolean(this.comments && this.comments.length > 0)
  }

  // Mutations

  @Mutation()
  public setComments (payload: CommentType[]): void {
    this.comments = updatedComments
  }

  // Actions

  @Action()
  public async fetchComments (): Promise<CommentType[]> {
    // Calling some API:
    const commentsList = await api.fetchComments()
    this.setComments(commentsList) // typed mutation
    return commentsList
  }
}

```

Later this typed module can be registered inside your `Vuex` like so:

```ts
import Vue from 'vue'
import Vuex from 'vuex'
import { createVuexStore } from 'vuex-simple'

import { MyStore } from './store'

Vue.use(Vuex)

// Creates our typed module instance:
const instance = new MyStore()

// Returns valid Vuex.Store instance:
export default createVuexStore(instance)
```

Now we have a 100% native `Vuex.Store` instance and all the type information bundled with it. To use this typed store in the component we can write just one line of code:

```ts
import Vue from 'vue'
import Component from 'nuxt-class-component'
import { useStore } from 'vuex-simple'

import MyStore from './store'

@Component({})
export default class MyComponent extends Vue {
  // That's all we need!
  typedStore: MyStore = useStore(this.$store)

  // Demo: will be typed as `Comment[]`:
  comments = typedStore.comments
}
```

Now we have typed `Vuex` that can be safely used inside our project.
When we change something inside our store definition it is automatically reflected to the components that use this store. If something fails - we know it as soon as possible.

There are also different libraries that do the same but have different API. Choose what suits you best.


## API calls

When we have `Vuex` correctly setup, we need to fill it with data.
Let's have a look at our action definition again:

```ts
@Action()
public async fetchComments (): Promise<CommentType[]> {
  // Calling some API:
  const commentsList = await api.fetchComments()
  // ...
  return commentsList
}
```

How can we know that it will really return a list of `CommentType` and not a single `number` or a bunch of `AuthorType` instances?

We cannot control the server. And the server might actually break the contract. Or we can simply pass the wrong `api` instance, make a typo in the URL, or whatever.

How can we be safe? We can use runtime typing! Let me introduce [`io-ts`](https://github.com/gcanti/io-ts) to you:

```ts
import * as ts from 'io-ts'

export const Comment = ts.type({
  'id': ts.number,
  'body': ts.string,
  'email': ts.string,
})

// Static TypeScript type, that can be used as a regular `type`:
export type CommentType = ts.TypeOf<typeof Comment>
```

What do we do here?

1. We define an instance of `ts.type` with fields that we need to be checked in runtime when we receive a response from server
2. We define a static type to be used in annotation without any extra boilerplate

And later we can use it our `api` calls:

```ts
import * as ts from 'io-ts'
import * as tPromise from 'io-ts-promise'

public async fetchComments (): Promise<CommentType[]> {
  const response = await axios.get('comments')
  return tPromise.decode(ts.array(Comment), response.data)
}
```

With the help of [`io-ts-promise`](https://github.com/aeirola/io-ts-promise), we can return a `Promise` in a failed state if the response from server does not match a `ts.array(Comment)` type. It really works like a validation.

```ts
fetchComments()
   .then((data) => /* ... */
   .catch(/* Happens with both request failure and incorrect response type */)
```

Moreover, return type annotation is in sync with the `.decode` method. And you cannot put random nonsense there:

![io-ts](https://thepracticaldev.s3.amazonaws.com/i/jcfwd5frskia9b1fccxq.png)

With the combination of runtime and static checks, we can be sure that our requests won't fail because of the type mismatch.
But, to be 100% sure that everything works, I would recommend using contract-based testing: have a look at [`pact`](https://github.com/pact-foundation) as an example. And monitor your app with [`Sentry`](https://docs.sentry.io/platforms/javascript/vue/).


## Vue Router

The next problem is that `this.$router.push({ name: 'wrong!' })` does not work the way we want to.

I would say that it would be ideal to be warned by the compiler that we are routing to the wrong direction and this route does not exist.
But, it is not possible. And not much can be done: there are a lot of dynamic routes, regex, fallbacks, permissions, etc that can eventually break. The only option is to test each `this.$router` call in your app.


## vue-test-utils

Speaking about tests I do not have any excuses not to mention `@vue/test-utils` that also has some problems with typing.

When we will try to test our new shiny component with `typedStore` property, we will find out that we actually cannot do that according to the `typescript`:

![vue-test-utils](https://thepracticaldev.s3.amazonaws.com/i/stvaddcj8yg8uz8eh9r0.png)

Why does this happen? It happens because `mount()` call does not know anything about your component's type, because all components have a  `VueConstructor<Vue>` type by default:

![vue-constructor](https://thepracticaldev.s3.amazonaws.com/i/zfvrvtjfzrc88bmukms2.png)

That's where all the problems come from. What can be done?
You can use [`vuetype`](https://github.com/ktsn/vuetype) to produce `YouComponent.vue.d.ts` typings that will tell your tests the exact type of the mounted component.

You can also track [this issue](https://github.com/vuejs/vue-test-utils/issues/255#issuecomment-356730130) for the progress.

But, I don't like this idea. These are tests, they can fail. No big deal.
That's why I stick to `(wrapper.vm as any).whatever` approach. This saves me quite a lot of time to write tests. But spoils Developer Experience a little bit.

Make your own decision here:
- Use `vuetype` all the way
- Partially apply it to the most important components with the biggest amount of tests and update it regularly
- Use `any` as a fallback


## Conclusion

The average level of `typescript` support in `Vue` ecosystem increased over the last couple of years:
- `Nuxt` firstly introduced `nuxt-ts` and now ships `ts` builds by default
- `Vue@3` will have improved `typescript` support
- More 3rd-party apps and plugins will provide type definitions

But, it is production ready at the moment. These are just things to improve! Writing type-safe `Vue` code really improves your Developer Experience and allows you to focus on the important stuff while leaving the heavy-lifting to the compiler.

What are your favorite hacks and tools to type `Vue` apps? Let's discuss it in the comment section.

{% endraw %}
