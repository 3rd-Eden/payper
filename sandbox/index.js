require('@babel/register')({
  'presets': ['@babel/preset-react'],
  'only': [/sandbox[\\\/]components/]
});

const bootstrap = require('./bootstrap');
const express = require('./express');
const fastify = require('./fastify');

//
// Initialize the different frameworks we're running our examples on.
//
bootstrap(express, 3210);
bootstrap(fastify, 3211);
