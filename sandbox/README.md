# Payper Sandbox

This is the sandbox/example application where the different integration
strategies and confirm that all our "submodules" such as the [api] and [worker]
are working closely together.

## Installation

This application is not part of the main bundle and it's dependencies need to be
separately installed before the application can be started:

```sh
npm install .
```

## Starting the applications

```sh
npm start
```

**HECK!** It's asking me for a password. That is correct, our sandbox uses the
[devcert] module to generate the ssl certificates so we can access our sandbox
on a local secure domain, `https://payper.test`, to simulate real environment.

## Examples

The following examples are hosted in this application:

#### Service Workers

- [workbox](./sw/workbox.js) Integration of our [Payper Worker][worker] into
  Google's Workbox project. This worker is registered as active ServiceWorker
  in our Express framework integration.
- [basic worker](./sw/worker.js) Minimum required [Payper Worker][worker]
  integration. This is the default ServiceWorker we use in our framework
  examples with the notable exception of Express as mentioned above.
- [webpack configuration](./sw/webpack.config.js) The [WebPack] configuration
  to build both these examples.

#### Bundle generation

- [shared-library](./shared-library/webpack.config.js) Uses [WebPack] to export
  a pre-determined set of dependencies as separate bundles so they be shared
  between multiple pages, applications etc. Applications, pages can then use
  the [externals] feature of WebPack to prevent bundling of these modules.
- [shared-library/externals](./shared-library/externals) The WebPack externals
  that can be consumed by other applications to prevent bundling of our
  external dependencies.

[api]: https://github.com/3rd-Eden/payper/tree/main/api
[worker]: https://github.com/3rd-Eden/payper/tree/main/worker
[devcert]: https://www.npmjs.com/package/devcert
[externals]: https://webpack.js.org/configuration/externals/
[webPack]: https://webpack.js.org/
