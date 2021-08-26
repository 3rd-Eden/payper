# Payper

Payper is a bundle loading strategy that is designed to promote re-use of
smaller bundles across pages. It tries to solve the problem where you want to
bundle only the code that is used on the page (pay for what you use) but still
leverage the previously cached code without having to re-bundle it.

Payper provides a HTTP API that will automatically concatenate multiple bundles
into a single HTTP request. This HTTP request is then intercepted by our Service
Worker which caches the each of the concatenated bundles separately. When a new
HTTP request is made it removes all previously cached bundles from the HTTP
request so only new bundles are requested at the HTTP API and then stitches the
newly requested bundles, and the previously cached bundles together and creates
the full HTTP response.

This project is not a replacement of your bundling tool chain, it merely
optimizes the delivery of bundles. You simply add your bundles to the system and
that's it.

## Installation

The module is available in the public npm registry and can be installed by
running:

```sh
npm install --save payper
```

This single module provides access to both client and server libraries:

- [`payper/server`](./server/README.md) Server-side API that concatenates multiple
  bundles together into a single request.
- [`payper/worker`](./worker/README.md) Service Worker which implements our
  progressive enhanced bundle splitting and caching strategy.

In addition to those projects we also host:

- [Development Sandbox](./sandbox/README.md) Our sandbox application which runs
  various frameworks which showcases different integration patterns.
- [Edge/Lambda/Cloud functions](./edge/README.md) Integration for Lambda, Edge,
  serverless buzzword (development in-progress).

## How does Payper optimize bundle loading

#### Backstory
With the introduction of HTTP/2 came resource multiplexing, it was supposed to
change the way we transfer assets to our users. We hoped that it allowed us to
step away from bundling and serve our files directly as this would mean that
a single file change wouldn't invalidate the whole bundle, but just meant that
a single file would be loaded again. There is still a lot of overhead involved
with just serving plain files, and bundling is still considered the more
performant option.

#### Unopinionated about your bundling process
We want to focus specifically on the delivery aspect of your bundles.

[based-on]: https://github.com/3rd-Eden/Spry-Configurator
