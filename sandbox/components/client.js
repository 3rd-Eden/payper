const ServiceWorker = require('./service-worker');
const ReactDOM = require('react-dom');
const React = require('react');

function Client() {
  return (
    <ServiceWorker />
  );
}

//
// As this code is loaded through payper we can basically be guaranteed that
// we can mount during the execution of this file.
//
const target = document.getElementById('mount');
ReactDOM.render(<Client />, target);
