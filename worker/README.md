# Payper Worker

Payper leverages Service Workers to intercept and progressively enhance our
Payper API requests by removing the previously cached bundles from the request
and forwarding only the bundles to the API that have yet to be cached.

Given that we want install and activate our Service Worker as quickly as
possible so it can intercept our requests it's advised to call the Service
Worker installation script as early as possible on your page. And you want to
delay your bundle request as much as possible so the request can be cached.

## Registering your first Service Worker

If this is your first time using Service Worker I would highly recommend reading
the [Service Worker Primer][primer] before continuing so you understand some of
the concepts we're discussing in this documentation. First up, we want to
include the call to our Service Worker on all of our pages to ensure it's
installed, running and able to optimize our requests. This can be done by adding
the following snippet as early as possible to your page:

```html
<script>
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
</script>
```

> **NOTE:** We assume that the code explained in the [Usage](#usage) section is
> included in the above requested `sw.js` file as this activates our Service
> Worker.

The reason we want to load this script as early as possible is because we want
to intercept and cache the responses of our the API requests for future page
visits. We're not loading anything during the `activateion` and `install` events
of the Service Worker so we're not blocking any additional resources from
loading.

## Usage

Now that all your pages have the snipped included we can setup our `sw.js` file.
The Service Worker is bundled with `payper` module that you [previously
installed][install]. The Service Worker is available under the `payper/worker`
import route as illustrated below.

```js
const Payper = require('payper/worker');
```

Once you've imported the Service Worker logic you can create a new `Payper`
instance.

```js
const payper = new Payper({ version, ttl });
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

Now that you've created a new instance all you have to call is the
`payper#register` method and it will automatically assign all the required event
listeners and work it's magic. So the completed code can be as simple as:

```js
const Payper = require('payper/worker');
const payper = new Payper();

payper.register();
```

Compile this to the `sw.js` file and you're ready go.

### How do I know if my request was handled by the Service Worker

The Network panel in the browsers Web Inspector gives detailed information
about the requests that are made by your application. When a request is answered
by a Service Worker it's size will state `(ServiceWorker)` instead of the
actual file size. In addition to that, any request that is made **within** the
ServiceWorker will have a gear (⚙️) icon in front of it.

We introduce additional headers to the request when it's handled by the Payper
ServiceWorker to give you some more detailed information on how the response
was constructed. By clicking on the request in the Network panel you can inspect
there headers. The following headers are added:

- `payper-requested` List of the bundles that have been requested in the browser.
- `payper-fetched` List of bundles that are not available in our cache and were
  requested (as a single HTTP request) from the Payper Server.
- `payper-cached` List of bundles that were read from the ServiceWorker cache
  layer.

All of the header values are either comma separated, or set to `none` when
no bundles were cached or requested as seen by the example below:

```
payper-cached: eventemitter3@4.0.7,url-parse@1.5.3,react@17.0.2,react-dom@17.0.2
payper-fetched: none
payper-requested: eventemitter3@4.0.7,url-parse@1.5.3,react@17.0.2,react-dom@17.0.2
```

### Interacting with the ServiceWorker from your page

Payper Worker listens to the `message` event so you can communicate with the
Worker using the `postMessage` API.

The following event types are currently supported:

####

```js
navigator.serviceWorker.ready.then(function ready(sw) {
  sw.active.postMessage({
    type: 'payper:paste',
    contents: 'file-contents-to-be-cached'
  });
});
```

### Integrating into an existing Service Worker setup

Integrating with an existing Service Worker requires a few more steps than just
simply calling the `Payper#register` method as this assigns the various
listeners to the Service Worker so it might make more sense to just use
your pre-existing listeners and work together with your code.

To make this work we'll be using the following API methods:

- [matches](#matches)
- [concat](#concat)
- [message](#message)

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

#### message

The `message` method is designed to handle the incoming `message` event for
Payper. It powers our browser API and is required for instantly caching the
bundle response on the first page when ServiceWorkers are not yet installed.
The `message` method is an **asynchronous** function and should be called with
`await` or processed as Promise. The function expects the `event` of the
`message` event as first argument and returns a `Boolean` as indication if the
message was directed, and handled by Payper.

```js
self.addEventListener('message', async function handler(event) {
  const intercepted = await payper.message(event);
  if (intercepted) return;

  // Your logic here.
});
```

### Workbox

Workbox is set of libraries that helps writing Service Workers. The following
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
```
[workbox]: https://developers.google.com/web/tools/workbox
[primer]: https://developers.google.com/web/fundamentals/primers/service-workers
[install]: https://github.com/3rd-Eden/payper#installation
