# Payper Worker

Payper leverages ServiceWorker's to intercept and progressively enhance our
Payper API requests by removing the previously cached bundles from the request
and forwarding only the bundles to the API that have yet to be cached.

Given that we want install and activate our ServiceWorker as quickly as
possible so it can intercept our requests it's advised to call the ServiceWorker
installation script as early as possible on your page. And you want to delay
your bundle request as much as possible so the request can be cached.

## Registering your first ServiceWorker

If this is your first time using ServiceWorker I would highly recommend reading
the [ServiceWorker Primer][primer] before continuing so you understand some of
the concepts we're discussing in this documentation. First up, we want to
include the call to our ServiceWorker on all of our pages to ensure it's
installed, running and able to optimize our requests. This can be done by adding
the following snippet as early as possible to your page:

```html
<script>
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
</script>
```

> **NOTE:** We assume that the code explained in the [Usage](#usage) section is
> included in the above requested `sw.js` file as this activates our
> ServiceWorker.

The reason we want to load this script as early as possible is because we want
to intercept and cache the responses of our the API requests for future page
visits. We're not loading anything during the `activateion` and `install` events
of the ServiceWorker so we're not blocking any additional resources from
loading.

## Usage

Now that all your pages have the snipped included we can setup our `sw.js` file.
The ServiceWorker is bundled with `payper` module that you [previously
installed][install]. The ServiceWorker is available under the `payper/worker`
import route as illustrated below.

```js
const Payper = require('payper/worker');
```

Once you've imported the ServiceWorker logic you can create a new `Payper`
instance.

```js
const payper = new Payper({ version, ttl, path });
```

The instance accepts an `Object` with the following properties for when you want
to customize the inner workings of the worker.

- `ttl` Time in milliseconds that indicates how long cached stale bundles should
  be kept in our caches. This is the time since the item was last used.
- `version` The version number of the cache we want to use. This allows you to
  use a completely fresh cache instance where no bundles are previously cached.
  Only use this if you want to have full control over the cache behaviour. When
  left untouched we'll automatically increase version numbers internally when
  breaking changes are introduced in the module.
- `path` Name of the path that your [Payper Server][server] is registered on.
  Defaults to `payper`, so it intercepts requests from `/payper/` based paths.
- `type` The Content-Type of the bundles that we're handling.
  Defaults to `text/javascript`.

Now that you've created a new instance all you have to call is the
`payper#register` method and it will automatically assign all the required event
listeners and work it's magic. So the completed code can be as simple as:

```js
const Payper = require('payper/worker');
const payper = new Payper();

//
// The register method will assign all required event listeners it can
// start intercepting the requests.
//
payper.register();
```

Compile this to the `sw.js` file and you're ready go.

### How do I know if my request was handled by the ServiceWorker

The Network panel in the browsers Web Inspector gives detailed information
about the requests that are made by your application. When a request is answered
by a ServiceWorker it's size will state `(ServiceWorker)` instead of the
actual file size. In addition to that, any request that is made **within** the
ServiceWorker will have a gear (⚙️) icon in front of it.

We introduce `Server-Timing` headers to the request when it's handled by the
Payper ServiceWorker to give you some more detailed information on how the
response was constructed. By clicking on the request in the Network panel you
can inspect there headers. The following information is added:

- `requested` List of the bundles that have been requested in the browser.
- `fetched` List of bundles that are not available in our cache and were
  requested (as a single HTTP request) from the Payper Server.
- `cached` List of bundles that were read from the ServiceWorker cache
  layer.

The description (`desc`) field is used to list which bundles were part of that
specific metric. The duration (`dur`) field is used to indicate how long these
resources took to load.

```
Server-Timing: requested;desc="eventemitter3@4.0.7,url-parse@1.5.3,react@17.0.2,react-dom@17.0.2";dur=0,fetched;desc="none";dur=0,cached;desc="eventemitter3@4.0.7,url-parse@1.5.3,react@17.0.2,react-dom@17.0.2";dur=6
```

The reason for why we're using the `Server-Timing` header and not custom
headers is because the Server Timing information is made available to web
apps using the `performance` interface:

```js
const entries = performance
  .getEntries('resource')           // Fetch all resource requests.
  .filter(function filter(entry) {  // Limit results to serverTiming responses.
    return entry.serverTiming && entry.serverTiming.length;
  });

console.log(entries[0].serverTiming);
```

Outputs the following information:

```js
[
  { name: "requested", duration: 0, description: "eventemitter3@4.0.7,url-parse@1.5.3,react@17.0.2,react-dom@17.0.2" },
  { name: "fetched", duration: 0, description: "none" },
  { name: "cached", duration: 6, description: "eventemitter3@4.0.7,url-parse@1.5.3,react@17.0.2,react-dom@17.0.2" }
]
```

Visit the MDN [`Server-Timing`][timing] page if you want to learn more
about this header.

### Interacting with the ServiceWorker from your page

Payper Worker listens to the `message` event to allow communication between
client (web app) and worker (active service worker) using the `postMessage` API.

When a `message` event listener is called by your web app, the `event.data`
property should have the following format:

```js
{
  //
  // The events are **always** prefixed with `payper:` as indication that these
  // messages should be handled by the Payper Worker.
  //
  type: 'payper:event-type-here',

  //
  // The payload that the event type expects, strings, objects, we impose no
  // limitations.
  //
  payload: 'contents'
}
```

The following event `type`'s are recognised by the Payper Worker:

#### `payper:paste`

The `payper:paste` allows the ServiceWorker to cache responses that might not
have been intercepted. Our use-case for this is to cache the response when our
`/payer/**` bundles are requested by a web app but our ServiceWorker has not
been installed yet. This allows us to eliminate a potential uncached response on
the next request.

The `payper:paste` event expects the `payload` property to be a `string` that
contains the contents of the bundle.

```js
navigator.serviceWorker.ready.then(function ready(sw) {
  sw.active.postMessage({
    type: 'payper:paste',
    payload: __PAYPER_IFFE_BUNDLE_WRAPPER__.toString()
  });
});
```

> NOTE: The snippet above is already included in every bundle that is requested
> when the ServiceWorker isn't active yet. This neat little trick allows us to
> cache responses without having to re-request a bundle.

### Integrating into an existing ServiceWorker setup

Integrating with an existing ServiceWorker requires a few more steps than just
simply calling the `Payper#register` method as this assigns the various
listeners to the ServiceWorker so it might make more sense to just use
your pre-existing listeners and work together with your code.

To make this work we'll be using the following API methods:

- [matches](#matches)
- [concat](#concat)
- [register](#register)
- [fetch](#fetch)
- [message](#message)
- [activate](#activate)
- [install](#install)

#### matches

The matches method checks if the given request needs to be handled by the Payper
system. It accepts an `Request` instance or an object with a `url` and `method`
as properties. It returns a boolean indicating if Payper should handle the
request or not

```js
payper.matches(request); // returns true or false.
```

#### concat

It accepts the `event` (FetchEvent) as first argument. The `concat` method is an
**asynchronous** function and should be called with `await` or processed as
Promise.

The function returns a `Response` with the contents of the request. The contents
can be a fresh HTTP response in the case an fully uncached request, a fully
cached result, or a combination of both.

```js
const response = await payper.concat(event);
```

#### register

Our ServiceWorker only works when it's listening to specific ServiceWorker
events. This method registers those listeners so we can start intercepting
the events. The following listeners can be added:

- `fetch`: Intercept the requests.
- `activate`: Clean our caches.
- `install`: Speeds up activation of our ServiceWorker.
- `message`: Listens to postMessage to cache executed bundles.

The method accepts an array of events as argument, when no listeners are
provided as argument, we will assign all of our required listeners.

```js
payper.register();
payper.register(['activate', 'install']);
```

#### fetch

The `fetch` method is designed to handle the incoming `fetch` event for
payper. It responds with the result of [concat](#concat) when the request
[matches](#matches). The `fetch` method is an **asynchronous** function and
should be called with `await` or processed as promise. The function expects the
`event` of the `fetch` event as first argument and returns a `boolean` as
indication if the message was directed, and handled by Payper.

```js
self.addEventListener('fetch', async function handleFetch(event) {
  const intercepted = await payper.fetch(event);
  if (intercepted) return;

  // Your logic here.
});
```

Alternatively, you can also use the [`payper#register`](#register) method to
automatically assign this event:

```js
payper.register(['message']);
```

#### message

The `message` method is designed to handle the incoming `message` event for
Payper. It powers our browser api and is required for instantly caching the
bundle response on the first page when ServiceWorkers are not yet installed.
the `message` method is an **asynchronous** function and should be called with
`await` or processed as promise. The function expects the `event` of the
`message` event as first argument and returns a `boolean` as indication if the
message was directed, and handled by Payper.

```js
self.addEventListener('message', async function message(event) {
  const intercepted = await payper.message(event);
  if (intercepted) return;

  // Your logic here.
});
```

Alternatively, you can also use the [`payper#register`](#register) method to
automatically assign this event:

```js
payper.register(['message']);
```

#### activate

The `activate` method is designed to handle the incoming `activate` event for
Payper. It will claim the client (`clients.claim()`), automatically clean
and invalidate stale cache. The `message` method is an **asynchronous** function
and should be called with `await` or processed as Promise.

```js
self.addEventListener('activate', async function activate() {
  await payper.activate();

  // Your logic here.
});
```

> NOTE: Do not pass this function into the `event.waitUntil` method you want
> the ServiceWorker to respond to requests as fast as possible.

Alternatively, you can also use the [`payper#register`](#register) method to
automatically assign this event:

```js
payper.register(['activate']);
```

#### install

The `install` method is designed to handle the incoming `install` event for
Payper. It's sole purpose is to call the `skipWaiting` method so the
ServiceWorker can be activated when it's installed.

```js
self.addEventListener('install', function install() {
  // Your logic here.
  //
  payper.install();
});
```

Alternatively, you can also use the [`payper#register`](#register) method to
automatically assign this event:

```js
payper.register(['install']);
```

#### Using PayperWorker inside Workbox

Workbox is set of libraries that helps writing ServiceWorkers. The following
example below illustrates how the Payper worker integrates with Workbox's
routing system to intercept specific request.

```js
import { registerRoute } from 'workbox-routing';
import Payper from 'payper/worker';

const payper = new Payper();

registerRoute(
  function matcher({ url, request, event }) {
    return payper.matches(request);
  },
  async function handler({ event }) {
    return await payper.concat(event);
  }
);

//
// The `registerRoute` method takes care of the request handling so we do not
// need to install our `fetch` handler, but we do want to use the rest of our
// listeners in the ServiceWorker.
//
payper.register(['install', 'activate', 'message']);
```
[workbox]: https://developers.google.com/web/tools/workbox
[primer]: https://developers.google.com/web/fundamentals/primers/service-workers
[install]: https://github.com/3rd-Eden/payper#installation
[server]: https://github.com/3rd-Eden/payper/tree/main/server
[timing]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing
