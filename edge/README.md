# Payper Edge

The Payper Edge is an extension of our [Payper Server][server] that has been
optimized to run as Lambda's, Cloud Functions, CloudFlare Workers, Serverless
function etc. We will reference the [server]'s document where needed.

### AWS Lambda

```js
const { S3 } = require('@aws-sdk/client-s3');
const Payper = require('payper/edge');

const payper = new Payper({ options });
const client = new S3({...});

payper.add(async function({ name, version }) {
  const contents = await client.getObject({
    Bucket: 'MyBucketFullOfBundles',
    Key: `${name}-${version}.js`
  }));

  return contents.Body.toString();
});

exports.handler = async function handler({ path }) {
  return {
    statusCode: 200
    body: await payper.conat(path)
  }
}
```

[server]: https://github.com/3rd-Eden/payper/tree/main/server
[worker]: https://github.com/3rd-Eden/payper/tree/main/worker
