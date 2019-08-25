---
layout: post
title: Deploy every commit
description: ""
date: 2019-08-24
tags: rsdp management devops
writing_time:
  writing: ""
  proofreading: ""
  decorating: ""
republished: []
---

The most accurate for this post should be "Deploy every squashed commit".

You know this trick: if something scares you - do it as much as you can.
Almost all developers I know fear deploys.
That's why we even have ["No Deploy Friday"](https://www.reddit.com/r/devops/comments/az0o7y/no_deploy_friday_is_a_hint_of_it_maturity_i_cant/)
movement.

I was one of these people.
Every deploy was a conquest: so many thing might go wrong!
It was not productive at all.
Our clients struggled to get the features and fixes they wanted.
We had problems with scheduling things internally,
we had to have sprints and release cycles.

Terrible memories!
Fortunally, we have solve this problem long ago
with the help of every commit deployment strategy.


## How does it work?

Let's imagine that you release and deploy your software once/twice a week.
It automatically means a lot of things:

### You have separate quality assurance



### You have long-lived feature branches

Long-lived feature branches are hard to review, merge, and test.
Imagine that you have two Long-lived feature branches:

1. You test and review `A`
2. You test and review `B`
3. Someone merges `A` into `master`
4. Developer has to rebase `B`
5. You test and review `B` again and pray that no one merges `C` at this time
6. You test the result of `A` + `B`

That's so ineffective!

Instead we propose to have **short-lived microtask** branches
(which is a variation of [Trunk Based Development](https://trunkbaseddevelopment.com/).
What's the difference between
short-lived microtask branches and the usual approach?

If your task is a microtask (from 15 minutes to 2 hours)
as [`RSDP`](https://wemake.services/meta/)
enforces - you can review each of them easily.
I usually spend only 5-10 minutes to review such tasks.
And of course, it is easy for developers to address reviews.
If your CI standards is high enough, developers will only concentrate on naming,
sanity, and corner cases after the review. Fast to fix, fast to get merged.

It is also easy to [rebase](https://docs.gitlab.com/ee/user/project/merge_requests/fast_forward_merge.html) your changes. They are small and recent.
Some services like Gitlab and Github even have automatic rebase mechanisms.

![Automatic rebase](https://docs.gitlab.com/ee/user/project/merge_requests/img/ff_merge_rebase.png)

Each merge becames easy:
CI passes, small review passes, branch is merged and deleted.

### You have a solid staging environment

Why do we even need

Stage servers are not cheap. Consequences:
1. You have to pay twice for the infrastructure
2. You will have two different servers with unique errors and sync problems
3. You will struggle to have all the long-lived features
   at the same time on the stage server

Instead, you can create **review apps**.
[Review apps](https://docs.gitlab.com/ee/ci/review_apps/)
are short-lived deployments to the same infrusturcture
that are used only for the review process and then killed.

![Review app](https://thepracticaldev.s3.amazonaws.com/i/0ltcc6odirhjhptq5y1t.png)

Let me show an example:
1. Developer creates feature `A` that changes the UI and logic
2. Architect reviews code and approves it
3. Designer reviews the UI change
4. Client / product owner reviews new logic and how it works

Then this app is teared down and the very same commit lands on `master`.

There are awesome tools and services to help you:
- [k8s](https://kubernetes.io/)
- [dokku](https://github.com/dokku/dokku)
- [now.sh](https://zeit.co/github)

For example, this is how to deploy review apps with [Dokku and GitlabCI](https://github.com/dokku/dokku/blob/master/docs/community/tutorials/deploying-with-gitlab-ci.md).


## Changes to the mindset

