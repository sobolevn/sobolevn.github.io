---
layout: post
title: "Creating slugs for Ecto schemas"
description: What is a slug?
date: 2017-07-19
tags: elixir
republished:
  medium.com: https://medium.com/wemake-services/creating-slugs-for-ecto-schemas-7349513410f0
---

## What is a slug?

The term “slug” comes from the world of newspaper production. If you have ever created a simple “Blog” application you have already reinvented it.

When you need to access any post at some URL you need to identify it somehow. The simplest idea is to identify them by id, but that does not seem too pretty.
It would be better to identify your posts based on its title or content.
So, a blog post with a title “Creating slugs for Ecto models” would be accessible via a nice-looking URL: `myapp.com/posts/creating-slugs-for-ecto-models`. Where `creating-slugs-for-ecto-models` is a slug. Pretty cool, isn’t it?

> So, a slug is a good-looking web-safe unique string used to identify some data.

Creating slugs is so common, that we have actually created a utility library to generate slugs based on some other fields.
We called it [ecto_autoslug_field](https://github.com/sobolevn/ecto_autoslug_field).

## How does EctoAutoslugField work?

Imagine that you have a simple Article schema inside Blog context.
That’s how it looks like freshly out of the generator:

```elixir
defmodule EctoSlugs.Blog.Article do
  use Ecto.Schema
  import Ecto.Changeset
  alias EctoSlugs.Blog.Article

  schema "blog_articles" do
    field :breaking, :boolean, default: false
    field :content, :string
    field :title, :string

    timestamps()
  end

  @doc false
  def changeset(%Article{} = article, attrs) do
    article
    |> cast(attrs, [:title, :content, :breaking])
    |> validate_required([:title, :content])
    |> unique_constraint(:title)
  end
end
```

It has just three meaning-full fields: `:title` which is unique, `:content`, and if this article has some `:breaking` news in it which is set to false by default.

Now you want to generate a slug from the title.

### Installation

Firstly, add `{:ecto_autoslug_field, “~> 0.3”}` to your `mix.exs`.
Then fetch the dependencies with mix deps.get.

Then you will need to add a new field to your schema. Let’s call it `:slug`.

```elixir
defmodule EctoSlugs.Blog.Article do
  use Ecto.Schema
  import Ecto.Changeset
  alias EctoSlugs.Blog.Article
  alias EctoSlugs.Blog.Article.TitleSlug

  schema "blog_articles" do
    field :breaking, :boolean, default: false
    field :content, :string
    field :title, :string

    field :slug, TitleSlug.Type

    timestamps()
  end

  @doc false
  def changeset(%Article{} = article, attrs) do
    article
    |> cast(attrs, [:title, :content, :breaking])
    |> validate_required([:title, :content])
    |> unique_constraint(:title)
    |> TitleSlug.maybe_generate_slug
    |> TitleSlug.unique_constraint
  end
end
```

Take a close note on this `TitleSlug` used everywhere.
That would be a slug field module. But right now it does not exist.
We will implement it later.

You will also need to add a new migration. It would be something like this:

```elixir
defmodule EctoSlugs.Repo.Migrations.CreateEctoSlugs.Blog.Article do
  use Ecto.Migration

  def change do
    alter table(:blog_articles) do
      add :slug, :string
    end

    create unique_index(:blog_articles, [:slug]) # should be unique
  end
end
```

### Simple example

Remember, that we did not implement `TitleSlug` yet? Let’s decide what it should look like. The first use case is the simplest one. When an article is created, generate a slug from it’s title. Do nothing more.

```elixir
defmodule EctoSlugs.Blog.Article.TitleSlug do
  use EctoAutoslugField.Slug, from: :title, to: :slug
end
```

That’s it. It takes a value from `:from` field and puts changes into `:to` field. But maybe that’s not what you want? Let’s step it up.

### Conditional example

Imagine that you have a business rule: put “breaking” in front of every breaking news article’s slug. How could you achieve that?

```elixir
defmodule EctoSlugs.Blog.Article.TitleSlug do
  use EctoAutoslugField.Slug, to: :slug

  import Ecto.Changeset

  def get_sources(changeset, _opts) do
    # This function is used to get sources to build slug from:
    base_fields = [:title]

    if get_change(changeset, :breaking, false) do
      ["breaking"] ++ base_fields
    else
      base_fields
    end
  end
end
```

Note, that right now we don’t use :from option anymore, instead, we are using a `get_sources/2` function.
What does it do? When creating an article it will provide conditional sources for the slug.
And since it has access to the changeset struct the possibilities are endless.
The logic itself is also pretty simple.
When changeset has `:breaking` key set to true prepend “breaking” to the sources list.
Your business rule is now satisfied, let’s move on.

### Modify the slug

Or maybe you have a different use case?
The business wants your slugs to be joined differently.
So you need to modify the resulting slug. How to do that?

```elixir
defmodule EctoSlugs.Blog.Article.TitleSlug do
  use EctoAutoslugField.Slug, from: :title, to: :slug

  def build_slug(sources, _changeset) do
    sources
    |> super()
    |> String.replace("-", "+")
  end
end
```

It is possible to define a custom `build_slug/2` function which accepts two arguments: the list of sources and the initial changeset.
This function is designed to build and return the slug before it is saved to the database.
This `super()` call transforms your list of sources into the slug-string.

But before the slug is returned you can do multiple things:

* check either your slug is unique, if not — increment it somehow
* modify your slug
* or even build the slug yourself without this magic `super()` call

And of course, you can use this function alongside the `get_sources/2`.

## Conclusion

That’s a short introduction to `ecto_autoslug_field`.

But that’s not even all its features covered! There are more options and possibilities.
Like, recreating slug on every save with `:always_change` option and others.
We have tried to cover everything inside documentation and it is [available online](https://hexdocs.pm/ecto_autoslug_field/readme.html).

Check `ecto_autoslug_field` out:
[ecto_autoslug_field - Automatically create slugs for Ecto schemas.](https://github.com/sobolevn/ecto_autoslug_field)

## Gratis

Special thanks to @h4cc for creating [slugger](https://github.com/h4cc/slugger) which we rely on.
