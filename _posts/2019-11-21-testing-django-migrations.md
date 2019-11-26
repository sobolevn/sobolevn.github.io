---
layout: post
title: Testing Django Migrations
description: "When migrating schema and data in Django multiple things can go wrong. It is better to test what you are doing in advance."
date: 2019-10-13
tags: python django
writing_time:
 writing: "0:40"
 proofreading: "0:15"
 decorating: "0:00"
republished: []
---

Dear internet,

Today we have screwed up by applying a broken migration to the running production service and causing a massive outage for several hours... Because the rollback function was terribly broken as well.

As a result, we had to restore a backup that was made several hours ago, losing some new data.


## Why did it happen?

The easiest answer is just to say: "Because it is X's fault! He is the author of this migration, he should learn how databases work". But, it is counterproductive.

Instead, as a part of our ["Blameless environment"](https://sobolevn.me/2018/12/blameless-environment) culture, we tend to put all the guilt on the CI. It was the CI who put the broken code into the `master` branch. So, we need to improve it!

We always [write post-mortems](https://sobolevn.me/2019/01/how-to-fix-a-bug) for all massive incidents that we experience. And we write regression tests for all bugs, so they won't happen again. But, this situation was different, since it was a broken migration that worked during the CI process, and it was hard or impossible to test with the current set of instruments.

So, let me explain the steps we took to solve this riddle.


## Existing setup

We use a very strict [`django` project setup](https://github.com/wemake-services/wemake-django-template) with several quality checks for our migrations:

1. We write all data migration as typed functions in our main source code. Then we check everything with `mypy` and test as regular functions
2. We lint migration files with [`wemake-python-styleguide`](https://github.com/wemake-services/wemake-python-styleguide), it drastically reduces the possibility of bad code inside the migration files
3. We use tests that automatically set up the database by applying all migrations before each session
4. We use [`django-migration-linter`](https://github.com/3YOURMIND/django-migration-linter) to find migrations that are not suited for zero-time deployments
5. And then we review the code by two senior people
6. Then we test everything manually with the help of the review apps

And somehow it is still not enough: our server was dead.

When writing the post-mortem for this bug, I spotted that data in our staging and production services were different. And that's why our data migration crushed and left one of the core tables in the broken state.

So, how can we test migrations on some existing data?


## django-test-migrations

That's where [`django-test-migrations`](https://github.com/wemake-services/django-test-migrations) comes in handy.

The idea of this project is simple:

1. Set some migration as a starting point
2. Create some model's data that you want to test
3. Run the new migration that you are testing
4. Assert the results!

Let's illustrate it with some code samples.
Full source code is [available here](https://github.com/wemake-services/django-test-migrations/tree/master/django_test_app).

Here's the latest version of our model:

```python
class SomeItem(models.Model):
    """We use this model for testing migrations."""

    string_field = models.CharField(max_length=50)
    is_clean = models.BooleanField()
```

This is a pretty simple model that serves only one purpose: to illustrate the problem. `is_clean` field is related to the contents of `string_field` in some manner.
While the `string_field` itself contains only regular text data.

Imagine that you have a data migration that looks like so:

```python
def _is_clean_item(instance: 'SomeItem') -> bool:
    """
    Pure function to the actual migration.

    Idealy, it should be moved to ``main_app/logic/migrations``.
    But, as an example it is easier to read them together.
    """
    return ' ' not in instance.string_field

def _set_clean_flag(apps, schema_editor):
    """
    Performs the data-migration.

    We can't import the ``SomeItem`` model directly as it may be a newer
    version than this migration expects.

    We are using ``.all()`` because
    we don't have a lot of ``SomeItem`` instances.
    In real-life you should not do that.
    """
    SomeItem = apps.get_model('main_app', 'SomeItem')
    for instance in SomeItem.objects.all():
        instance.is_clean = _is_clean_item(instance)
        instance.save(update_fields=['is_clean'])

def _remove_clean_flags(apps, schema_editor):
    """
    This is just a noop example of a rollback function.

    It is not used in our simple case,
    but it should be implemented for more complex scenarios.
    """

class Migration(migrations.Migration):
    dependencies = [
        ('main_app', '0002_someitem_is_clean'),
    ]

    operations = [
        migrations.RunPython(_set_clean_flag, _remove_clean_flags),
    ]
```

And here's how we are going to test this migration. At first, we will have to set some migration as a starting point:

```python
old_state = migrator.before(('main_app', '0002_someitem_is_clean'))
```

Then we have to get the model class. We cannot use direct `import` from `models` because the model might be different, since migrations change them from our stored definition:

```python
SomeItem = old_state.apps.get_model('main_app', 'SomeItem')
```

Then we need to create some data that we want to test:

```python
# One instance will be `clean`, the other won't be:
SomeItem.objects.create(string_field='a') # clean
SomeItem.objects.create(string_field='a b') # contains whitespace, is not clean
```

Then we will run the migration that we are testing and get the new project state:

```python
new_state = migrator.after(('main_app', '0003_auto_20191119_2125'))
SomeItem = new_state.apps.get_model('main_app', 'SomeItem')
```

And the last step: we need to make some assertions on the resulting data.
We have created two model instances before: one clean and one with the whitespace. So, let's check that:

```python
assert SomeItem.objects.count() == 2
# One instance is clean, the other is not:
assert SomeItem.objects.filter(is_clean=True).count() == 1
assert SomeItem.objects.filter(is_clean=False).count() == 1
```

And that's how it works! Now we have an ability to test our schema and data transformations with ease. Complete test example:

```python
@pytest.mark.django_db
def test_main_migration0002(migrator):
    """Ensures that the second migration works."""
    old_state = migrator.before(('main_app', '0002_someitem_is_clean'))
    SomeItem = old_state.apps.get_model('main_app', 'SomeItem')
    # One instance will be `clean`, the other won't be:
    SomeItem.objects.create(string_field='a')
    SomeItem.objects.create(string_field='a b')

    assert SomeItem.objects.count() == 2
    assert SomeItem.objects.filter(is_clean=True).count() == 2

    new_state = migrator.after(('main_app', '0003_auto_20191119_2125'))
    SomeItem = new_state.apps.get_model('main_app', 'SomeItem')

    assert SomeItem.objects.count() == 2
    # One instance is clean, the other is not:
    assert SomeItem.objects.filter(is_clean=True).count() == 1
```

By the way, we also support raw [`unittest` cases](https://github.com/wemake-services/django-test-migrations#unittest).


## Conclusion

Don't be sure about your migrations. Test them!

You can test forward and rollback migrations and their [ordering](https://github.com/wemake-services/django-test-migrations#testing-migrations-ordering) with the help of `django-test-migrations`. It is simple, frienly, and already works with the test framework of your choice.

I also want to say "thank you" to [these awesome people](https://github.com/wemake-services/django-test-migrations#credits). Without their work it whould take me much longer to come up with the working solution.
