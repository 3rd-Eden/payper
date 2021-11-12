# Payper Utils

A collection of utilities that are shared between various Payper packages. Every
utility is it's own file to prevent bundling utilities that are not used by the
codebases.

This is an internal package and is not meant for public consumption. The
packages that do consume these API's often expose these methods on their
instances as well. E.g. `extract -> Payper#extract`.

The following utilities are available:

### extract

Extract the list of requested bundles from the URL structure. We assume that
every path after the `/payper/` route is an `@` separated bundle name and
version pair that a user wants to have to on their site.

Example URL's:

 - `/payper/foo@1.2.3/bar@1.3.9`
 - `/payper/vendor@adf8091/form@0ua7139a`

We do not care about the bundle names, or versioning scheme that our users
decided upon. It's merely there for identification purposes. Finally we highly
recommend that each bundle includes their own version, however it's not required
as it allows you to cache a bundle indefinitely.

The function accepts a single argument, `url`, which is the URL path that we
want to extract our data from:

```js
payper.extract('/payper/foo@bar/vendor@1.2.3');

// [
//   { name: 'foo', version: 'bar', bundle: 'foo@bar' },
//   { name: 'vendor', version: '1.2.3', bundle: 'vendor@1.2.3' }
// ]
```

### format

Reformats bundle that often originates from a multi-bundle request into a single
bundle URL so the resources are individually cacheable. Consistency is king when
it comes to naming so we're using a dedicated function to create our URL cache
structure for the sake of consistency.

The function accepts a `path` as first argument and `origin` as second argument.
When no origin is given it will default to the scope of the Service Worker so
only in that environment is the second argument expected to be optional.

```js
payper.format('foo@bar');                          // http://example.com/payper/foo@bar
payper.format('foo@bar', 'http://foo.com/hello');  // http://foo.com/payper/foo@bar
```

### matches

Check if the request we're intercepting is a request for the Payper API so we
know if we need to intercept the request.

It accepts a `Request` object first argument that has the `url` and `method`
props set.

```js
payper.matches({ url: '/payper/foo@bar', method: 'GET' });     // true
payper.matches({ url: '/payper/foo@bar', method: 'POST' });    // false
payper.matches({ url: '/something-else', method: 'GET' });     // false
```

### bundle

Generates the bundle identifier of a package name and version combination. This
provides consistent naming throughout the codebase.

It accepts 2 arguments:

- `name` Name of the bundle.
- `version` The version number of the bundle.

```js
payper.id('foo', '12.4.5');   // foo@12.4.5
```
