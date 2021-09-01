# Payper Server

Run Payper on your own server, use it as development tool, and use our edge
functionality in production, you decide what is best for your use-case.

The Payper Server bundles your bundles into a single request but is cached
individually in the browser using the [Payper Worker][worker].

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

The instances accepts an `Object` with the following properties for further
customization.

- `path` Name of the path that your want the server to be registered on.
  Defaults to `payper`, so it intercepts requests from `/payper/` based paths.
- `logger` A logger object that follows the `console` API. Defaults to
  `console`.

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
it. To given an example, consider the following requests:

```
/payper/vendor@2001.23.1
/payper/vendor@lol-this-is-also-considered-a-function
/payper/vendor@af23281
```

Everything that you see after the `@` will be passed as **string** into your
assigned bundle handler. Assume that bad actors exist and validate if the
received version matches your expected format, and that the version actually
exists. When this is not the case, either return `null`, `undefined`, `false`
or an empty string to either forward it to your [catch-all] handler or trigger a
404 [missing] response. Alternatively throwing an error will trigger a 500
[failure] response. It's worth noting that the only requirement we set is that
the received URL matches the following Regular Expression
`/payper/[\\._\\@\\-a-z0-9]+`.

#### One for all, all for one

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
- [intercept](#intercept)

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

#### intercept

This is a combination of both methods, but writes the response. This is only
meant for **development** purposes as this function is **not optimized for
production**. It simply writes the `response` from the [concat](#concat) method
and sets a `200` statusCode, but it's a great way to just get started. The
method accepts the incomming HTTP rquest and out outgoing HTTP response as
arguments. It returns a `boolean` as indicator if the request is intercepted.

```js
http.createServer(function (req, res) {
  if (payper.intercept(req)) return;

  res.writeHead(404, {
    'Content-Type': 'text/plain',
  });

  res.end('Not Found');
});
```

### Requesting the bundles

Once your Payper Server is running you can start requesting the bundles that
you've previously registered with the server. We assume that the `name` and
`version` of the bundle are separated using the `@` symbol and that path that
you request the bundle from is `/payper/` unless configured otherwise. To
request the `vendor` bundle with version `ea2z89f` add the
following script tag to your webapp:

```
<script src="/payper/vendor@ea2z89f"></script>
```

When you want to request more bundles in a single request simply threat each
bundle as their own path in the URL:

```
/payper/react@17/react-dom@17/react-intl@5.20.11
```

Remember that order of execution of these bundles might matter. The bundles
will be included in the order that you specified in the path:

```
/payper/accordion@12.1/button@12.4/spinner@2.09
```

The example above would result in a the following response file structure:

```
|----------------|
| accordion@12.1 |
|----------------|
|   button@12.4  |
|----------------|
|  spinner@2.09  |
|----------------|
```

It's worth noting that URL limits do exist in browsers, but start around
2000 characters, and at that point you're including so many bundles in a
single request that it might make sense to split them up anyways to promote
more parallel loading assets.

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

A working version of these, and many other examples can be found in our
[Sandbox Application][sandbox].

[install]: https://github.com/3rd-Eden/payper#installation
[sandbox]: https://github.com/3rd-Eden/payper/tree/main/sandbox
[worker]: https://github.com/3rd-Eden/payper/tree/main/worker
[missing]: https://github.com/3rd-Eden/payper#missing
[missing]: https://github.com/3rd-Eden/payper#failure
