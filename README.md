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

- [`payper/server`][server] Server-side API that concatenates multiple
  bundles together into a single request.
- [`payper/worker`][worker] Service Worker which implements our
  progressive enhanced bundle splitting and caching strategy.

In addition to those projects we also host:

- [Development Sandbox][sandbox] Our sandbox application which runs
  various frameworks which showcases different integration patterns.

## Use case

- **Cascading Cache Invalidation**

It only takes one code change to completely invalidate all your bundled code
forcing your users to re-download

- **Only download what you use**

- **Share bundles across multiple pages**

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

## Debugging

In the unfortunate event where errors do occur we provide references to our
documentation to help you debug, and resolve these issues. The following issue
topics are available:

- [missing](#missing) A requested bundle is not available.
- [failure](#failure) Failure to generate a bundle response.

#### missing

When you request a bundle from the Payper Server that doesn't exist, or isn't
registered using the [`Payper#bundle`][bundle] method the [server] will replace
the contents using with a 404 response that `console.error`'s which bundle is
missing and how it could be resolved.

The following conditions trigger a 404 response:

- The bundle `name` that was requested is not registered using the [bundle] method
  of the Payper Server (this includes a catch all handler).
- The bundle was registered but no content was returned when the assigned bundle
  handler was executed.

In order to address this take the following steps:

1. Verify that the bundle that you've requested is correctly spelled in the HTTP
   request to the server and that it's identical to name registered in the
   [server].
2. Verify that the requested bundle's exists and has content.
3. Every bundle request comes with a version that is requested with it, ensure
   that version exists for the bundle.

#### failure

In the unfortunate event of when an error is thrown during the [bundle] retrieval
process we will replace the contents with 500 response that `console.error`'s
which bundle caused the error and the message that was thrown in the process.
The contents of the message will be sanitized e.g. have private paths removed.

The following conditions trigger the 500 response.

- An error is thrown when the [bundle] handler was called.
- Generation of our [meta] comment failed.

The full error message, including the stack trace and the name/version pair of
the bundle that cause the 500 response have also been logged on the server. If
you do not have a `logger` configured on the server it will automatically be
written to `STDERR` using `console.error`.

[server]: ./serve/
[worker]: ./worker
[sandbox]: ./sandbox
[bundle]: ./server#adding-bundles-to-the-system
[based-on]: https://github.com/3rd-Eden/Spry-Configurator
[meta]: #meta-data
