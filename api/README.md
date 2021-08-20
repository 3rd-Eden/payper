# Payper API

Run payper on your own server or use it as development tool and use our edge
functionality in production, you decide what is best for your use-case.

## Usage

The API server is bundled with `payper` module that you [previously
installed][install]. The API is available under the `payper/api` import route as
illustrated below.

```js
const Payper = require('payper/api');
```

Once you've imported the API in your server-side code you can create a new
`Payper` instance.

```js
const payper = new Payper();
```

### Adding bundles to the system

Now that the `Payper` instance has been created it needs to know which bundles
are available in the system, and how it can get access to the source of those
bundles. This is done using the `Payper#add` method. The first argument of this
method is the **unique** name of your bundle, and the second argument is an
**async** function (or normal function that returns a promise) which returns the
contents of bundle for the given **version** it's called with.

```js
payper.add('vendor', async function vendor({ version }) {
  const contents = await fs.promises.readFile(path.join(___dirname, 'bundles', `vendor-${version}.js`));

  return contents.toString('utf-8');
});
```

> **NOTE:** The code posted above is a really basic example, it doesn't involve any
> checks to see if the file is even available. This is **not recommended** in
> production environments as an unknown version (which are user controlled)
> could crash your server.

As we can see in the example above, we've registered a bundle with the name
`vendor` and assigned a function that will read the file contents from in
`bundles` folder and returns the result as **string**. 

The version number that your function receives is **user controlled**, we do not
sanitize the version number as your versioning scheme is completely up to you.
Maybe you follow semver for versioning your bundles, content hashes, or maybe
just pure chaos, what ever you've chosen it's your responsibility to validate
it.

In addition to supporting the registration of standalone bundles, we also
support a **single** catch-all handler. This catch-all handler will be called if
no handler for the specific requested bundle exists. E.g. if you already
specified a handler for `foo` than your catch-all handler will not be called for
`foo` **unless no data has been returned by the handler**. To add a catch-all
handler simply pass a single **async** function to the `Payper#add` method:

```js
payper.add(async function catchall({ name, version }) {
  const data = await lookup.inDatabase({ name, version });

  return data;
});
```

[install]: https://github.com/3rd-Eden/payper#installation
