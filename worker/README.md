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
  Only use this if you want to have full control over the cache behavior. When
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

### Integrating into an existing Service Worker setup

Integrating with an existing Service Worker requires a few more steps than just
simply calling the `Payper#register` method as this assigns the various
eventlisteners to the Service Worker so it might make more sense to just use
your pre-existing listeners and work together with your code.

[primer]: https://developers.google.com/web/fundamentals/primers/service-workers
[install]: https://github.com/3rd-Eden/payper#installation
