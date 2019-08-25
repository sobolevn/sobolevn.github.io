---
layout: post
title: Engineering guide to writing correct User Stories
description: "Agile people are obsessed with writing user stories. And it is a very powerful instrument indeed. But, from my practice, a lot of people are doing it wrong. Let's learn how to do it correctly. Including proper verification and mapping to the source code."
date: 2019-02-23
tags: rsdp requirements python
writing_time:
  writing: "3:00"
  proofreading: "1:30"
  decorating: "0:30"
republished:
  - resource: dev.to
    link: https://dev.to/wemake-services/engineering-guide-to-writing-correct-user-stories-1i7f
    language: us
  - resource: hackernoon.com
    link: https://hackernoon.com/engineering-guide-to-writing-correct-user-stories-238bb2a2b6e0
    language: us
---

![Logo](https://thepracticaldev.s3.amazonaws.com/i/3p0vlvdavfjlwr3neiw8.png)

Agile people are obsessed with writing user stories. And it is a powerful instrument indeed. But, from [my practice](https://wemake.services/meta/rsdp/audits/) a lot of people are doing it wrong.

Let's see an example:

```
As a user
I want to receive issue webhooks from Gitlab
So that I can list all current tasks
```

Seems like a valid user story, doesn't it? In fact, this tiny story contains multiple issues. And if you cannot find at least 8 mistakes in it - this article will be worth reading for you.

This article is split into three main parts:
1. Getting better with the default user story format
2. Rewriting user stories with BDD to make them verifiable
3. Linking user stories with tests, source code, and documentation

While some parts might look more interesting to different categories of readers, it is important for everyone to understand the full approach.


## Spotting and fixing problems

As we all know all our requirements must be [correct, unambiguous, complete, consistent, ranked, verifiable, modifiable, and traceable](https://standards.ieee.org/standard/830-1998.html) even if they do not look like requirements at the first glance.

User stories tend not to have some of the given characteristics. We need to fix that.

### Using consistent language

Is "receive issue webhooks" and "list all current tasks" somehow connected?
Are "tasks" and "issues" the same thing or not? It might be completely different things or just bad wording. How do we know?

That's what glossaries are for! Every project should start with defining specific terms that will build ubiquitous language for the future. How do we build this glossary in the first place? We ask domain experts. When we encounter a new term: we make sure that all domain experts understand this term correctly and similarly. We should also take care that the same term might be understood differently in different situations and contexts.

Let's say that in our case after consulting a domain expert we have found out that "task" is the same thing as "issue". We now need to remove the incorrect term.

```diff
As a user
I want to receive issue webhooks from Gitlab
+++So that I can list all current issues
---So that I can list all current tasks
```

Excellent. Using the same words for the same entities is going to make our requirements more clear and consistent.

### Users do not want your stuff

When we have modified the last line it caught my attention that a goal of the user is to "list all current issues". Why does this poor user want to list some issues? What is the point in doing it? No users want that. This requirement is simply incorrect.

This is an indicator of a very important problem in writing requirements. We tend to mix our and user's goals. And while our goal is to please our users, we should concentrate on them in the first place. Making their needs value more than ours. And we should explicitly express that in our requirements.

How do we know what the user wants? Again, we don't. We need to consult real users or their representatives about it. Or make a hypothesis yourself if we cannot ask anyone.

```diff
As a user
I want to receive issue webhooks from Gitlab
+++So that I can overview and track the issues' progress
---So that I can list all current issues
```

After collecting more feedback we know, that our users need to know the progress of a project. Not listing issues. That's why we need to receive and store information about issues from the third-party service.

### Removing technical details

Have you ever met a single person who literally wants to "receive issue webhooks"?
No one wants to do that. In this case, we also mix two different concerns together.

There's a clear separation between user's goals and technical ways to achieve them. And "to receive issue webhooks" is clearly an implementation detail. Tomorrow it can be changed to WebSockets, push notifications, etc. And the user's goal will not change because of that.

```diff
As a user
+++I want to have up-to-date information about Gitlab issues
---I want to receive issue webhooks from Gitlab
So that I can overview and track the issues' progress
```

See? Only important information is left, implementation details are stripped away.

### Clarifying roles

Just by the context, it is pretty clear that we are dealing with some kind of developer-related tool. We use Gitlab and issue management. So, it would be not hard to guess that we will have different kinds of users: juniors, middle devs, and seniors. Maybe project managers and other people as well.

So, we come to the roles definitions. All projects have different types of users. Even if you think that are no explicit types. These roles can form depending on the way or goal of why your product is used. And these roles must be defined the same way we define terms for the project.

What kind of users are we talking about in this particular user story? Will junior devs overview and track the progress the same way as project managers and architects? Obviously, not.

```diff
+++As an architect
---As a user
I want to have up-to-date information about Gitlab issues
So that I can overview and track the issues' progress
```

After making an intelligent guess we can separate different user stories by different user roles. And it gives us fine-grained control over the features we ship and whom we ship these features too.


## Extending user stories

This simple `As a <role or persona>, I want <goal/need> so that <why>` is great, since it is succinct and powerful at the same time. It gives us a perfect way to communicate. However, there are several disadvantages of the following format we should - at least - know about.

### Making user stories verifiable

The problem with given user story that we still have is that it is not verifiable.
How can we be sure that this story (now or still) works for our users? We cannot.

There is no clear mapping between this user story and our tests. It would be awesome if one can write user stories as tests...

Wait, but it is possible! That's why we have [Behavior-driven development](https://en.wikipedia.org/wiki/Behavior-driven_development) and `gherkin` language. That's why [BDD was created in the first place](https://cucumber.io/blog/2014/03/03/the-worlds-most-misunderstood-collaboration-tool). It means that we can rewrite our user story in the `gherkin` format to make it verifiable.

```gherkin
Feature: Tracking issues' progress
  As an architect
  I want to have up-to-date information about Gitlab issues
  So that I can overview and track the issues' progress

  Scenario: new valid issue webhook is received
    Given issue webhook is valid
    When it is received
    Then a new issue is created
```

Now, this user story is verifiable. We can literally use it as a test and track its status. Moreover, we now have a mapping between our higher-order requirement and an implementation detail which will allow us to understand how exactly we are going to fulfill this requirement. Notice, we do not replace the business requirement with implementation details, but we *complement* it.

### Spotting the incompleteness

Once we used `gherkin` to write our user stories we started to write scenarios for our user stories. And we found out that there might be several scenarios for the same user story.

Let's take a look at the first scenario we made: "new valid issue webhook is received". Wait, but what will happen when we receive an invalid webhook? Should we still save this issue or not? Maybe we will need to do some extra work as well?

Let's consult [Gitlab's documentation](https://docs.gitlab.com/ee/user/project/integrations/webhooks.html) as a source of the information what can go wrong and what to do in these cases.

Turns out we have two different invalid cases that we need to handle differently.
First one: Gitlab accidentally sends us some garbage. Second one: our authentication tokens do not match.

![Gitlab webhooks](https://thepracticaldev.s3.amazonaws.com/i/iglagw03ngpwu3fo88i4.png)

Now we can add two more scenarios to make this user story complete.

```gherkin
Feature: Tracking issues progress
  As an architect
  I want to have up-to-date information about Gitlab issues
  So that I can overview and track the issues' progress

  Scenario: new valid issue webhook is received
    Given issue webhook is valid
    And issue webhook is authenticated
    When it is received
    Then a new issue is created

  Scenario: new invalid issue webhook is received
    Given issue webhook is not valid
    When it is received
    Then no issue is created

  Scenario: new valid unauthenticated issue webhook is received
    Given issue webhook is valid
    And issue webhook is not authenticated
    When it is received
    Then no issue is created
    And webhook data is saved for future investigation
```

I like how this simple user story now feels like a quite complex one. Because it reveals its internal complexity to us. And we can adjust our development process to the growing complexity.

### Ranking user stories

Currently, it is not clear how important it is for architects to "overview and track issues' progress". Is it more important than other user stories we have? Since it looks rather complex maybe we can do something easier and more important instead?

Ranking and prioritization are crucial to any product and we cannot ignore it. Even if we have user stories as the only way to write requirements. There are different methods to prioritize your requirements, but we recommend to stick to [MoSCoW method](https://wemake.services/meta/rsdp/requirements-analysis/#requirements-prioritization). This simple method is based on four main categories: `must`, `should`, `could`, and `won't`. And implies that we will have a separate prioritized table of all user stories in a project somewhere in the documentation.

And again, we need to ask users about how important each feature is.

After several conversations with different architects that work with our product we have found out that this is an absolute `must`:

| Feature                                                        | Priority |
|----------------------------------------------------------------|:--------:|
| Authenticated users must be able to send private messages      |   Must   |
| Architects must track issues' progress                         |   Must   |
| There should be a notification about incoming private message  |  Should  |
| Multiple message providers could be supported                  |   Could  |
| Encrypted private messages won't be supported                  |   Won't  |

So, we can now modify the user story's name to map it to the prioritized feature:

```gherkin
Feature: Architects must track issues' progress
  As an architect
  I want to have up-to-date information about Gitlab issues
  So that I can overview and track the issues' progress

  ...
```

We can even link them together. Just use hyperlinks from your ranked requirements table to the feature file with the user story.

This way we can be sure that this feature will be one of the first one to be developed since it has the highest priority.


## Linking everything together

Without proper care, you will soon end with a mess of user stories, tests, source code, and documentation. With the constant growth of your project, it will be impossible to tell which parts of the application are responsible for what business use-cases. To overcome this problem we have to link everything together: requirements, source code, tests, and docs. Our goal is to end up with something like this:

![Linking everything together](https://thepracticaldev.s3.amazonaws.com/i/j1pko4hb4s1ua9kmehv9.png)

I will use `python` to illustrate the principle.

I can define use-cases as a set of unique high-level actions your app can perform (it looks pretty similar to [Clean Architecture](http://www.plainionist.net/Implementing-Clean-Architecture-UseCases/)'s point of view).

I usually define a package called `usecases` and put everything inside so it would be easy to overlook all existing use-cases at once. Each file contains a simple class (or a function) that looks like so:

```python
class CreateNewIssueFromWebhook(object):
    """
    Creates new :term:`issue` from the incoming webhook payloads.

    .. literalinclude:: path/to/your/bdd/user-story/file
      :language: gherkin

    .. versionadded:: 0.2.0
    """

    def __call__(self, webhook_payload: 'WebhookPayload') -> 'Issue':
        # Do something ...
```

I use `sphinx` and [`literalinclude` directive](https://www.sphinx-doc.org/en/master/usage/restructuredtext/directives.html#directive-literalinclude) to include the same file we use for tests to document the domain logic. I also use the glossary to indicate that `issue` is not just a random word: it is a specific [term](http://www.sphinx-doc.org/en/latest/usage/restructuredtext/roles.html?highlight=term#role-term) that we use in this project.

This way our tests, code, and docs will be as coupled as possible.
And we will need to worry less about them. We can even automate this process and check that all classes inside `usecases/` have `.. literalinclude` directive in their docs.

You can also use this class to test our user story. This way you will bind requirements, tests, and the actual domain logic implementing this user story.

Job done!

## Conclusion

This guide will help you to write better user stories, focus on their needs, keeping your source code clean, and reusing as much as we can for different (but similar) purposes.
