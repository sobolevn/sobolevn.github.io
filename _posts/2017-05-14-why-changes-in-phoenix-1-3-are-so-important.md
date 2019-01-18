---
layout: post
title: "Why changes in Phoenix 1.3 are so important?"
description: "Phoenix Framework always has been awesome. But it was never as awesome as the new 1.3 release."
date: 2017-05-14
tags: elixir phoenix
republished:
  medium.com: https://medium.com/wemake-services/why-changes-in-phoenix-1-3-are-so-important-2d50c9bdabb9
---

![Phoenix logo](https://cdn-images-1.medium.com/max/1200/1*THRh4--2uAqVuBM_Iab78A.png)

Phoenix Framework always has been awesome. But it was never as awesome as the new `1.3` release (which is `rc1` right now actually).

There are a lot of significant changes. Chris McCord made a great job writing a [complete migrating guide](https://gist.github.com/chrismccord/71ab10d433c98b714b75c886eff17357). Inspired by it and by the [talk](https://www.youtube.com/watch?v=tMO28ar0lW8) Chris gave at the LonestarElixir this article will try to guide through the most important changes in the phoenix project.

Let’s get started!

## Problems to solve

`phoenix` is new. And naturally it has some issues. The core team has worked really hard to solve some of the most curial ones in the newest release. So what are these issues?

### Web folder is pure magic

When working on a project using `phoenix`, you have two places for the source code: `lib/` and `web/`. The concept is:

1. Put all your business logic and utilities inside `lib/`

1. Put everything that relates with your web-interface (controllers, views, templates) inside the `web/` folder

But is that message clear enough for the developers? I don’t think so.

Where did this `web/` folder come from? Is it a `phoenix` special? Or other frameworks use it too? Should I even use `lib/` with `phoenix` projects or is it reserved for some deep magic? All these questions ran through my head after my first encounter with `phoenix`.

Before version `1.2` `web/` was the only one to auto-reload. So, why should I create any files inside `lib/` and restart a server when I can put it somewhere inside `web/` to reload quickly?

Which brings us to even more important questions: do my model files (let’s call them models in this particular context) belong to the web part of my application or to my core logic? Is it possible to separate my logic into different domains or apps (like in `django`)?

These questions are left unanswered.

### Business logic in controllers

Moreover, the boilerplate code, which comes with the `phoenix` itself, was promoting the other way of doing things. One would get these lines of code with the newly generated project:

```elixir
defmodule Example.UserController do
  use Example.Web, :controller

  # ...

  def update(conn, %{"id" => id, "user" => user_params}) do
    user = Repo.get!(User, id)
    changeset = User.changeset(user, user_params)

    case Repo.update(changeset) do
      {:ok, user} ->
        render(conn, Example.UserView, "show.json", user: user)
      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(Example.ChangesetView, "error.json", changeset: changeset)
    end
  end
end
```

What should a developer do when an email should be sent to a user after a successful update? The controller itself asks to be extended. Just put a new line of code before render/4. But that’s a wrong way of doing things. And it was kind of promoted by the `phoenix` itself.

One extra line in the controller is fine, that’s not a big deal. All the problems come when the application grows. It becomes untestable, unmaintainable, and self-repeating.

### Schemas are not models

At some point for no particular reason `ecto`'s schemas started to be called “models”. What is the difference between a “model” and a “schema”? Schema is just a way to define a structure - a database structure at this particular case. Models as a concept are much more complex than schemas. Models should provide a way to manipulate data and perform different actions, like models in `django`. `elixir` as a functional language is not suited for the “model” concept, so it was [deprecated](https://hexdocs.pm/ecto/1.1.0/Ecto.Model.html) a long time ago in the `ecto` project.

Files inside `models/` were not organized. When your application grew, it became a complete [mess](https://github.com/elixir-lang-moscow/site/tree/master/web/models). How these files are bounded? What is the context we use them in? It was hard to figure that out.

Furthermore, `models/` folder was considered as a place to [put your business logic](https://elixirforum.com/t/where-is-the-best-place-for-additional-model-functionality/3478/4), which is a normal thing to do in other languages and frameworks. We have a concept of “fat models”, with which we are already familiar. But in `phoenix` it is just one more wrong way of doing it.

## Solutions

A lot has changed since the last major release. The easiest way to show all the changes is by example.

### Requirements

This tutorial assumes that you have `elixir-1.4` up and running. No? Then [install it](http://elixir-lang.org/install.html)!

### Installation

Firstly, you would need to install new `phoenix` release:

```bash
mix archive.install https://github.com/phoenixframework/archives/raw/master/phx_new.ez
```

### Creating new project

When installation is completed, it is time to check that everything is in place. mix help will return you something like this:

```bash
mix phoenix.new       # Creates a new Phoenix v1.1.4 application

mix phx.new           # Creates a new Phoenix v1.3.0-rc.1 application using the experimental generators
```

That’s where the **first change** comes in: new generators. Old generators were named `phoenix` while the new ones are named simply `phx`. Less typing. And a new message to the developers: these generators are new, they will do new things to your codebase.

Then, it is time to create new project’s structure by running:

```bash
mix phx.new medium_phx_example --no-html --no-brunch
```

Before we see any results of this command, let’s discuss the options. `--no-html` removes some specific components so `phx.gen.html` will no longer work. But we are building `json` API and we won’t need any `html`. Similarly `--no-brunch` means: do not generate `brunch` files for static asset building. When choosing this option, you will need to manually handle JavaScript dependencies if building `html` apps.

## Changes

### Web folder

Looking at your newly generated files you may be wondering: where is the `web/` folder? Well, here is the **second change**. And it’s big. Now your web/ folder lives inside `lib/`. This `web/` folder was special; a lot of people misunderstood its main purpose, which was containing web interface for your application. It’s not a place for your business logic. Now things are clear. Put everything inside `lib/`. And put only your controllers, templates and views inside the new `web/`.

That’s how it looks:

```bash
lib
└── medium_phx_example
    ├── application.ex
    ├── repo.ex
    └── web
        ├── channels
        │   └── user_socket.ex
        ├── controllers
        ├── endpoint.ex
        ├── gettext.ex
        ├── router.ex
        ├── views
        │   ├── error_helpers.ex
        │   └── error_view.ex
        └── web.ex
```

Where `medium_phx_example` is the name of the current app. There can be many apps. So now all the code lives inside the same folder.

The **third change** will reveal itself shortly after looking at the web.ex file:

```elixir
defmodule MediumPhxExample.Web do
  def controller do
    quote do
      use Phoenix.Controller, namespace: MediumPhxExample.Web
      import Plug.Conn
      # Before 1.3 it was just:
      # import MediumPhxExample.Router.Helpers
      import MediumPhxExample.Web.Router.Helpers
      import MediumPhxExample.Web.Gettext
    end
  end

  # Some extra code:
  # ...

end
```

`phoenix` now creates `.Web` namespace for us, which pairs really well with the new folder structure.

### Creating schema

That’s the **forth change** and my favorite one so far. Previously we had a `web/models/` folder, which was used to store schemas. Now “model” concept is completely dead. A new philosophy of doing things is introduced:

1. Context is used to store multiple schemas

2. Context is used to provide a public external API. In other words, it defines what can be done to your data

3. Schema is just a description of your data

Our application would contain just one context: audios. Let’s start by creating Audio context with Album and Song schemas:

```bash
mix phx.gen.json Audio Album albums name:string release:utc_datetime

mix phx.gen.json Audio Song songs album_id:references:audio_albums name:string duration:integer
```

The syntax of this generator has also changed. Now it requires the context name to be the first argument. Also take note of the `audio_albums` notation, albums schema is prefixed with the context name. And here’s what happens to the project structure after we run two generators:

```bash
lib
└── medium_phx_example
├── application.ex
├── audio
│   ├── album.ex
│   ├── audio.ex
│   └── song.ex
├── repo.ex
└── web
    ├── channels
    │   └── user_socket.ex
    ├── controllers
    │   ├── album_controller.ex
    │   ├── fallback_controller.ex
    │   └── song_controller.ex
    ├── endpoint.ex
    ├── gettext.ex
    ├── router.ex
    ├── views
    │   ├── album_view.ex
    │   ├── changeset_view.ex
    │   ├── error_helpers.ex
    │   ├── error_view.ex
    │   └── song_view.ex
    └── web.ex
```

What are the main changes in the structures compared to the previous version?

1. Now schemas do not belong to `web/` at all

2. `models/` folder is gone

3. Schemas are now separated by context, which defines how they are bounded together

And schemas right now are nothing more than a table description. That’s what a schema is in the first place. Here’s what our schemas look like:

```elixir
# album.ex
defmodule MediumPhxExample.Audio.Album do
  use Ecto.Schema

  schema "audio_albums" do
    field :name, :string
    field :release, :utc_datetime

    timestamps()
  end
end
```

```elixir
# song.ex
defmodule MediumPhxExample.Audio.Song do
  use Ecto.Schema

  schema "audio_songs" do
    field :duration, :integer
    field :name, :string
    field :album_id, :id

    timestamps()
  end
end
```

Everything except schema declaration is gone. No `required_fields`, no `changeset/2` function or any other functions and logics. It [does not even generate](https://github.com/phoenixframework/phoenix/issues/2151) `belongs_to` for you.

So, it is pretty clear now: this is not a place for your business logic. It is all handled by the context, which looks the following way:

```elixir
# audio.ex
defmodule MediumPhxExample.Audio do
  @moduledoc """
  The boundary for the Audio system.
  """

  import Ecto.{Query, Changeset}, warn: false
  alias MediumPhxExample.Repo

  alias MediumPhxExample.Audio.Album

  def list_albums do
    Repo.all(Album)
  end

  def get_album!(id), do: Repo.get!(Album, id)

  def create_album(attrs \\ %{}) do
    %Album{}
    |> album_changeset(attrs)
    |> Repo.insert()
  end

  # ...

  defp album_changeset(%Album{} = album, attrs) do
    album
    |> cast(attrs, [:name, :release])
    |> validate_required([:name, :release])
  end

  alias MediumPhxExample.Audio.Song

  def list_songs do
    Repo.all(Song)
  end

  def get_song!(id), do: Repo.get!(Song, id)

  def create_song(attrs \\ %{}) do
    %Song{}
    |> song_changeset(attrs)
    |> Repo.insert()
  end

  # ...

  defp song_changeset(%Song{} = song, attrs) do
    song
    |> cast(attrs, [:name, :duration])
    |> validate_required([:name, :duration])
  end
end
```

It also sends a clear message: this is the place where one should put their code! But be careful, context files can grow long. Split them in several modules in that case.

### Using controller

Previously we had a lot of code in the controller by default. It was easy for a developer to extend the boilerplate code. Here comes the **fifth change**. Since the new release the boilerplate code in the controller has been reduced and refactored:

```elixir
defmodule MediumPhxExample.Web.AlbumController do
  use MediumPhxExample.Web, :controller

  alias MediumPhxExample.Audio
  alias MediumPhxExample.Audio.Album

  action_fallback MediumPhxExample.Web.FallbackController

  # ...

  def update(conn, %{"id" => id, "album" => album_params}) do
    album = Audio.get_album!(id)

    with {:ok, %Album{} = album} <- Audio.update_album(album, album_params) do
      render(conn, "show.json", album: album)
    end
  end

  # ...

end
```

There are only three meaning lines of code in the `update/2` action right now. Controllers currently use contexts directly, which makes them a very thin layer in the application. It is hard to find a place for some extra logic in the controller. Controllers do not even handle errors.

Errors are designed to be handled by a special `fallback_controller`. This new concept is the **sixth change**. It allows to have all error handlers and error codes in the one place:

```elixir
defmodule MediumPhxExample.Web.FallbackController do
  @moduledoc """
  Translates controller action results into valid `Plug.Conn` responses.
  See `Phoenix.Controller.action_fallback/1` for more details.
  """
  use MediumPhxExample.Web, :controller

  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    conn
    |> put_status(:unprocessable_entity)
    |> render(MediumPhxExample.Web.ChangesetView, "error.json", changeset: changeset)
  end

  def call(conn, {:error, :not_found}) do
    conn
    |> put_status(:not_found)
    |> render(MediumPhxExample.Web.ErrorView, :"404")
  end
end
```

What happens when the result from `Audio.update_album(album, album_params)` does not match with `{:ok, %Album{} = album}`? In this situation a controller defined in `action_fallback` is called. And a proper `call/2` is pattern matched, which returns a valid response. Nice and easy. No more exception handling in the controller.

## Conclusion

All things said the changes introduced are quite exciting. Hope this article was helpful and encouraged you to get out there and use Phoenix Framework to its maximum.
