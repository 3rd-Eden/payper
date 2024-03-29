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

It accepts the `/payper/{more paths here}` URL as first argument. The second
argument can be an optional object that passes additional information to the
bundle handlers it's about to invoke. The `concat` method is an **asynchronous**
function and should be called with `await` or processed as Promise.

```js
payper.add('example', async function ({ browser, version }) {
  if (browser == 'ie') return await specificIEBundle();

  // do handler stuff as specified above
});

await payper.concat(request, {
  //
  // Example of passing additional information to your handler. In this case
  // we are providing it with an additional browser property so your handler
  // could return browser specific bundles if you wish. Or add more information
  // for logging purposes. The sky is the limit. The only restriction is that
  // you cannot override our existing keys (version, name, bundle).
  //
  browser: userAgent(request.headers.useragent)
});
```

> NOTE: Be sure to send the correct `Vary` headers when the response is changed
> based on the additional data that is send with the request.

The function returns an object with the following properties:

- `source` The formatted bundle that matches our Service Workers expectations in
  terms of formatting and structure. This should be send back as response to the
  incoming HTTP request. (Do note that you're also responsible for setting the
  correct response headers such as `Content-Type: text/javascript`)
- `cache` This boolean indicates if there were any issues during the creation
  of the bundle. If nothing bad happened it's "safe" to cache the response as no
  bundles are missing or created a faulty response.
- `issues` An array of problems that happened during the compilation process.
  Note that we always generate a `source` response that can be send to the
  HTTP request (as your code _might_ still function without it so it's better to
  send something than nothing). When problems happened this array will contain
  the `Error` objects and `cache` key will be set to `false`.

```js
const { source, cache, issues } = await payper.concat(request);

console.log(source);
```

#### intercept

This is a combination of both methods, but writes the response. This is only
meant for **development** purposes as this function is **not optimised for
production**. It simply writes the `response` from the [concat](#concat) method
and sets a `200` statusCode, but it's a great way to just get started. The
method accepts the incoming HTTP request and out outgoing HTTP response as
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

## Edge

The Payper Server was designed to be as lightweight and flexible as possible.
This allows it to be used in various of Lambda, EdgeWorkers, Cloud functions
<insert more serverless buzzword> environments as well.

The following examples will provides some insight in how easy it could be to
run this service on the Edge to further improve the response times to your
users.

Note that we're only demonstrating the handler/worker implementations here.
Most of these examples require addition routing to be setup as part of
the HTTP handling. We're making the assumption that these workers are assigned
to handle the `/payper/*` routes.

### AWS Lambda

```js
const { S3 } = require('@aws-sdk/client-s3');
const Payper = require('payper/server');

const payper = new Payper({ options });
const client = new S3({...});

//
// Read the bundles from a S3 bucket so we return the contents.
//
payper.add(async function({ name, version }) {
  const content = await client.getObject({
    Bucket: 'MyBucketFullOfBundles',
    Key: `${name}-${version}.js`
  }));

  return content.Body.toString();
});

exports.handler = async function handler({ path }) {
  return {
    statusCode: 200
    body: await payper.concat(path)
  }
}
```

### Akamai EdgeWorkers

```js
const { createResponse } = require('create-response');
const { EdgeKV } = require('./edgekv.js');
const Payper = require('payper/server');

const payper = new Payper({ options });
const edgeKv = new EdgeKV({
  namespace: 'default',
  group: 'bundles'
});

//
// Use the EdgeKV offering to retrieve the stored bundles.
//
payper.add(async function({ name, version }) {
  const content = await edgeKv.getText({ item: `${name}-${version}` });

  return content;
});

export async function responseProvider(request) {
  const bundles = await payper.concat(request.path);

  return return Promise.resolve(createResponse(200, {
    'Content-Type': ['text/javascript']
  }, bundles));
};
```

[install]: https://github.com/3rd-Eden/payper#installation
[sandbox]: https://github.com/3rd-Eden/payper/tree/main/sandbox
[worker]: https://github.com/3rd-Eden/payper/tree/main/worker
[missing]: https://github.com/3rd-Eden/payper#missing
[missing]: https://github.com/3rd-Eden/payper#failure
