# Payper Server

Run Payper on your own server or use it as development tool and use our edge
functionality in production, you decide what is best for your use-case.

## Usage

The server is bundled with `payper` module that you [previously installed][install]. 
The API is available under the `payper/api` import route as illustrated below.

```js
const Payper = require('payper/server');
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

### Intercepting the Payper HTTP requests

To make this work we'll be using the following API methods:

- [matches](#matches)
- [concat](#concat)

#### matches

Checks if the request needs to be handled by the Payper system. It accepts an
object with a `url` and `method` as properties. It returns a boolean indicating
if Payper should handle the request.

The following is an example where we use the incoming HTTP request of Node.js
to see if the request needs to be handled:

```js
http.createServer(function (req, res) {
  if (payper.matches(req)) {
    // do stuff
  }
})
```

#### concat

It accepts the `/payper/{more paths here}` URL as first argument. The `concat`
method is an **asynchronous** function and should be called with `await` or
processed as Promise.

The function returns a formatted bundle that matches our Service Workers
expectations in terms of formatting and structure. This result should be send
back as response to the incoming HTTP request. It's worth noting that this is a
JavaScript bundle and that the appropriate `Content-Type` headers needs to be
set to `text/javascript` in order to correctly executed in the browser.

```js
const response = await payper.concat(request);
```

### Framework integration

If you want to see a working implementation of these framework integrations
checkout our [sandbox] application which demonstrates the of Payper into any
application.

#### Express

```js
const Payper = require('payper/api');
const express = require('express');
const app = express();

//
// Setup your Payper instance and add the bundles your application uses.
//
const payper = new Payper();
payper.add('vendor', async function () {
  // your bundle retrieval logic here
});

//
// Declare the Payper route we need to respond to, that is `/payper/*` using a
// wildcard so all paths after `/payper/` are send with the request.
//
app.get('/payper/*', async function intercept(req, res) {
  const response = await payper.concat(res);

  res.set('Content-Type', 'text/javascript');
  res.send(response);
});

app.listen(3000, function listen() {
  console.log('Example app listening at http://localhost:3000')
});
```

#### Fastify

```js
const fastify = require('fastify')({ logger: true });
const Payper = require('payper/api');

//
// Setup your Payper instance and add the bundles your application uses.
//
const payper = new Payper();
payper.add('vendor', async function () {
  // your bundle retrieval logic here
});

//
// Declare the Payper route we need to respond to, that is `/payper/*` using a
// wildcard so all paths after `/payper/` are send with the request.
//
fastify.get('/payper/*', async intercept(request, reply) {
  const response = await payper.concat(requested);

  reply
    .type('text/javascript')
    .send(response);
});

(async function start() {
  try {
    await fastify.listen(3000);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
})();
```

[install]: https://github.com/3rd-Eden/payper#installation
[sandbox]: https://github.com/3rd-Eden/payper/tree/main/sandbox
