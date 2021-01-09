---
layout: post
title: Typechecking Django and DRF
description: "Types are coming to the Django land! This posts announces TypedDjango organisation and stubs for django and djangorestframework"
date: 2019-08-25
tags: python
writing_time:
  writing: "3:00"
  proofreading: "0:30"
  decorating: "0:30"
republished:
  - link: https://dev.to/wemake-services/typechecking-django-internals-and-querysets-1m47
    language: us
---

![Post logo](https://i.imgur.com/X2EZBa3.png)

As you have [already](https://sobolevn.me/2019/02/python-exceptions-considered-an-antipattern)
[know](https://sobolevn.me/2018/07/real-python-contants)
I [love](https://sobolevn.me/2019/01/simple-dependent-types-in-python)
optional static typing.
The thing is that sometimes it is not optional, but impossible.
Because we have plenty of big untyped projects in Python's ecosystem.

Django and Django-Rest-Framework were two of them. Were.
Because now they can be typed!
Let me introduce [TypedDjango](https://github.com/typeddjango) organisation
and stubs for [`django`](https://github.com/typeddjango/django-stubs)
and [`drf`](https://github.com/typeddjango/djangorestframework-stubs).

This is going to be a concise tutorial and getting started guide.


## Kudos

I want to say a big "thank you" to [@mkurnikov](https://github.com/mkurnikov)
for leading the project and to all contributors who made this possible.
You are all awesome!


## TLDR

In this article, I am showing how types work with `django` and `drf`.
You can have a look at the [result here](https://github.com/sobolevn/django_stubs_example).

And you can also use [`wemake-django-template`](https://github.com/wemake-services/wemake-django-template) to start your new projects with everything already configured.
It will look exactly like the example project.


## Getting started

In this little tutorial, I will show you several
features of `django-stubs` and `djangorestframework-stubs` in action.
I hope this will convince you that having someone to doublecheck
things after you is a good thing.

You can always refer to the original documentation.
All the steps are also covered there.

To start we will need [a new project](https://docs.djangoproject.com/en/2.2/intro/tutorial01/#creating-a-project) and [a clean virtual environment](https://docs.python.org/3/library/venv.html), so we can install our dependencies:

```bash
pip install django django-stubs mypy
```

Then we will need to configure `mypy` correctly.
It can be split into two steps.
First, we configure the `mypy` itself:

```ini
# setup.cfg
[mypy]
# The mypy configurations: https://mypy.readthedocs.io/en/latest/config_file.html
python_version = 3.7

check_untyped_defs = True
disallow_any_generics = True
disallow_untyped_calls = True
disallow_untyped_decorators = True
ignore_errors = False
ignore_missing_imports = True
implicit_reexport = False
strict_optional = True
strict_equality = True
no_implicit_optional = True
warn_unused_ignores = True
warn_redundant_casts = True
warn_unused_configs = True
warn_unreachable = True
warn_no_return = True
```

Then we configure `django-stubs` plugin:

```ini
# setup.cfg
[mypy]
# Appending to `mypy` section:
plugins =
  mypy_django_plugin.main

[mypy.plugins.django-stubs]
django_settings_module = server.settings
```

What do we do here?
1. We add a custom `mypy` [plugin](https://mypy.readthedocs.io/en/latest/extending_mypy.html)
   to help the type checker guess types
   in some complicated Django-specific situations
   (like models, queryset, settings, etc)
2. We also add custom configuration for `django-stubs` to point it
   to the settings, we use for Django. It will need to import it.

The final result can be found [here](https://github.com/sobolevn/django_stubs_example/blob/master/setup.cfg#L78).

We now have everything installed and configured. Let's type check things!


## Typechecking views

Let's start with typing views
as it is the easiest thing to do with this plugin.

Here's our simple function-based view:

```python
# server/apps/main/views.py
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render


def index(request: HttpRequest) -> HttpResponse:
    reveal_type(request.is_ajax)
    reveal_type(request.user)
    return render(request, 'main/index.html')
```

Let's run and see what types it is aware of.
Note that we might need to modify `PYTHONPATH`,
so `mypy` would be able to import our project:

```
» PYTHONPATH="$PYTHONPATH:$PWD" mypy server
server/apps/main/views.py:14: note: Revealed type is 'def () -> builtins.bool'
server/apps/main/views.py:15: note: Revealed type is 'django.contrib.auth.models.User'
```

Let's try to break something:

```python
# server/apps/main/views.py
def index(request: HttpRequest) -> HttpResponse:
    return render(request.META, 'main/index.html')
```

Nope, there's a typo and `mypy` will catch it:

```
» PYTHONPATH="$PYTHONPATH:$PWD" mypy server
server/apps/main/views.py:18: error: Argument 1 to "render" has incompatible type "Dict[str, Any]"; expected "HttpRequest"
```

It works! Ok, but that is pretty straight-forward.
Let's complicate our example a little bit and create a custom model
to show how can we type models and querysets.


## Typechecking models and queryset

Django's ORM is a killer-feature. It is very flexible and dynamic.
It also means that it is hard to type.
Let's see some features that are already covered by `django-stubs`.

Our model definition:

```python
# server/apps/main/models.py
from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()

class BlogPost(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE)

    text = models.TextField()

    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        reveal_type(self.id)  # example reveal of all fields in a model
        reveal_type(self.author)
        reveal_type(self.text)
        reveal_type(self.is_published)
        reveal_type(self.created_at)
        return '<BlogPost {0}>'.format(self.id)
```

And every field of this model is covered by `django-stubs`.
Let's see what types are revealed:

```
» PYTHONPATH="$PYTHONPATH:$PWD" mypy server
server/apps/main/models.py:21: note: Revealed type is 'builtins.int*'
server/apps/main/models.py:22: note: Revealed type is 'django.contrib.auth.models.User*'
server/apps/main/models.py:23: note: Revealed type is 'builtins.str*'
server/apps/main/models.py:24: note: Revealed type is 'builtins.bool*'
server/apps/main/models.py:25: note: Revealed type is 'datetime.datetime*'
```

Everything looks good! `django-stubs` provides a custom `mypy` plugin
to convert model fields into correct instance types.
That's why all types are correctly revealed.

The second big feature of `django-stubs` plugin is that we can type `QuerySet`:

```python
# server/apps/main/logic/repo.py
from django.db.models.query import QuerySet

from server.apps.main.models import BlogPost

def published_posts() -> 'QuerySet[BlogPost]':  # works fine!
    return BlogPost.objects.filter(
        is_published=True,
    )
```

And here's how it can be checked:

```python
reveal_type(published_posts().first())
# => Union[server.apps.main.models.BlogPost*, None]
```

We can even annotate querysets with `.values()` and `.values_list()` calls.
This plugin is smart!

I have struggled with annotating methods returning `QuerySet`s
for several years. This feature solves a big problem for me:
no more `Iterable[BlogPost]` or `List[User]`.
I can now use real types.


## Typechecking APIs

But, typing views, models, forms, commands, urls, and admin is not all we have.
TypedDjango also has typings for `djangorestframework`.
Let's install and configure it:

```bash
pip install djangorestframework djangorestframework-stubs
```

Let's also add a new `mypy` plugin:

```ini
[mypy]
plugins =
  mypy_django_plugin.main,
  mypy_drf_plugin.main  # new!
```

Then we can start to create serializers:

```python
# server/apps/main/serializers.py
from rest_framework import serializers

from server.apps.main.models import BlogPost, User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email']

class BlogPostSerializer(serializers.HyperlinkedModelSerializer):
    author = UserSerializer()

    class Meta:
        model = BlogPost
        fields = ['author', 'text', 'is_published', 'created_at']
```

Views:

```python
# server/apps/main/views.py
from rest_framework import viewsets

from server.apps.main.serializers import BlogPostSerializer
from server.apps.main.models import BlogPost

class BlogPostViewset(viewsets.ModelViewSet):
    serializer_class = BlogPostSerializer
    queryset = BlogPost.objects.all()
```

And routers:

```python
# server/apps/main/urls.py
from django.urls import path, include
from rest_framework import routers

from server.apps.main.views import BlogPostViewset, index

router = routers.DefaultRouter()
router.register(r'posts', BlogPostViewset)

urlpatterns = [
    path('', include(router.urls)),
    # ...
]
```

It does not even look like something has changed, but
everything inside is typed: settings, serializers, viewsets, and routers.
It will allow you to incrementally add typings where you need them the most.

Let's try to change `queryset = BlogPost.objects.all()`
to `queryset = [1, 2, 3]` in our views:

```
» PYTHONPATH="$PYTHONPATH:$PWD" mypy server
server/apps/main/views.py:25: error: Incompatible types in assignment (expression has type "List[int]", base class "GenericAPIView" defined the type as "Optional[QuerySet[Any]]")
```

No, it won't work! Fix your code!


## Conclusion

Typing the framework interfaces is an awesome thing to have.
When combined with tools like [`returns`](https://github.com/dry-python/returns)
and [`mappers`](https://github.com/dry-python/mappers)
it will allow writing type-safe and declarative business logic wrapped
into typed framework interfaces.
And to decrease the number of errors in the layer between these two.

Optional gradual static typing also allows you to start fast
and add types only when your API is stabilized
or go with types-driven development from the very start.

However, `django-stubs` and `djangorestframework-stubs` are new projects.
There are still a lot of bugs, planned features, missing type specs.
We welcome every contribution from the community
to make the developer tooling in Python truly awesome.
