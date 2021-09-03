const Button = require('./button');
const React = require('react');
const Card = require('./card');

/**
 * Unregister the ServiceWorker.
 *
 * @param {Event} e Browser event.
 * @returns {Void} Nothing
 * @private
 */
function nukeWorker(e) {
  if (e) e.preventDefault();

  navigator.serviceWorker.getRegistrations().then(function nuke(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

/**
 * Delete all items in the cache.
 *
 * @param {Event} e Browser event.
 * @returns {Void} Nothing
 * @private
 */
function nukeCache(e) {
  if (e) e.preventDefault();

  caches.keys().then(function cacheList(list) {
    return Promise.all(list.map(function nuke(key) {
      return caches.delete(key);
    }));
  });
}

function nukeBundle(name, e) {
  if (e) e.preventDefault();

  caches.open('payper@text/javascript@0.0.0').then(function active(cache) {
    cache.delete('/payper/' + name);
  });
}

/**
 * Displays the current state of our service worker.
 *
 * @constructor
 */
function ServiceWorker(props) {
  const footer = (
    <div className="btn-group btn-group-block">
      <Button onClick={ nukeCache } primary>
        Delete all cached items
      </Button>
      <Button onClick={ nukeWorker }>
        Shudown ServiceWorker
      </Button>
    </div>
  );

  if (!props.requested) return <Card
    title="Payper ServiceWorker"
    subtitle="Status: Inactive"
    body={
      !navigator.serviceWorker.controller
      ? "ServiceWorker was not loaded when the bundle was fetched"
      : "Loaded Cross-Origin URL, cannot display data. Check Web Inspector manually."
    }
    footer={ footer }
  />

  return (
    <Card
      title="Payper ServiceWorker"
      subtitle="Status: active"
      body={
        <dl>
          <dt>Cached:</dt>
          <dd>
            {
              props.cached.split(',').map((name) =>
                name === "none" ? name : <span className="chip" key={ name }>
                  { name }
                  <a href="#" onClick={ (e) => nukeBundle(name, e) } className="btn btn-clear" aria-label="Close" role="button"></a>
                </span>
              )
            }
          </dd>

          <dt>Fetched:</dt>
          <dd>{ props.fetched }</dd>

          <dt>Requested</dt>
          <dd>{ props.requested }</dd>
        </dl>
      }
      footer={ footer }
    />
  );
}

/**
 * Our default props is the parsed result of the Server-Timing header that
 * our Payper Worker response writes to the request it responded with that
 * tells us how the response was constructed.
 *
 * @type {Object}
 */
ServiceWorker.defaultProps = {
  ...performance.getEntries('resource').filter(function filter(entry) {
    return entry.serverTiming && entry.serverTiming.length;
  }).reduce(function reduce(timings, { serverTiming }) {
    return timings.concat(serverTiming)
  }, []).reduce(function reduce(memo, serverTiming) {
    memo[serverTiming.name] = serverTiming.description;
    return memo;
  }, {})
};

module.exports = ServiceWorker;
