# sobolevn.github.io

> sobolevn's personal page

This is just a simple web page to cover my email's domain.

However, I use `nuxt.js` for this, which is awesome.
Except the bundle size (almost 600kb). 

Here's a quick preview:

![sobolevn's personal page](https://raw.githubusercontent.com/sobolevn/sobolevn.github.io/master/preview.png)


## Build Setup

``` bash
# install dependencies
$ yarn install

# serve with hot reload at localhost:3000
$ npm run dev

# build for production and launch server
$ npm run build
$ npm start

# generate static project
$ npm run generate
```


## Deploying 

I use this hack to deploy my static site on `gh-pages`:

```bash
# from `nuxt` brunch
$ git subtree push --prefix dist origin master
```

For detailed explanation on how things work, checkout the [Nuxt.js docs](https://github.com/nuxt/nuxt.js).
