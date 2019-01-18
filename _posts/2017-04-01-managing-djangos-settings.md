---
layout: post
title: "Managing Django’s settings"
description: "Managing Django’s settings might be tricky. There are severals issues which are encountered by any Django developer along the way."
date: 2017-04-01
tags: python django
republished:
  medium.com: https://medium.com/wemake-services/managing-djangos-settings-e2b7f496120d
  dev.to: https://dev.to/wemake-services/managing-djangos-settings-37ao
---

![django-split-settings logo](https://cdn-images-1.medium.com/max/1600/1*ogBWTa2xptrsZXMB34Pzgw.png)

Managing Django’s settings might be tricky. There are severals issues which are encountered by any Django developer along the way.

First one is caused by the default project structure. Django clearly offers us a single `settings.py` file. It seams reasonable at the first glance. And it is actually easy to use just after the start. But when it comes to the real-world it only causes misunderstanding and frustration.

At some point, you will need to put some kind of personal settings in the main file: certificate paths, your username or password, database connection, etc. But putting your user-specific values inside the common settings is a bad practice. Other developers would have other settings, and it would just not work for all of you. The most known hack for this situation is `local_settings.py`. This file is placed near the regular settings file and ignored from version control. There are also these lines which are usually put somewhere in the end of `settings.py`:

```python
try:
    from local_settings import *
except ImportError:
    # No local settings was found, skipping.
    pass
```

Looks pretty straight-forward. It is also sometimes accompanied with `local_settings.py.template`, which is version controlled, to keep your local settings structure up to date.

You would definitely need production settings sometime soon. How would you do that? Create a new file. Do you need special settings for testing? Create a new file. Staging? New file. *You would have a lot of files.*

Secondly, when you have a lot of things to configure, your settings files will become long and heavy. At this point you would start to think: maybe I could separate these values into different files and reuse them at different environments? If this thought has ever come to your mind — you should give [django-split-settings](https://github.com/sobolevn/django-split-settings) a try.

## Usage

How does `django-split-settings` solve these issues? This helper provides a user-friendly interface to store your settings in different files. Let’s look at the example. Imagine you have an existing project with `django`, `postgres`, `redis`, `rq`, and emails.

Before we start, let’s install `django-split-settings` with:

```bash
pip install django-split-settings
```

That’s what your files would look like after adopting `django-split-settings`:

```bash
your_project/settings/
├── __init__.py
├── components
│   ├── __init__.py
│   ├── database.py
│   ├── common.py
│   ├── emails.py
│   ├── rq.py
└── environments
    ├── __init__.py
    ├── development.py
    ├── local.py.template
    ├── production.py
    └── testing.py
```

That’s a clear separation of the settings based on two factors: what component they are configuring and at what environment we are working right now. And the flexibility of the library allows you to have any structure you want, not just the one described here.

In our `settings/__init__.py` we can define any logic we want. Basically, we would just define what kind of components we would like to use and select the environment. Here’s an example, we use in production for all our projects:

```python
"""
This is a django-split-settings main file.
For more information read this:
https://github.com/sobolevn/django-split-settings
Default environment is `developement`.
To change settings file:
`DJANGO_ENV=production python manage.py runserver`
"""

from split_settings.tools import optional, include
from os import environ

ENV = environ.get('DJANGO_ENV') or 'development'

base_settings = [
    'components/common.py',  # standard django settings
    'components/database.py',  # postgres
    'components/rq.py',  # redis and redis-queue
    'components/emails.py',  # smtp

    # You can even use glob:
    # 'components/*.py'

    # Select the right env:
    'environments/{0}.py'.format(ENV),
    # Optionally override some settings:
    optional('environments/local.py'),
]

# Include settings:
include(*base_settings)
```

And that’s it. Our application would run as usual. We have achieved multiple goals with so few lines of code:

1. We now have separated settings based on what they configure. Gaining readability and maintainability
2. We now have separated settings based on environment
3. We now have optional local settings with now dirty hacks
4. We did not have to do any refactoring except just some basic restructuring

We have also created a project example, which can be used as a template for your own projects: [https://github.com/wemake-services/wemake-django-template](https://github.com/wemake-services/wemake-django-template)

## What’s not covered

In a future articles we would cover two topics which are crucial when dealing with project’s configuration:

1. Secret settings
2. Dynamic settings

## Afterword

Got any ideas or feedback? Dive in, if you want to contribute:
[django-split-settings - Organize Django settings into multiple files and directories.](https://github.com/sobolevn/django-split-settings)
