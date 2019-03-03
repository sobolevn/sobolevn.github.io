---
layout: post
title: "Announcing docker-image-size-limit"
description: "Keep an eye on your docker image size, limit, and prevent it from growing too big."
date: 2019-03-03
tags: docker python
writing_time:
  writing: "0:30"
  proofreading: "0:10"
  decorating: "0:00"
---

![Logo](https://thepracticaldev.s3.amazonaws.com/i/tbud96yztrdmtpbc8u2f.jpeg)

Repo link: [https://github.com/wemake-services/docker-image-size-limit](https://github.com/wemake-services/docker-image-size-limit)

## My story

It was an early morning. I was drinking my first cup of tea and reviewing a pull request from another developer.

It looked pretty well. Just some new `python` dependencies to generate beautiful reports. And a bunch of new `alpine` libraries to make sure everything will work.

So, I have merged it without any hesitations.

Several hours later I have found out that our image size increased from `~200 MiB` to `~1.5 GiB` in size. This is unacceptable!

So, I have written this script to restrict the maximum image size in the future:

```bash
LIMIT=1024
IMAGE='your-image-name:latest'

SIZE="$(docker image inspect "$IMAGE" --format='{{.Size}}')"
test "$SIZE" -gt "$LIMIT" && echo 'Limit exceeded'; false
```

It is just like `js` [`size-limit`](https://github.com/ai/size-limit) library, but for `docker`.

And it worked pretty great. Now, our CI would fail on images that are bigger than our `$LIMIT`. But, do you know that we are using ["Blameless environment"](https://sobolevn.me/2018/12/blameless-environment) method? If something fails, fix it once and for all, including other projects as well. And now I have to distribute this code to all our projects by copy-pasting these four lines. And, of course, it is not how I like my code distribution.

## New project

As a result, I open-sourced this script as a standalone `python` CLI that can be distributed, installed, and used easily:

```
$ pip install docker-image-size-limit
$ disl your-image-name:label 300MiB
your-image-name:label exceeds 300MiB limit by 1200 MiB
```

And that's it.

Now, you can be sure that your image size will always be in control. Checkout out [the docs](https://github.com/wemake-services/docker-image-size-limit) for all possible options. And integrate it to your CI not to make the same mistakes I have already fixed.

