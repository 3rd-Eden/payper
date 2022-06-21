# Payper Presets

While Payper's primary usecase is to respond with bundles to incoming requests.
those bundles are not limited to just your JavaScript bundles. There are more
resources on the page that are effectively bundles. With the `payper/presets` we
try leverage Payper for different asset types.

The following presets are available:

- `payper/preset/js` Wraps the response in a IIFE that adds the contents to the cache.
- `payper/preset/css` Custom `@media all, (_identifier_)` rule to easily detect our wrapper.
- `payper/preset/svg` Wraps the response in an `<svg>` tag.

> NOTE: The `payper/preset/js` is the default preset that is used by the server.
> You don't need to supply this when creating your Server instance.

These presets can be used as `preset` option for the [`payper/server`][server]:

```js
const CSS = require('payper/preset/css');
const Payper = require('payper/server');

//
// Supply the preset to the client.
//
const payper = new Payper({ preset: CSS });
```

## Creating your own custom presets

The presets is nothing more than object that provides us with the information
how to format the contents in our bundle.

- `prefix`, **string**, Content to prefix the bundle with, e.g. `(function (){`.
- `suffix`, **string**, Content to suffix the bundle with, e.g. `});`.
- `start`, **string**, The start of a multi-line comment block. E.g. `/*`.
- `end`, **string**, The end of a multi-line comment block. E.g. `*/`.

[server]: https://github.com/3rd-Eden/payper/tree/main/server
