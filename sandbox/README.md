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

[api]: https://github.com/3rd-Eden/payper/tree/main/api
[worker]: https://github.com/3rd-Eden/payper/tree/main/worker
[devcert]: https://www.npmjs.com/package/devcert
